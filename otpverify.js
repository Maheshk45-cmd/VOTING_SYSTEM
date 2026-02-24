// const express = require("express");
// const app = express();
// const db = require("./db");
// const bcrypt = require("bcrypt");
// app.use(express.json());
// // app.post("/otp-verify", (req, res) => {
// //     const { otp1, prn_id } = req.body;
// //     if (!otp1 || !prn_id) {
// //         return res.status(400).json({ message: " MISSING" });
// //     }
// //     //write query to db(otp verification) check does this otp exist for this prn 
// //     const query_otpverify = `SELECT otp,expiresAt,attempt FROM OTP_VERIFICATION WHERE prn_id=?`;
// //     db.query(query_otpverify, [prn_id], async (err, results) => {
// //         if (err) {
// //             return res.status(500).json({ message: "DATABASE FAILURE" });
// //         }
// //         if (results.length === 0) {
// //             return res.status(400).json({ message: "Enter valid PRN" });
// //         }
// //         const isMatch = await bcrypt.compare(otp1, result[0].otp);
// //         // const prn = results[0].prn_id;
// //         const expiry = new Date(results[0].expiresAt);
// //         const attempt = results[0].attempt;
// //         if (new Date() > expiry) {
// //             return res.status(404).json({ message: "Time out" });
// //         }

// //         // wrong otp
// //         if (!isMatch) {
// //             // make query to update attempt count
// //             const BlockedTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
// //             const updateQuery = `
// //                 UPDATE OTP_VERIFICATION
// //                 SET attempt = attempt + 1,blockedUntil=BlockedTime
// //                 WHERE prn_id = ?
// //             `;
// //             db.query(updateQuery, [prn_id], (err, results) => {
// //                 if (err) {
// //                     return res.status(500).json({ message: "DATABASE FAILURE" });
// //                 }
// //                 if (results.length === 0) {
// //                     return res.status(500).json({ message: "Enter the valid prn" });
// //                 }
// //                 return res.send(" OOPSSS 😒 !!! WRONG  OTP");
// //             });

// //         }
// //         else {
// //             const deleteQuery = `
// //             DELETE FROM OTP_VERIFICATION
// //             WHERE prn_id = ?
// //         `;

// //             db.query(deleteQuery, [prn_id]);

// //             return res.status(200).json({
// //                 message: "OTP verified successfully"
// //             });

// //         }

// //     });
// // })
// app.post("/otp-verify", (req, res) => {

//     const { otp1, prn_id } = req.body;

//     if (!otp1 || !prn_id)
//         return res.status(400).json({ message: "MISSING DATA" });

//     const query =
//         `SELECT otp, expiresAt, attempt, blockedUntil
//          FROM OTP_VERIFICATION
//          WHERE prn_id=?`;

//     db.query(query, [prn_id], async (err, results) => {

//         if (err)
//             return res.status(500).json({ message: "DATABASE FAILURE" });

//         if (results.length === 0)
//             return res.status(400).json({ message: "INVALID PRN" });

//         const {
//             otp,
//             expiresAt,
//             attempt,
//             blockedUntil
//         } = results[0];

//         const now = new Date();

//         // 🔴 Check Block First
//         if (blockedUntil &&
//             new Date(blockedUntil) > now) {

//             return res.status(403).json({
//                 message: "BLOCKED UNTIL " + blockedUntil
//             });
//         }

//         // 🔴 Check Expiry
//         if (new Date(expiresAt) < now) {
//             return res.status(400).json({
//                 message: "OTP EXPIRED"
//             });
//         }

//         const isMatch = await bcrypt.compare(otp1, otp);

//         // ❌ Wrong OTP
//         if (!isMatch) {

//             //const newAttempt = attempt + 1;

//             if (attempt + 1 >= 3) {

//                 const blockTime =
//                     new Date(Date.now() +
//                         2 * 60 * 60 * 1000);

//                 const blockQuery = `
//                     UPDATE OTP_VERIFICATION
//                     SET attempt = 0,
//                         blockedUntil = ?
//                     WHERE prn_id = ?
//                 `;

//                 db.query(blockQuery,
//                     [blockTime, prn_id]);

//                 return res.status(403).json({
//                     message: "BLOCKED FOR 2 HOURS"
//                 });
//             }

//             // Increment attempt only
//             const updateQuery = `
//                 UPDATE OTP_VERIFICATION
//                 SET attempt = attempt+1
//                 WHERE prn_id = ?
//             `;

//             db.query(updateQuery,
//                 [prn_id]);

//             return res.status(401).json({
//                 message: "WRONG OTP"
//             });
//         }

//         // ✅ Correct OTP
//         const deleteQuery =
//             `DELETE FROM OTP_VERIFICATION WHERE prn_id=?`;

//         db.query(deleteQuery, [prn_id]);

//         return res.status(200).json({
//             message: "OTP VERIFIED SUCCESSFULLY"
//         });
//     });
// });
const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

router.post("/verify", (req, res) => {

    const { prn_id, otp } = req.body;

    if (!prn_id || !otp) {
        return res.status(400).json({
            message: "PRN and OTP are required"
        });
    }

    const query = `
        SELECT otp, expiresAt, attempt, blockedUntil
        FROM OTP_VERIFICATION
        WHERE prn_id = ?
    `;

    db.query(query, [prn_id], async (err, results) => {

        if (err) {
            return res.status(500).json({
                message: "Database error"
            });
        }

        if (results.length === 0) {
            return res.status(400).json({
                message: "Invalid or expired OTP request"
            });
        }

        const {
            otp: storedOtp,
            expiresAt,
            attempt,
            blockedUntil
        } = results[0];

        const now = new Date();

        // 🔴 1. Check if blocked
        if (blockedUntil && new Date(blockedUntil) > now) {
            return res.status(403).json({
                message: "Too many failed attempts. Try later."
            });
        }

        // 🔴 2. Check expiry
        if (new Date(expiresAt) < now) {
            return res.status(400).json({
                message: "OTP expired"
            });
        }

        // 🔴 3. Compare OTP
        const isMatch = await bcrypt.compare(otp, storedOtp);

        if (!isMatch) {

            const newAttempt = attempt + 1;

            // 🔴 Block after 3 attempts
            if (newAttempt >= 3) {

                const blockTime =
                    new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

                db.query(
                    `UPDATE OTP_VERIFICATION
                     SET attempt = 0,
                         blockedUntil = ?
                     WHERE prn_id = ?`,
                    [blockTime, prn_id]
                );

                return res.status(403).json({
                    message: "Too many attempts. Account blocked for 2 hours."
                });
            }

            // 🔴 Increment attempt
            db.query(
                `UPDATE OTP_VERIFICATION
                 SET attempt = ?
                 WHERE prn_id = ?`,
                [newAttempt, prn_id]
            );

            return res.status(401).json({
                message: "Invalid OTP"
            });
        }

        // ✅ 4. OTP correct → delete record
        db.query(
            `DELETE FROM OTP_VERIFICATION WHERE prn_id = ?`,
            [prn_id]
        );

        // ✅ 5. Issue TEMP token (10 minutes)
        const tempToken = jwt.sign(
            {
                prn_id: prn_id,
                otpVerified: true
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "10m"
            }
        );

        return res.status(200).json({
            message: "OTP verified successfully",
            tempToken
        });

    });
});

module.exports = router;