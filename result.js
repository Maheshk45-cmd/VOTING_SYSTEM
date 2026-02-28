const express = require("express");
const app = express();
const db = require("./db");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
require("dotenv").config();
app.use(express.json());
// app.get("/Result", (req, res) => {
//     const { e_id, ep_id } = req.body;
//     if (!e_id || !ep_id) {
//         return res.status(500).json({ message: "Enter the election " });
//     }
//     const query=`SELECT `
// })
app.post("/admin/election/:e_id/declare-result", authenticateToken, (req, res) => {

    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin only action" });
    }

    const e_id = req.params.e_id;
    const admin_id = req.user.student_id;

    // 1️⃣ Check election phase
    db.query(
        `SELECT phase FROM ELECTION WHERE e_id=?`,
        [e_id],
        (err, phaseResult) => {

            if (err)
                return res.status(500).json({ message: "Database error" });

            if (phaseResult.length === 0)
                return res.status(404).json({ message: "Election not found" });

            if (phaseResult[0].phase !== "COUNTING") {
                return res.status(403).json({
                    message: "Election not in COUNTING phase"
                });
            }

            // 2️⃣ Get all positions of this election
            db.query(
                `SELECT ep_id FROM ELECTION_POSITION WHERE e_id=?`,
                [e_id],
                (err2, positions) => {

                    if (err2)
                        return res.status(500).json({ message: "Database error" });

                    if (positions.length === 0)
                        return res.status(400).json({ message: "No positions found" });

                    positions.forEach(position => {

                        const ep_id = position.ep_id;

                        // 3️⃣ Detect current round
                        db.query(
                            `SELECT MAX(round_no) AS last_round
                             FROM RESULT
                             WHERE election_id=? AND position_id=?`,
                            [e_id, ep_id],
                            (err3, roundResult) => {

                                const lastRound = roundResult[0].last_round;
                                const currentRound = lastRound ? lastRound + 1 : 1;

                                if (currentRound > 2) {
                                    console.log("Re-election limit reached for position:", ep_id);
                                    return;
                                }

                                // 4️⃣ Count votes
                                const voteQuery = `
                                    SELECT 
                                        n.nomination_id,
                                        COUNT(v.vote_id) AS total_votes
                                    FROM NOMINATION n
                                    LEFT JOIN VOTE v
                                        ON v.candidate_nomination_id = n.nomination_id
                                    WHERE n.position_id = ?
                                      AND n.status = 'ADMIN_APPROVED'
                                    GROUP BY n.nomination_id
                                    ORDER BY total_votes DESC
                                `;

                                db.query(voteQuery, [ep_id], (err4, voteResults) => {

                                    if (voteResults.length === 0)
                                        return;

                                    const maxVotes = voteResults[0].total_votes;

                                    const topCandidates = voteResults.filter(
                                        c => c.total_votes === maxVotes
                                    );

                                    if (topCandidates.length === 1) {

                                        // 🏆 Winner case
                                        db.query(
                                            `INSERT INTO RESULT
                                             (election_id, position_id, round_no,
                                              winner_nomination_id, total_votes,
                                              is_tie, declared_by)
                                             VALUES (?, ?, ?, ?, ?, FALSE, ?)`,
                                            [
                                                e_id,
                                                ep_id,
                                                currentRound,
                                                topCandidates[0].nomination_id,
                                                maxVotes,
                                                admin_id
                                            ]
                                        );

                                    } else {

                                        // ⚖ Tie case
                                        db.query(
                                            `INSERT INTO RESULT
                                             (election_id, position_id, round_no,
                                              winner_nomination_id, total_votes,
                                              is_tie, declared_by)
                                             VALUES (?, ?, ?, NULL, ?, TRUE, ?)`,
                                            [
                                                e_id,
                                                ep_id,
                                                currentRound,
                                                maxVotes,
                                                admin_id
                                            ]
                                        );

                                        // Mark position for re-election
                                        db.query(
                                            `UPDATE ELECTION_POSITION
                                             SET status='re_election_required'
                                             WHERE ep_id=?`,
                                            [ep_id]
                                        );
                                    }
                                });
                            }
                        );
                    });

                    // 5️⃣ Move election to RESULT phase
                    db.query(
                        `UPDATE ELECTION SET phase='RESULT' WHERE e_id=?`,
                        [e_id]
                    );

                    return res.json({
                        message: "Results declared successfully"
                    });
                }
            );
        }
    );
});