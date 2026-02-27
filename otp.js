// // routes/otp.routes.js

// const express = require("express");
// const router = express.Router();
// const db = require("../db");
// const crypto = require("crypto");
// const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");

// function generateOtp() {
//     return crypto.randomInt(100000, 1000000).toString();
// }

// /* ==============================
//    OTP REQUEST ROUTE
// ================================= */

// router.post("/request", (req, res) => {

//     const { prn_id } = req.body;

//     if (!prn_id)
//         return res.status(400).json({ message: "PRN required" });

//     const emailQuery =
//         `SELECT email FROM ELIGIBLE_STUDENT WHERE prn_id=?`;

//     db.query(emailQuery, [prn_id], (err, results) => {

//         if (err)
//             return res.status(500).json({ message: "Database error" });

//         if (results.length === 0)
//             return res.status(404).json({ message: "Invalid PRN" });

//         const checkQuery =
//             `SELECT expiresAt, blockedUntil
//              FROM OTP_VERIFICATION
//              WHERE prn_id=?`;

//         db.query(checkQuery, [prn_id], async (err2, record) => {

//             if (err2)
//                 return res.status(500).json({ message: "Database error" });

//             const now = new Date();

//             if (record.length > 0) {

//                 const { expiresAt, blockedUntil } = record[0];

//                 // 🔴 Block check
//                 if (blockedUntil && new Date(blockedUntil) > now) {
//                     return res.status(403).json({
//                         message: "Account temporarily blocked"
//                     });
//                 }

//                 // 🟡 OTP still valid
//                 if (expiresAt && new Date(expiresAt) > now) {
//                     return res.status(409).json({
//                         message: "Previous OTP still valid"
//                     });
//                 }
//             }

//             const otp = generateOtp();
//             const hashedOtp = await bcrypt.hash(otp, 10);
//             const expiry = new Date(Date.now() + 2 * 60 * 1000);

//             const insertQuery = `
//                 INSERT INTO OTP_VERIFICATION
//                 (prn_id, otp, expiresAt, attempt, blockedUntil)
//                 VALUES (?, ?, ?, 0, NULL)
//                 ON DUPLICATE KEY UPDATE
//                     otp = VALUES(otp),
//                     expiresAt = VALUES(expiresAt)
//             `;

//             db.query(insertQuery,
//                 [prn_id, hashedOtp, expiry],
//                 (err3) => {

//                     if (err3)
//                         return res.status(500).json({
//                             message: "OTP generation failed"
//                         });

//                     console.log("OTP (testing):", otp);

//                     return res.status(200).json({
//                         message: "OTP sent successfully"
//                     });
//                 });
//         });
//     });
// });


// /* ==============================
//    OTP VERIFY ROUTE
// ================================= */

// router.post("/verify", (req, res) => {

//     const { prn_id, otp } = req.body;

//     if (!prn_id || !otp)
//         return res.status(400).json({
//             message: "PRN and OTP required"
//         });

//     const query = `
//         SELECT otp, expiresAt, attempt, blockedUntil
//         FROM OTP_VERIFICATION
//         WHERE prn_id=?
//     `;

//     db.query(query, [prn_id], async (err, results) => {

//         if (err)
//             return res.status(500).json({ message: "Database error" });

//         if (results.length === 0)
//             return res.status(400).json({
//                 message: "Invalid OTP request"
//             });

//         const {
//             otp: storedOtp,
//             expiresAt,
//             attempt,
//             blockedUntil
//         } = results[0];

//         const now = new Date();

//         // 🔴 Block check
//         if (blockedUntil && new Date(blockedUntil) > now) {
//             return res.status(403).json({
//                 message: "Too many failed attempts. Try later."
//             });
//         }

//         // 🔴 Expiry check
//         if (new Date(expiresAt) < now) {
//             return res.status(400).json({
//                 message: "OTP expired"
//             });
//         }

//         const isMatch = await bcrypt.compare(otp, storedOtp);

//         if (!isMatch) {

//             const newAttempt = attempt + 1;

//             if (newAttempt >= 3) {

//                 const blockTime =
//                     new Date(Date.now() + 2 * 60 * 60 * 1000);

//                 db.query(
//                     `UPDATE OTP_VERIFICATION
//                      SET attempt = 0,
//                          blockedUntil = ?
//                      WHERE prn_id=?`,
//                     [blockTime, prn_id]
//                 );

//                 return res.status(403).json({
//                     message: "Blocked for 2 hours"
//                 });
//             }

//             db.query(
//                 `UPDATE OTP_VERIFICATION
//                  SET attempt=?
//                  WHERE prn_id=?`,
//                 [newAttempt, prn_id]
//             );

//             return res.status(401).json({
//                 message: "Invalid OTP"
//             });
//         }

//         // ✅ Success → delete OTP
//         db.query(
//             `DELETE FROM OTP_VERIFICATION WHERE prn_id=?`,
//             [prn_id]
//         );

//         const tempToken = jwt.sign(
//             { prn_id, otpVerified: true },
//             process.env.JWT_SECRET,
//             { expiresIn: "10m" }
//         );

//         return res.status(200).json({
//             message: "OTP verified successfully",
//             tempToken
//         });
//     });
// });

// module.exports = router;
// routes/otp.routes.js

const express = require("express");
const app = express();
const db = require("./db");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
require("dotenv").config();
app.use(express.json());
const otpLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 5,              // limit each IP to 5 requests per minute
    message: {
        message: "Too many OTP requests. Please try again after 1 minute."
    },
    standardHeaders: true,
    legacyHeaders: false
});
function generateOtp() {
    return crypto.randomInt(100000, 1000000).toString();
}

/* ==============================
   OTP REQUEST ROUTE
================================= */
// router.post("/request", (req, res) => {
//     const { prn_id } = req.body;
//     if (!prn_id) {
//         return res.status(401).json({ message: "PRN REQUIRED" });
//     }
//     const emailquery = `SELECT email FROM ELIGIBLE_STUDENT WHERE prn_id=?`;
//     db.query(emailquery, [prn_id], (err1, result) => {
//         if (err1) {
//             return res.status(500).json({ message: "DATABASE ERROR" });
//         }
//         if (result.length === 0) {
//             return res.status(401).json({ message: "INvalid PRN" });
//         }
//         const email = result.email;
//         const studquery = `SELECT prn_id FROM STUDENT WHERE email=?`;
//         db.query(studquery, [email], (err2, studeres) => {
//             if (err2) {
//                 return res.status(500).json({ message: "Database Error" });
//             }
//             if (studeres !== 0) {
//                 return res.status(401).json({ message: "This prn is already logged in" });
//             }
//             // Now check is this blocked from otp or prev otp valid;
//             const otpquery = `SELECT expiresAt,blockedUntil FROM OTP_VERIFICATION WHERE prn_id=?`;
//             db.query(otpquery, [prn_id], (err3, otpres) => {
//                 if (err3) {
//                     return res.status(500).json({ message: "Database Error" });
//                 }
//                 if(otpres.)
//             })
//         })
//    })
//})
app.post("/request", otpLimiter, (req, res) => {

    const { prn_id } = req.body;

    if (!prn_id)
        return res.status(400).json({ message: "PRN required" });

    const emailQuery =
        `SELECT email FROM ELIGIBLE_STUDENT WHERE prn_id=?`;
    // Also check whether that email is previously logged in or not
    db.query(emailQuery, [prn_id], (err, results) => {

        if (err)
            return res.status(500).json({ message: "Database error" });

        if (results.length === 0)
            return res.status(404).json({ message: "Invalid PRN" });

        const email = results[0].email;
        const querystud = `SELECT prn_id FROM STUDENT WHERE email=?`;
        db.query(querystud, [email], (err, reslt) => {
            if (err) {
                return res.status(500).json({ message: "Database Error" });
            }
            if (reslt.length !== 0) {
                return res.status(409).json({ message: "This email is previously logged in" });
            }

            const checkQuery =
                `SELECT expiresAt, blockedUntil
             FROM OTP_VERIFICATION
             WHERE prn_id=?`;

            db.query(checkQuery, [prn_id], async (err2, record) => {

                if (err2)
                    return res.status(500).json({ message: "Database error" });

                const now = new Date();

                if (record.length > 0) {

                    const { expiresAt, blockedUntil } = record[0];

                    // 🔴 Block check
                    if (blockedUntil && new Date(blockedUntil) > now) {
                        return res.status(403).json({
                            message: "Account temporarily blocked"
                        });
                    }

                    // 🟡 OTP still valid
                    if (expiresAt && new Date(expiresAt) > now) {
                        return res.status(409).json({
                            message: "Previous OTP still valid"
                        });
                    }
                }

                const otp = generateOtp();
                const hashedOtp = await bcrypt.hash(otp, 10);
                const expiry = new Date(Date.now() + 2 * 60 * 1000);

                const insertQuery = `
                INSERT INTO OTP_VERIFICATION
                (prn_id, otp, expiresAt, attempt, blockedUntil)
                VALUES (?, ?, ?, 0, NULL)
                ON DUPLICATE KEY UPDATE
                    otp = VALUES(otp),
                    expiresAt = VALUES(expiresAt)
            `;

                db.query(insertQuery,
                    [prn_id, hashedOtp, expiry],
                    (err3) => {

                        if (err3)
                            return res.status(500).json({
                                message: "OTP generation failed"
                            });

                        console.log("OTP (testing):", otp);

                        return res.status(200).json({
                            message: "OTP sent successfully"
                        });
                    });
            });
        });
    });
});


/* ==============================
   OTP VERIFY ROUTE
================================= */

app.post("/verify", (req, res) => {

    const { prn_id, otp } = req.body;

    if (!prn_id || !otp)
        return res.status(400).json({
            message: "PRN and OTP required"
        });

    const query = `
        SELECT otp, expiresAt, attempt, blockedUntil
        FROM OTP_VERIFICATION
        WHERE prn_id=?
    `;

    db.query(query, [prn_id], async (err, results) => {

        if (err)
            return res.status(500).json({ message: "Database error" });

        if (results.length === 0)
            return res.status(400).json({
                message: "Invalid OTP request"
            });

        const {
            otp: storedOtp,
            expiresAt,
            attempt,
            blockedUntil
        } = results[0];

        const now = new Date();

        // 🔴 Block check
        if (blockedUntil && new Date(blockedUntil) > now) {
            return res.status(403).json({
                message: "Too many failed attempts. Try later."
            });
        }

        // 🔴 Expiry check
        if (new Date(expiresAt) < now) {
            return res.status(400).json({
                message: "OTP expired"
            });
        }

        const isMatch = await bcrypt.compare(otp, storedOtp);

        if (!isMatch) {

            const newAttempt = attempt + 1;

            if (newAttempt >= 3) {

                const blockTime =
                    new Date(Date.now() + 2 * 60 * 60 * 1000);

                db.query(
                    `UPDATE OTP_VERIFICATION
                     SET attempt = 0,
                         blockedUntil = ?
                     WHERE prn_id=?`,
                    [blockTime, prn_id]
                );

                return res.status(403).json({
                    message: "Blocked for 2 hours"
                });
            }

            db.query(
                `UPDATE OTP_VERIFICATION
                 SET attempt=?
                 WHERE prn_id=?`,
                [newAttempt, prn_id]
            );

            return res.status(401).json({
                message: "Invalid OTP"
            });
        }

        // ✅ Success → delete OTP
        db.query(
            `DELETE FROM OTP_VERIFICATION WHERE prn_id=?`,
            [prn_id]
        );

        const tempToken = jwt.sign(
            { prn_id, otpVerified: true },
            process.env.JWT_SECRET,
            { expiresIn: "10m" }
        );

        return res.status(200).json({
            message: "OTP verified successfully",
            tempToken
        });
    });
});

//module.exports = router;
