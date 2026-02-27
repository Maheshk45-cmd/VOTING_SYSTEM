// const express = require("express");
// const app = express();
// const db = require("./db");
// const jwt = require("jsonwebtoken");
// require("dotenv").config();

// app.use(express.json());

// function authenticatetoken(req, res, next) {
//     const authheader = req.headers.authorization;

//     if (!authheader) {
//         return res.status(401).json({ message: "NEED TO LOG IN" });
//     }

//     const token = authheader.split(" ")[1];

//     try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         req.prn_id = decoded.prn_id;
//         next();
//     } catch (err) {
//         return res.status(403).json({ message: "Invalid or expired token" });
//     }
// }

// app.post("/nomination", authenticatetoken, (req, res) => {

//     const requester_prn = req.prn_id;
//     const { e_id, position_id, candidate_prn } = req.body;

//     if (!e_id || !position_id) {
//         return res.status(400).json({
//             message: "Election and position required"
//         });
//     }

//     // 1️⃣ Get requester info
//     const studentQuery = `
//         SELECT role, party_id
//         FROM STUDENT
//         WHERE prn_id = ?
//     `;

//     db.query(studentQuery, [requester_prn], (err, requesterResult) => {

//         if (err)
//             return res.status(500).json({ message: "Database error" });

//         if (requesterResult.length === 0)
//             return res.status(404).json({ message: "Student not found" });

//         const { role, party_id } = requesterResult[0];

//         // 2️⃣ Check election phase
//         db.query(
//             `SELECT phase FROM ELECTION WHERE e_id=?`,
//             [e_id],
//             (err2, phaseResult) => {

//                 if (err2)
//                     return res.status(500).json({ message: "Database error" });

//                 if (phaseResult.length === 0)
//                     return res.status(404).json({ message: "Invalid election" });

//                 if (phaseResult[0].phase !== "NOMINATION")
//                     return res.status(403).json({
//                         message: "Nomination phase closed"
//                     });

//                 let finalCandidatePrn;
//                 let finalPartyId = null;

//                 // 🔥 CASE A: Party Head
//                 if (role === "party_head") {

//                     if (!candidate_prn)
//                         return res.status(400).json({
//                             message: "Candidate PRN required"
//                         });

//                     if (!party_id)
//                         return res.status(400).json({
//                             message: "Party head must belong to party"
//                         });

//                     finalCandidatePrn = candidate_prn;
//                     finalPartyId = party_id;
//                 }

//                 // 🔥 CASE B: Independent student
//                 else {
//                     finalCandidatePrn = requester_prn;
//                     finalPartyId = null;
//                 }

//                 // 3️⃣ Check student exists
//                 db.query(
//                     `SELECT prn_id FROM STUDENT WHERE prn_id=?`,
//                     [finalCandidatePrn],
//                     (err3, studentCheck) => {

//                         if (err3)
//                             return res.status(500).json({ message: "Database error" });

//                         if (studentCheck.length === 0)
//                             return res.status(404).json({ message: "Candidate not found" });

//                         // ✅ FIXED QUERY (only change made here)
//                         db.query(
//                             `SELECT nomination_id, status
//                              FROM NOMINATION
//                              WHERE prn_id=? 
//                              AND e_id=?`,
//                             [finalCandidatePrn, e_id],
//                             (err4, dupResult) => {

//                                 if (err4)
//                                     return res.status(500).json({ message: "Database error" });

//                                 if (dupResult.length > 0) {

//                                     const existing = dupResult[0];

//                                     // Allow reapply only if rejected
//                                     if (
//                                         existing.status === "STUDENT_REJECTED" ||
//                                         existing.status === "ADMIN_REJECTED"
//                                     ) {

//                                         db.query(
//                                             `UPDATE NOMINATION
//                                              SET position_id=?, party_id=?, status='PENDING'
//                                              WHERE nomination_id=?`,
//                                             [position_id, finalPartyId, existing.nomination_id],
//                                             (err5) => {

//                                                 if (err5)
//                                                     return res.status(500).json({ message: "Update failed" });

//                                                 return res.status(200).json({
//                                                     message: "Reapplied successfully"
//                                                 });
//                                             }
//                                         );

//                                         return;
//                                     }

//                                     return res.status(409).json({
//                                         message: "Student already nominated in this election"
//                                     });
//                                 }

//                                 // 5️⃣ Check one party one position rule
//                                 if (finalPartyId) {

//                                     db.query(
//                                         `SELECT nomination_id
//                                          FROM NOMINATION
//                                          WHERE party_id=? 
//                                          AND position_id=? 
//                                          AND e_id=?`,
//                                         [finalPartyId, position_id, e_id],
//                                         (err6, partyCheck) => {

//                                             if (err6)
//                                                 return res.status(500).json({ message: "Database error" });

//                                             if (partyCheck.length > 0)
//                                                 return res.status(409).json({
//                                                     message: "Party already nominated someone for this position"
//                                                 });

//                                             insertNomination();
//                                         }
//                                     );
//                                 } else {
//                                     insertNomination();
//                                 }

//                                 function insertNomination() {

//                                     db.query(
//                                         `INSERT INTO NOMINATION
//                                          (prn_id, e_id, position_id, party_id, status)
//                                          VALUES (?, ?, ?, ?, 'PENDING')`,
//                                         [finalCandidatePrn, e_id, position_id, finalPartyId],
//                                         (err7) => {

//                                             if (err7)
//                                                 return res.status(500).json({
//                                                     message: "Insert failed"
//                                                 });

//                                             return res.status(201).json({
//                                                 message: "Nomination submitted for student approval"
//                                             });
//                                         }
//                                     );
//                                 }

//                             }
//                         );

//                     }
//                 );

//             }
//         );

//     });

// });
const express = require("express");
const app = express();
const db = require("./db");
const jwt = require("jsonwebtoken");
require("dotenv").config();

app.use(express.json());

function authenticatetoken(req, res, next) {
    const authheader = req.headers.authorization;

    if (!authheader) {
        // console.log("nhi auth gaya bhaii");
        return res.status(401).json({ message: "NEED TO LOG IN" });
    }

    const token = authheader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.prn_id = decoded.prn_id;
        next();
    } catch (err) {
        //console.log("nhi err token gaya bhaii");
        return res.status(403).json({ message: "Invalid or expired token" });
    }
}

app.post("/nomination", authenticatetoken, (req, res) => {

    const requester_prn = req.prn_id;
    const { e_id, position_id, candidate_prn } = req.body;

    if (!e_id || !position_id) {
        //console.log("nhi requie gaya bhaii");
        return res.status(400).json({
            message: "Election and position required"
        });
    }

    // 1️⃣ Get requester info
    const studentQuery = `
        SELECT role, party_id
        FROM STUDENT
        WHERE prn_id = ?
    `;


    db.query(studentQuery, [requester_prn], (err, requesterResult) => {

        if (err)
            return res.status(500).json({ message: "Database error" });

        if (requesterResult.length === 0)
            return res.status(404).json({ message: "Student not found" });

        const { role, party_id } = requesterResult[0];

        // 2️⃣ Check election phase
        db.query(
            `SELECT phase FROM ELECTION WHERE e_id=?`,
            [e_id],
            (err2, phaseResult) => {

                if (err2)
                    return res.status(500).json({ message: "Database error" });

                if (phaseResult.length === 0)
                    return res.status(404).json({ message: "Invalid election" });

                if (phaseResult[0].phase !== "NOMINATION")
                    return res.status(403).json({
                        message: "Nomination phase closed"
                    });

                let finalCandidatePrn;
                let finalPartyId = null;

                // 🔥 CASE A: Party Head
                if (role === "party_head") {

                    if (!candidate_prn)
                        return res.status(400).json({
                            message: "Candidate PRN required"
                        });

                    if (!party_id)
                        return res.status(400).json({
                            message: "Party head must belong to party"
                        });

                    finalCandidatePrn = candidate_prn;
                    finalPartyId = party_id;
                }

                // 🔥 CASE B: Independent student
                else {
                    finalCandidatePrn = requester_prn;
                    finalPartyId = null;
                }

                // 3️⃣ Check student exists
                db.query(
                    `SELECT prn_id FROM STUDENT WHERE prn_id=?`,
                    [finalCandidatePrn],
                    (err3, studentCheck) => {

                        if (err3)
                            return res.status(500).json({ message: "Database error" });

                        if (studentCheck.length === 0)
                            return res.status(404).json({ message: "Candidate not found" });

                        // ✅ FIXED QUERY (only change made here)
                        db.query(
                            `SELECT nomination_id, status
                             FROM NOMINATION
                             WHERE prn_id=? 
                             AND e_id=?`,
                            [finalCandidatePrn, e_id],
                            (err4, dupResult) => {

                                if (err4)
                                    return res.status(500).json({ message: "Database error" });

                                if (dupResult.length > 0) {

                                    const existing = dupResult[0];

                                    // Allow reapply only if rejected
                                    if (
                                        existing.status === "STUDENT_REJECTED" ||
                                        existing.status === "ADMIN_REJECTED"
                                    ) {

                                        db.query(
                                            `UPDATE NOMINATION
                                             SET position_id=?, party_id=?, status='PENDING'
                                             WHERE nomination_id=?`,
                                            [position_id, finalPartyId, existing.nomination_id],
                                            (err5) => {

                                                if (err5)
                                                    return res.status(500).json({ message: "Update failed" });

                                                return res.status(200).json({
                                                    message: "Reapplied successfully"
                                                });
                                            }
                                        );

                                        return;
                                    }

                                    return res.status(409).json({
                                        message: "Student already nominated in this election"
                                    });
                                }

                                // 5️⃣ Check one party one position rule
                                if (finalPartyId) {

                                    db.query(
                                        `SELECT nomination_id
                                         FROM NOMINATION
                                         WHERE party_id=? 
                                         AND position_id=? 
                                         AND e_id=?`,
                                        [finalPartyId, position_id, e_id],
                                        (err6, partyCheck) => {

                                            if (err6)
                                                return res.status(500).json({ message: "Database error" });

                                            if (partyCheck.length > 0)
                                                return res.status(409).json({
                                                    message: "Party already nominated someone for this position"
                                                });

                                            insertNomination();
                                        }
                                    );
                                } else {
                                    insertNomination();
                                }

                                function insertNomination() {

                                    db.query(
                                        `INSERT INTO NOMINATION
                                         (prn_id, e_id, position_id, party_id, status)
                                         VALUES (?, ?, ?, ?, 'PENDING')`,
                                        [finalCandidatePrn, e_id, position_id, finalPartyId],
                                        (err7) => {

                                            if (err7)
                                                return res.status(500).json({
                                                    message: "Insert failed"
                                                });
                                            //   console.log("ho  gaya bhaii");
                                            return res.status(201).json({

                                                message: "Nomination submitted for student approval"
                                            });
                                        }
                                    );
                                }

                            }
                        );

                    }
                );

            }
        );

    });

});
app.listen(3000, () => {
    console.log("Listening on port 3000");
})
