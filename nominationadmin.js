
const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const db = require("./db");
require("dotenv").config();

app.use(express.json());

function authenticateToken(req, res, next) {

    const authHeader = req.headers["authorization"];

    if (!authHeader)
        return res.status(401).json({ message: "No token provided" });

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}
app.get("/nomination/admin/pending/:e_id", authenticateToken, (req, res) => {

    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin only" });
    }

    const e_id = req.params.e_id;

    const query = `
        SELECT *
        FROM NOMINATION
        WHERE election_id = ?
        AND status = 'STUDENT_ACCEPTED'
    `;

    db.query(query, [e_id], (err, results) => {

        if (err)
            return res.status(500).json({ message: "Database error" });

        return res.status(200).json({
            pending_nominations: results
        });
    });
});

// app.put("/nomination/:id/admin-approve", authenticateToken, (req, res) => {

//     const nomination_id = req.params.id;

//     // 1️⃣ Check role
//     if (req.user.role !== "admin") {
//         return res.status(403).json({
//             message: "Admin only action"
//         });
//     }

//     const checkEligibility = `
//     SELECT s.is_eligible
//     FROM NOMINATION n
//     JOIN STUDENT s ON n.student_id = s.student_id
//     WHERE n.nomination_id = ?
// `;

//     db.query(checkEligibility, [nomination_id], (err2, resu) => {

//         if (!resu[0].is_eligible) {
//             db.query(`UPDATE NOMINATION SET status='ADMIN_REJECTED' WHERE nomination_id=? `,[nomination_id],(err3,resultt)=>{
                
//             })
//             return res.status(403).json({
//                 message: "Student is not eligible to contest"
//             });
//         }

//         // then update to ADMIN_APPROVED
//     });
//     // 2️⃣ Get nomination details + election phase
//     const query = `
//         SELECT n.*, e.phase
//         FROM NOMINATION n
//         JOIN ELECTION e ON n.election_id = e.e_id
//         WHERE n.nomination_id = ?
//     `;

//     db.query(query, [nomination_id], (err, results) => {

//         if (err)
//             return res.status(500).json({ message: "Database error" });

//         if (results.length === 0)
//             return res.status(404).json({ message: "Nomination not found" });

//         const nomination = results[0];

//         // 3️⃣ Check phase
//         if (nomination.phase !== "NOMINATION") {
//             return res.status(403).json({
//                 message: "Nomination phase closed"
//             });
//         }

//         // 4️⃣ Check student accepted
//         if (nomination.status !== "STUDENT_ACCEPTED") {
//             return res.status(400).json({
//                 message: "Student has not accepted yet"
//             });
//         }

//         // 5️⃣ Check duplicate approved candidate
//         const duplicateQuery = `
//             SELECT nomination_id
//             FROM NOMINATION
//             WHERE election_id = ?
//               AND position_id = ?
//               AND party_id = ?
//               AND status = 'ADMIN_APPROVED'
//         `;

//         db.query(
//             duplicateQuery,
//             [nomination.election_id, nomination.position_id, nomination.party_id],
//             (err2, dupResult) => {

//                 if (err2)
//                     return res.status(500).json({ message: "Database error" });

//                 if (dupResult.length > 0) {
//                     return res.status(409).json({
//                         message: "Position already has approved candidate"
//                     });
//                 }

//                 // 6️⃣ Approve nomination
//                 const approveQuery = `
//                     UPDATE NOMINATION
//                     SET status = 'ADMIN_APPROVED'
//                     WHERE nomination_id = ?
//                 `;

//                 db.query(approveQuery, [nomination_id], (err3) => {

//                     if (err3)
//                         return res.status(500).json({
//                             message: "Approval failed"
//                         });

//                     return res.status(200).json({
//                         message: "Nomination approved successfully"
//                     });
//                 });
//             }
//         );
//     });
// });
app.put("/nomination/:id/admin-approve", authenticateToken, (req, res) => {

    // 1️⃣ Admin check
    if (req.user.role !== "admin") {
        return res.status(403).json({
            message: "Admin only action"
        });
    }

    const nomination_id = req.params.id;

    // 2️⃣ Get nomination + phase + eligibility
    const query = `
        SELECT 
            n.nomination_id,
            n.election_id,
            n.position_id,
            n.party_id,
            n.status,
            e.phase,
            s.is_eligible
        FROM NOMINATION n
        JOIN ELECTION e ON n.election_id = e.e_id
        JOIN STUDENT s ON n.student_id = s.student_id
        WHERE n.nomination_id = ?
    `;

    db.query(query, [nomination_id], (err, results) => {

        if (err)
            return res.status(500).json({ message: "Database error" });

        if (results.length === 0)
            return res.status(404).json({ message: "Nomination not found" });

        const nomination = results[0];

        // 3️⃣ Phase check
        if (nomination.phase !== "NOMINATION") {
            return res.status(403).json({
                message: "Nomination phase is closed"
            });
        }

        // 4️⃣ Student must accept first
        if (nomination.status !== "STUDENT_ACCEPTED") {
            return res.status(400).json({
                message: "Student has not accepted this nomination"
            });
        }

        // 5️⃣ Eligibility check
        if (!nomination.is_eligible) {

            // Auto reject if ineligible
            db.query(
                `UPDATE NOMINATION 
                 SET status = 'ADMIN_REJECTED' 
                 WHERE nomination_id = ?`,
                [nomination_id]
            );

            return res.status(403).json({
                message: "Student not eligible. Nomination auto-rejected."
            });
        }

        // 6️⃣ Approve nomination
        const approveQuery = `
            UPDATE NOMINATION
            SET status = 'ADMIN_APPROVED'
            WHERE nomination_id = ?
        `;

        db.query(approveQuery, [nomination_id], (err2) => {

            if (err2) {

                // 🚨 Party duplicate case handled by DB constraint
                if (err2.code === "ER_DUP_ENTRY") {
                    return res.status(409).json({
                        message: "Party already has approved candidate for this position"
                    });
                }

                return res.status(500).json({
                    message: "Approval failed"
                });
            }

            return res.status(200).json({
                message: "Nomination approved successfully"
            });
        });
    });
});
