// // // const express = require("express");
// // // const app = express();
// // // const db = require("./db");
// // // app.use(express.json());
// // // const bcrypt = require("bcrypt");

// // // // direct call when election phase is counting

// // // // app.put("/count/:id/respond", (req, res) => {
// // // //     const e_id = req.params.id;
// // // //     if (!e_id) {
// // // //         return res.status(500).json({ message: "Enter the election id" });

// // // //     }

// // // //     const query_elect = `SELECT phase FROM ELECTION WHERE e_id=?`;
// // // //     db.query(query_elect, [e_id], (err, result) => {
// // // //         if (err) {
// // // //             return res.status(500).json({ message: "Database error" });
// // // //         }
// // // //         if (result.length === 0) {
// // // //             return res.status(401).json({ message: "Enter the correct election id" });
// // // //         }
// // // //         const phase = result.phase;
// // // //         if (phase !== "COUNTING") {
// // // //             return res.status(403).json({ message: "The counting phase is not active" });
// // // //         }
// // // //         const query_count = `SELECT ep_id FROM ELECTION_POSITION WHERE e_id=?`;
// // // //         db.query(query_count, [e_id], (err1, result1) => {
// // // //             if (err2) {
// // // //                 return res.status(500).json({ message: "Database Error" });
// // // //             }
// // // //             if (result1.length == 0) {
// // // //                 return res.status(403).json({ message: "No active election position" });
// // // //             }
// // // //             const ep_id
// // // //         });

// // // //     })

// // // // })
// // // app.put("/admin/election/:e_id/count", (req, res) => {

// // //     const e_id = req.params.e_id;

// // //     db.query(
// // //         `SELECT phase FROM ELECTION WHERE e_id=?`,
// // //         [e_id],
// // //         (err, result) => {

// // //             if (err) return res.status(500).json({ message: "DB error" });
// // //             if (result.length === 0)
// // //                 return res.status(404).json({ message: "Election not found" });

// // //             if (result[0].phase !== "COUNTING")
// // //                 return res.status(403).json({ message: "Not in COUNTING phase" });

// // //             db.query(
// // //                 `SELECT ep_id FROM ELECTION_POSITION WHERE e_id=?`,
// // //                 [e_id],
// // //                 (err2, positions) => {

// // //                     if (positions.length === 0)
// // //                         return res.status(400).json({ message: "No positions found" });

// // //                     let completed = 0;

// // //                     positions.forEach(position => {

// // //                         const ep_id = position.ep_id;

// // //                         // 1️⃣ Determine current round
// // //                         db.query(
// // //                             `SELECT MAX(round_no) AS last_round
// // //                              FROM RESULT
// // //                              WHERE election_id=? AND position_id=?`,
// // //                             [e_id, ep_id],
// // //                             (err3, roundResult) => {

// // //                                 const lastRound = roundResult[0].last_round;
// // //                                 const currentRound = lastRound ? lastRound + 1 : 1;

// // //                                 // Prevent infinite rounds
// // //                                 if (currentRound > 2) {
// // //                                     completed++;
// // //                                     return;
// // //                                 }

// // //                                 // 2️⃣ Count votes for current round only
// // //                                 const voteQuery = `
// // //                                     SELECT 
// // //                                         n.nomination_id,
// // //                                         s.dob,
// // //                                         s.student_name,
// // //                                         COUNT(v.vote_id) AS total_votes
// // //                                     FROM NOMINATION n
// // //                                     JOIN STUDENT s ON s.student_id = n.student_id
// // //                                     LEFT JOIN VOTE v 
// // //                                         ON v.candidate_nomination_id = n.nomination_id
// // //                                         AND v.round_no = ?
// // //                                     WHERE n.election_id=?
// // //                                       AND n.position_id=?
// // //                                       AND n.status='ADMIN_APPROVED'
// // //                                     GROUP BY n.nomination_id
// // //                                     ORDER BY total_votes DESC
// // //                                 `;

// // //                                 db.query(
// // //                                     voteQuery,
// // //                                     [currentRound, e_id, ep_id],
// // //                                     (err4, votes) => {

// // //                                         if (votes.length === 0) {
// // //                                             completed++;
// // //                                             return;
// // //                                         }

// // //                                         const maxVotes = votes[0].total_votes;

// // //                                         const topCandidates = votes.filter(
// // //                                             c => c.total_votes === maxVotes
// // //                                         );

// // //                                         // 🏆 CLEAR WINNER
// // //                                         if (topCandidates.length === 1) {

// // //                                             db.query(
// // //                                                 `INSERT INTO RESULT
// // //                                                  (election_id, position_id, round_no,
// // //                                                   winner_nomination_id, total_votes,
// // //                                                   is_tie)
// // //                                                  VALUES (?, ?, ?, ?, ?, FALSE)`,
// // //                                                 [
// // //                                                     e_id,
// // //                                                     ep_id,
// // //                                                     currentRound,
// // //                                                     topCandidates[0].nomination_id,
// // //                                                     maxVotes
// // //                                                 ]
// // //                                             );

// // //                                             db.query(
// // //                                                 `UPDATE ELECTION_POSITION
// // //                                                  SET status='completed'
// // //                                                  WHERE ep_id=?`,
// // //                                                 [ep_id]
// // //                                             );

// // //                                         } else {

// // //                                             // ⚖ ROUND 1 TIE → Re-election
// // //                                             if (currentRound === 1) {

// // //                                                 db.query(
// // //                                                     `INSERT INTO RESULT
// // //                                                      (election_id, position_id, round_no,
// // //                                                       winner_nomination_id, total_votes,
// // //                                                       is_tie)
// // //                                                      VALUES (?, ?, 1, NULL, ?, TRUE)`,
// // //                                                     [e_id, ep_id, maxVotes]
// // //                                                 );

// // //                                                 db.query(
// // //                                                     topCandidates ForEach(candidate => {
// // //                                                         db.query('INSERT INTO RE_ELECTION_CANDIDATES   (position_id,election_id,nomination_id,round_no)
// // //                                                             VALUES[?,?,?, 2]
// // //                                                         ',[candidate.ep_id,candidate.e_id]
// // //                                                     });
// // //                                                 `UPDATE ELECTION_POSITION
// // //                                                      SET status='re_election_required'
// // //                                                      WHERE ep_id=?`,
// // //                                                     [ep_id]
// // //                                                 );

// // //                             }
// // //                                             // ⚖ ROUND 2 TIE → Deterministic rule
// // //                                             else {

// // //                                 // Sort by:
// // //                                 // 1. Older age (dob ASC)
// // //                                 // 2. Lexicographically smaller name

// // //                                 topCandidates.sort((a, b) => {
// // //                                     if (a.dob < b.dob) return -1;
// // //                                     if (a.dob > b.dob) return 1;
// // //                                     return a.student_name.localeCompare(b.student_name);
// // //                                 });

// // //                                 const finalWinner = topCandidates[0];

// // //                                 db.query(
// // //                                     `INSERT INTO RESULT
// // //                                                      (election_id, position_id, round_no,
// // //                                                       winner_nomination_id, total_votes,
// // //                                                       is_tie)
// // //                                                      VALUES (?, ?, 2, ?, ?, FALSE)`,
// // //                                     [
// // //                                         e_id,
// // //                                         ep_id,
// // //                                         finalWinner.nomination_id,
// // //                                         maxVotes
// // //                                     ]
// // //                                 );

// // //                                 db.query(
// // //                                     `UPDATE ELECTION_POSITION
// // //                                                      SET status='completed'
// // //                                                      WHERE ep_id=?`,
// // //                                     [ep_id]
// // //                                 );
// // //                             }
// // //                                         }

// // //                                         completed++;

// // //                     if (completed === positions.length) {

// // //                         db.query(
// // //                             `UPDATE ELECTION
// // //                                                  SET phase='RESULT'
// // //                                                  WHERE e_id=?`,
// // //                             [e_id]
// // //                         );

// // //                         return res.json({
// // //                             message: "Counting completed successfully"
// // //                         });
// // //                     }
// // //                 }
// // //             );
// // //         }
// // //     );
// // // });
// // //                 }
// // //             );
// // //         }
// // //     );
// // // });
// // // // const express = require("express");
// // // // const app = express();
// // // // app.use(express.json());
// // // // const db = require("./db");
// // // // require("dotenv").configuration;

// // // // app.put("/counting/:id/respond", (req, res) => {
// // // //     const e_id = req.params.id;
// // // //     if (!e_id) {
// // // //         return res.status(403).json({ message: "Election Id required" });
// // // //     }
// // // //     db.query(`SELECT phase FROM ELECTION WHERE e_id=?`, [e_id], (err, result) => {
// // // //         if (err) {
// // // //             return res.status(500).json({ message: "Database Error" });
// // // //         }
// // // //         if (result.length === 0) {
// // // //             return res.status(403).json({ message: "Invalid Election Id" });
// // // //         }
// // // //         if (result[0].phase !== "COUNTING") {
// // // //             return res.status(401).json({ message: "COUNTING Phase is Not Activated" });
// // // //         }
// // // //         // for position
// // // //         db.query(`SELECT ep_id FROM ELECTION_POSITION WHERE e_id=?`, [e_id], (err2, positionresult) => {
// // // //             if (positionresult.length === 0) {
// // // //                 return res.status(403).json({ message: "Position Not Available" });
// // // //             }
// // // //             let completed = 0;
// // // //             positionresult.forEach(position => {
// // // //                 const ep_id = position.ep_id;
// // // //                 db.query(`SELECT MAX(round_no) AS last_round
// // // //                     FROM RESULT WHERE position_id=? AND election_id=?`, [ep_id, e_id], (err3, roundresult) => {
// // // //                     // if(roundresult.length===0){
// // // //                     //     return 
// // // //                     // }
// // // //                     const last_round = roundresult[0].last_round;
// // // //                     const currentround = last_round ? last_round + 1 : 1;
// // // //                     if (currentround > 2) {
// // // //                         completed++;
// // // //                         return res.status(409).json({ message: "Too much round number" });
// // // //                     }
// // // //                     // first time
// // // //                     if (currentround === 1) {
// // // //                         // now count the votes
// // // //                     }
// // // //                 })
// // // //             })
// // // //         })
// // // //     })
// // // // })
// // const express = require("express");
// // const app = express();
// // const db = require("./db");

// // app.use(express.json());

// // app.put("/admin/election/:e_id/count", (req, res) => {

// //     const e_id = req.params.e_id;

// //     // 1️⃣ Check election phase
// //     db.query(
// //         "SELECT phase FROM ELECTION WHERE e_id=?",
// //         [e_id],
// //         (err, election) => {

// //             if (err) return res.status(500).json({ message: "DB Error" });
// //             if (election.length === 0)
// //                 return res.status(404).json({ message: "Election not found" });

// //             if (election[0].phase !== "COUNTING")
// //                 return res.status(403).json({ message: "Not in COUNTING phase" });

// //             // 2️⃣ Get positions
// //             db.query(
// //                 "SELECT ep_id FROM ELECTION_POSITION WHERE e_id=?",
// //                 [e_id],
// //                 (err2, positions) => {

// //                     if (positions.length === 0)
// //                         return res.status(400).json({ message: "No positions" });

// //                     let done = 0;

// //                     positions.forEach(position => {

// //                         const ep_id = position.ep_id;

// //                         // 3️⃣ Get last round
// //                         db.query(
// //                             `SELECT MAX(round_no) AS last_round
// //                              FROM RESULT
// //                              WHERE election_id=? AND position_id=?`,
// //                             [e_id, ep_id],
// //                             (err3, roundData) => {

// //                                 const lastRound = roundData[0].last_round || 0;
// //                                 const currentRound = lastRound + 1;

// //                                 if (currentRound > 2) {
// //                                     done++;
// //                                     if (done === positions.length) finish();
// //                                     return;
// //                                 }

// //                                 // 4️⃣ Count votes
// //                                 db.query(
// //                                     `SELECT n.nomination_id,
// //                                             COUNT(v.vote_id) AS total_votes
// //                                      FROM NOMINATION n
// //                                      LEFT JOIN VOTE v
// //                                        ON v.candidate_nomination_id = n.nomination_id
// //                                        AND v.round_no=?
// //                                      WHERE n.election_id=?
// //                                        AND n.position_id=?
// //                                        AND n.status='ADMIN_APPROVED'
// //                                      GROUP BY n.nomination_id
// //                                      ORDER BY total_votes DESC`,
// //                                     [currentRound, e_id, ep_id],
// //                                     (err4, votes) => {

// //                                         if (votes.length === 0) {
// //                                             done++;
// //                                             if (done === positions.length) finish();
// //                                             return;
// //                                         }

// //                                         const maxVotes = votes[0].total_votes;
// //                                         const top = votes.filter(v => v.total_votes === maxVotes);

// //                                         // 🏆 Winner
// //                                         if (top.length === 1) {

// //                                             db.query(
// //                                                 `INSERT INTO RESULT
// //                                                  (election_id, position_id, round_no,
// //                                                   winner_nomination_id, total_votes, is_tie)
// //                                                  VALUES (?, ?, ?, ?, ?, 0)`,
// //                                                 [
// //                                                     e_id,
// //                                                     ep_id,
// //                                                     currentRound,
// //                                                     top[0].nomination_id,
// //                                                     maxVotes
// //                                                 ]
// //                                             );
// //                                         }

// //                                         // ⚖ Tie
// //                                         else {

// //                                             db.query(
// //                                                 `INSERT INTO RESULT
// //                                                  (election_id, position_id, round_no,
// //                                                   winner_nomination_id, total_votes, is_tie)
// //                                                  VALUES (?, ?, ?, NULL, ?, 1)`,
// //                                                 [
// //                                                     e_id,
// //                                                     ep_id,
// //                                                     currentRound,
// //                                                     maxVotes
// //                                                 ]
// //                                             );

// //                                             // Only insert re-election candidates in round 1
// //                                             if (currentRound === 1) {
// //                                                 top.forEach(candidate => {
// //                                                     db.query(
// //                                                         `INSERT INTO RE_ELECTION_CANDIDATES
// //                                                          (position_id, election_id, nomination_id, round_no)
// //                                                          VALUES (?, ?, ?, 2)`,
// //                                                         [ep_id, e_id, candidate.nomination_id]
// //                                                     );
// //                                                 });
// //                                             }
// //                                         }

// //                                         done++;
// //                                         if (done === positions.length) finish();
// //                                     }
// //                                 );
// //                             }
// //                         );
// //                     });

// //                     function finish() {
// //                         db.query(
// //                             "UPDATE ELECTION SET phase='RESULT' WHERE e_id=?",
// //                             [e_id]
// //                         );

// //                         res.json({ message: "Counting completed" });
// //                     }
// //                 }
// //             );
// //         }
// //     );
// // });
// const express = require("express");
// const app = express();
// const db = require("./db");

// app.use(express.json());

// app.put("/admin/election/:e_id/count", (req, res) => {

//     const e_id = req.params.e_id;

//     // 1️⃣ Check election phase
//     db.query(
//         "SELECT phase FROM ELECTION WHERE e_id=?",
//         [e_id],
//         (err, election) => {

//             if (err) return res.status(500).json({ message: "DB Error" });
//             if (election.length === 0)
//                 return res.status(404).json({ message: "Election not found" });

//             if (election[0].phase !== "COUNTING")
//                 return res.status(403).json({ message: "Election not in COUNTING phase" });

//             // 2️⃣ Get positions
//             db.query(
//                 "SELECT ep_id FROM ELECTION_POSITION WHERE e_id=?",
//                 [e_id],
//                 (err2, positions) => {

//                     if (err2) return res.status(500).json({ message: "DB Error" });
//                     if (positions.length === 0)
//                         return res.status(400).json({ message: "No positions found" });

//                     let done = 0;

//                     positions.forEach(position => {

//                         const ep_id = position.ep_id;

//                         // 3️⃣ Get last round
//                         db.query(
//                             `SELECT MAX(round_no) AS last_round
//                              FROM RESULT
//                              WHERE election_id=? AND position_id=?`,
//                             [e_id, ep_id],
//                             (err3, roundData) => {

//                                 const lastRound = roundData[0].last_round || 0;
//                                 const currentRound = lastRound + 1;

//                                 if (currentRound > 2) {
//                                     done++;
//                                     if (done === positions.length) finish();
//                                     return;
//                                 }

//                                 // 4️⃣ Count votes
//                                 db.query(
//                                     `SELECT n.nomination_id,
//                                             COUNT(v.vote_id) AS total_votes
//                                      FROM NOMINATION n
//                                      LEFT JOIN VOTE v
//                                        ON v.candidate_nomination_id = n.nomination_id
//                                        AND v.round_no=?
//                                      WHERE n.election_id=?
//                                        AND n.position_id=?
//                                        AND n.status='ADMIN_APPROVED'
//                                      GROUP BY n.nomination_id
//                                      ORDER BY total_votes DESC`,
//                                     [currentRound, e_id, ep_id],
//                                     (err4, votes) => {

//                                         if (votes.length === 0) {
//                                             done++;
//                                             if (done === positions.length) finish();
//                                             return;
//                                         }

//                                         const maxVotes = votes[0].total_votes;
//                                         const top = votes.filter(v => v.total_votes === maxVotes);

//                                         // 🏆 CLEAR WINNER
//                                         if (top.length === 1) {

//                                             db.query(
//                                                 `INSERT INTO RESULT
//                                                  (election_id, position_id, round_no,
//                                                   winner_nomination_id, total_votes, is_tie)
//                                                  VALUES (?, ?, ?, ?, ?, 0)`,
//                                                 [
//                                                     e_id,
//                                                     ep_id,
//                                                     currentRound,
//                                                     top[0].nomination_id,
//                                                     maxVotes
//                                                 ]
//                                             );

//                                             // Mark position completed
//                                             db.query(
//                                                 `UPDATE ELECTION_POSITION
//                                                  SET status='completed'
//                                                  WHERE ep_id=?`,
//                                                 [ep_id]
//                                             );
//                                         }

//                                         // ⚖ TIE
//                                         else {

//                                             db.query(
//                                                 `INSERT INTO RESULT
//                                                  (election_id, position_id, round_no,
//                                                   winner_nomination_id, total_votes, is_tie)
//                                                  VALUES (?, ?, ?, NULL, ?, 1)`,
//                                                 [
//                                                     e_id,
//                                                     ep_id,
//                                                     currentRound,
//                                                     maxVotes
//                                                 ]
//                                             );

//                                             if (currentRound === 1) {

//                                                 // Store re-election candidates
//                                                 top.forEach(candidate => {
//                                                     db.query(
//                                                         `INSERT INTO RE_ELECTION_CANDIDATES
//                                                          (position_id, election_id, nomination_id, round_no)
//                                                          VALUES (?, ?, ?, 2)`,
//                                                         [
//                                                             ep_id,
//                                                             e_id,
//                                                             candidate.nomination_id
//                                                         ]
//                                                     );
//                                                 });

//                                                 // Mark re-election required
//                                                 db.query(
//                                                     `UPDATE ELECTION_POSITION
//                                                      SET status='re_election_required'
//                                                      WHERE ep_id=?`,
//                                                     [ep_id]
//                                                 );
//                                             }
//                                             else {

//                                                 //  if (currentRound === 2) {

//                                                 // Sort by:
//                                                 // 1️⃣ Older age (earlier dob)
//                                                 // 2️⃣ Lexicographically smaller name

//                                                 topCandidates.sort((a, b) => {
//                                                     if (a.dob < b.dob) return -1;
//                                                     if (a.dob > b.dob) return 1;
//                                                     return a.student_name.localeCompare(b.student_name);
//                                                 });

//                                                 const finalWinner = topCandidates[0];

//                                                 db.query(
//                                                     `INSERT INTO RESULT  (election_id, position_id, round_no,
//                                                      winner_nomination_id, total_votes, is_tie)
//                                                      VALUES (?, ?, 2, ?, ?, 0)`,
//                                                     [e_id,
//                                                         ep_id,
//                                                         finalWinner.nomination_id,
//                                                         maxVotes
//                                                     ]
//                                                 );

//                                                 //  }
//                                                 db.query(
//                                                     `UPDATE ELECTION_POSITION
//                                                      SET status='completed'
//                                                      WHERE ep_id=?`,
//                                                     [ep_id]
//                                                 );
//                                             }
//                                         }

//                                         done++;
//                                         if (done === positions.length) finish();
//                                     }
//                                 );
//                             }
//                         );
//                     });

//                     function finish() {
//                         db.query(
//                             "UPDATE ELECTION SET phase='RESULT' WHERE e_id=?",
//                             [e_id]
//                         );

//                         res.json({ message: "Counting completed successfully" });
//                     }
//                 }
//             );
//         }
//     );
// });
const express = require("express");
const app = express();
const db = require("./db");

app.use(express.json());

app.put("/admin/election/:e_id/count", (req, res) => {

    const e_id = req.params.e_id;

    // 1️⃣ Check election phase
    db.query(
        "SELECT phase FROM ELECTION WHERE e_id=?",
        [e_id],
        (err, election) => {

            if (err) return res.status(500).json({ message: "DB Error" });
            if (election.length === 0)
                return res.status(404).json({ message: "Election not found" });

            if (election[0].phase !== "COUNTING")
                return res.status(403).json({ message: "Election not in COUNTING phase" });

            // 2️⃣ Get positions
            db.query(
                "SELECT ep_id FROM ELECTION_POSITION WHERE e_id=?",
                [e_id],
                (err2, positions) => {

                    if (err2) return res.status(500).json({ message: "DB Error" });
                    if (positions.length === 0)
                        return res.status(400).json({ message: "No positions found" });

                    let done = 0;

                    positions.forEach(position => {

                        const ep_id = position.ep_id;

                        // 3️⃣ Get last round
                        db.query(
                            `SELECT MAX(round_no) AS last_round
                             FROM RESULT
                             WHERE election_id=? AND position_id=?`,
                            [e_id, ep_id],
                            (err3, roundData) => {

                                const lastRound = roundData[0].last_round || 0;
                                const currentRound = lastRound + 1;

                                if (currentRound > 2) {
                                    done++;
                                    if (done === positions.length) finish();
                                    return;
                                }

                                // 4️⃣ Count votes
                                db.query(
                                    `SELECT n.nomination_id,
                                            s.dob,
                                            s.student_name,
                                            COUNT(v.vote_id) AS total_votes
                                     FROM NOMINATION n
                                     JOIN STUDENT s ON s.student_id = n.student_id
                                     LEFT JOIN VOTE v
                                       ON v.candidate_nomination_id = n.nomination_id
                                       AND v.round_no=?
                                     WHERE n.election_id=?
                                       AND n.position_id=?
                                       AND n.status='ADMIN_APPROVED'
                                     GROUP BY n.nomination_id
                                     ORDER BY total_votes DESC`,
                                    [currentRound, e_id, ep_id],
                                    (err4, votes) => {

                                        if (votes.length === 0) {
                                            done++;
                                            if (done === positions.length) finish();
                                            return;
                                        }

                                        const maxVotes = votes[0].total_votes;
                                        const top = votes.filter(v => v.total_votes === maxVotes);

                                        // 🏆 CLEAR WINNER
                                        if (top.length === 1) {

                                            db.query(
                                                `INSERT INTO RESULT
                                                 (election_id, position_id, round_no,
                                                  winner_nomination_id, total_votes, is_tie)
                                                 VALUES (?, ?, ?, ?, ?, 0)`,
                                                [
                                                    e_id,
                                                    ep_id,
                                                    currentRound,
                                                    top[0].nomination_id,
                                                    maxVotes
                                                ]
                                            );

                                            db.query(
                                                `UPDATE ELECTION_POSITION
                                                 SET status='completed'
                                                 WHERE ep_id=?`,
                                                [ep_id]
                                            );
                                        }

                                        // ⚖ TIE
                                        else {

                                            // 🟢 ROUND 1 TIE
                                            if (currentRound === 1) {

                                                db.query(
                                                    `INSERT INTO RESULT
                                                     (election_id, position_id, round_no,
                                                      winner_nomination_id, total_votes, is_tie)
                                                     VALUES (?, ?, ?, NULL, ?, 1)`,
                                                    [e_id, ep_id, currentRound, maxVotes]
                                                );

                                                // Store re-election candidates
                                                top.forEach(candidate => {
                                                    db.query(
                                                        `INSERT INTO RE_ELECTION_CANDIDATES
                                                         (position_id, election_id, nomination_id, round_no)
                                                         VALUES (?, ?, ?, 2)`,
                                                        [
                                                            ep_id,
                                                            e_id,
                                                            candidate.nomination_id
                                                        ]
                                                    );
                                                });

                                                db.query(
                                                    `UPDATE ELECTION_POSITION
                                                     SET status='re_election_required'
                                                     WHERE ep_id=?`,
                                                    [ep_id]
                                                );
                                            }

                                            // 🔵 ROUND 2 TIE → FINAL DECISION
                                            else {

                                                // Sort by:
                                                // 1️⃣ Older age (earlier DOB)
                                                // 2️⃣ Lexicographically smaller name

                                                top.sort((a, b) => {
                                                    if (a.dob < b.dob) return -1;
                                                    if (a.dob > b.dob) return 1;
                                                    return a.student_name.localeCompare(b.student_name);
                                                });

                                                const finalWinner = top[0];

                                                db.query(
                                                    `INSERT INTO RESULT
                                                     (election_id, position_id, round_no,
                                                      winner_nomination_id, total_votes, is_tie)
                                                     VALUES (?, ?, ?, ?, ?, 0)`,
                                                    [
                                                        e_id,
                                                        ep_id,
                                                        currentRound,
                                                        finalWinner.nomination_id,
                                                        maxVotes
                                                    ]
                                                );

                                                db.query(
                                                    `UPDATE ELECTION_POSITION
                                                     SET status='completed'
                                                     WHERE ep_id=?`,
                                                    [ep_id]
                                                );
                                            }
                                        }

                                        done++;
                                        if (done === positions.length) finish();
                                    }
                                );
                            }
                        );
                    });

                    function finish() {

                        // Mark election as completed
                        db.query(
                            "UPDATE ELECTION SET phase='RESULT' WHERE e_id=?",
                            [e_id]
                        );

                        // Cleanup re-election data
                        db.query(
                            "DELETE FROM RE_ELECTION_CANDIDATES WHERE election_id=?",
                            [e_id]
                        );

                        res.json({ message: "Counting completed successfully" });
                    }
                }
            );
        }
    );
});