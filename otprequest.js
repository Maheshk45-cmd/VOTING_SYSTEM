// // const express = require("express");
// // const app = express();
// // const db = require("./db");
// // const crypto = require("crypto");
// // const bcrypt = require("bcrypt");
// // app.use(express.json());
// // function generateotp() {
// //     return crypto.randomInt(100000, 1000000).toString();
// // }
// // app.post("/otp-req", (req, res) => {

// //     const { prn_id } = req.body;
// //     if (!prn_id) {
// //         return res.status(400).json({ message: "OTP SEND IF PRN EXISTS" });
// //     }
// //     // query for whether prn is valid or not if yes then get the email
// //     const query_email = `SELECT email FROM ELIGIBLE_STUDENT WHERE prn_id=?`;
// //     db.query(query_email, [prn_id], async (errr, results) => {
// //         if (errr) {
// //             return res.status(500).json({ message: "DATABASE ERROR" });
// //         }
// //         if (results.length === 0) {
// //             return res.status(404).json({ message: "INVALID PRN" });
// //         }
// //         // now we have the email
// //         // currently now implementing the email API
// //         const query_otpattempt = `SELECT expiresAt,attempt FROM OTP_VERIFICATION WHERE prn_id=?`;
// //         db.query(query_otpattempt, [prn_id], async (err, result) => {
// //             if (err) {
// //                 return res.status(500).json({ message: "DATABASE ERROR" });
// //             }
// //             if (result.length > 0) {
// //                 const expiresAt = result[0].expiresAt;
// //                 const current = Date.now();
// //                 if (new Date(expiresAt) > new Date()) {
// //                     return res.status(409).json({ message: "PREVIOUS OTP STILL VALID" });
// //                 }
// //             }
// //             const attempts = result[0].attempt;

// //             if (attempts >= 3) {
// //                 return res.status(401).json({ message: "GO TO HOME AND TRY AFTER 12 HOUR" });
// //             }

// //             const off_email = results[0].email;
// //             const otp = generateotp();
// //             const hashedotp = await bcrypt.hash(otp, 10);
// //             const expiresAt = new Date(Date.now() + 120 * 1000);
// //             // query to store the generated otp with time and attempt
// //             const query_otp = `INSERT INTO OTP_VERIFICATION(prn_id,otp,expiresAt)
// //         VALUES(?,?,?)
// //         ON DUPLICATE KEY UPDATE
// //         otp=VALUES(otp),
// //         expiresAt=VALUES(expiresAt),
// //         attempt=0`;
// //             db.query(query_otp, [prn_id, hashedotp, expiresAt], (err, results) => {
// //                 if (err) {
// //                     return res.status(500).json({ message: "OTP FAILED :: TRY AGAIN 😒" });
// //                 }
// //                 console.log("OTP::", otp);
// //                 const nexttime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

// //                 if (attempts === 3) {

// //                     const query_block = `
// //         UPDATE OTP_VERIFICATION
// //         SET blockedUntil = ?
// //         WHERE prn_id = ?
// //     `;

// //                     db.query(query_block, [nexttime, prn_id], (err) => {
// //                         if (err) {
// //                             return res.status(500).json({ message: "BLOCK FAILED" });
// //                         }

// //                         return res.status(403).json({
// //                             message: "YOU ARE BLOCKED FOR 2 HOURS"
// //                         });
// //                     });

// //                     return;
// //                 }
// //                 return res.status(200).json({ message: "OTP HAS BEEN SENT" });
// //             });
// //         });
// //     });
// // });
// const express = require("express");
// const app = express();
// const db = require("./db");
// const crypto = require("crypto");
// const bcrypt = require("bcrypt");

// app.use(express.json());

// function generateotp() {
//     return crypto.randomInt(100000, 1000000).toString();
// }

// app.post("/otp-req", (req, res) => {

//     const { prn_id } = req.body;

//     if (!prn_id) {
//         return res.status(400).json({
//             message: "PRN required"
//         });
//     }

//     const query_email =
//         `SELECT email FROM ELIGIBLE_STUDENT WHERE prn_id=?`;

//     db.query(query_email, [prn_id], (err, results) => {

//         if (err)
//             return res.status(500).json({ message: "DATABASE ERROR" });

//         if (results.length === 0)
//             return res.status(404).json({ message: "INVALID PRN" });

//         const check_query =
//             `SELECT expiresAt, attempt, blockedUntil
//              FROM OTP_VERIFICATION
//              WHERE prn_id=?`;

//         db.query(check_query, [prn_id], async (err2, record) => {

//             if (err2)
//                 return res.status(500).json({ message: "DATABASE ERROR" });

//             // 🔥 If record exists
//             if (record.length > 0) {

//                 const {
//                     expiresAt,
//                     attempt,
//                     blockedUntil
//                 } = record[0];

//                 const now = new Date();

//                 // 🔴 Check Block
//                 if (blockedUntil &&
//                     new Date(blockedUntil) > now) {

//                     return res.status(403).json({
//                         message:
//                             "ACCOUNT BLOCKED UNTIL " + blockedUntil
//                     });
//                 }

//                 // 🟡 Check if previous OTP still valid
//                 if (expiresAt &&
//                     new Date(expiresAt) > now) {

//                     return res.status(409).json({
//                         message:
//                             "PREVIOUS OTP STILL VALID"
//                     });
//                 }

//                 // 🔴 If attempts already >=3 (extra safety)
//                 if (attempt === 3 && blockeduntil === NULL) {

//                     const blockTime =
//                         new Date(Date.now() +
//                             2 * 60 * 60 * 1000); // 2 hours

//                     const block_query =
//                         `UPDATE OTP_VERIFICATION
//                          SET blockedUntil=?, attempt=0
//                          WHERE prn_id=?`;

//                     db.query(block_query,
//                         [blockTime, prn_id]);

//                     return res.status(403).json({
//                         message:
//                             "BLOCKED FOR 2 HOURS"

//                     });
//                     return;
//                 }
//             }

//             // ✅ Generate New OTP
//             const otp = generateotp();
//             const hashedOtp =
//                 await bcrypt.hash(otp, 10);

//             const newExpiry =
//                 new Date(Date.now() +
//                     2 * 60 * 1000); // 2 minutes

//             const insert_query = `
//                 INSERT INTO OTP_VERIFICATION
//                 (prn_id, otp, expiresAt, attempt, blockedUntil)
//                 VALUES (?, ?, ?, 0, NULL)
//                 ON DUPLICATE KEY UPDATE
//                     otp = VALUES(otp),
//                     expiresAt = VALUES(expiresAt)
//             `;

//             db.query(insert_query,
//                 [prn_id, hashedOtp, newExpiry],
//                 (err3) => {

//                     if (err3)
//                         return res.status(500).json({
//                             message: "OTP FAILED"
//                         });

//                     console.log("OTP (Testing):", otp);

//                     return res.status(200).json({
//                         message: "OTP SENT"
//                     });
//                 });
//         });
//     });
// });
app.post("/otp-req", (req, res) => {

    const { prn_id } = req.body;

    if (!prn_id)
        return res.status(400).json({ message: "PRN required" });

    const query_email =
        `SELECT email FROM ELIGIBLE_STUDENT WHERE prn_id=?`;

    db.query(query_email, [prn_id], (err, results) => {

        if (err)
            return res.status(500).json({ message: "DATABASE ERROR" });

        if (results.length === 0)
            return res.status(404).json({ message: "INVALID PRN" });

        const check_query =
            `SELECT expiresAt, blockedUntil
             FROM OTP_VERIFICATION
             WHERE prn_id=?`;

        db.query(check_query, [prn_id], async (err2, record) => {

            if (err2)
                return res.status(500).json({ message: "DATABASE ERROR" });

            if (record.length > 0) {

                const { expiresAt, blockedUntil } = record[0];
                const now = new Date();

                // 🔴 Block Check
                if (blockedUntil &&
                    new Date(blockedUntil) > now) {

                    return res.status(403).json({
                        message:
                            "ACCOUNT BLOCKED UNTIL " + blockedUntil
                    });
                }

                // 🟡 OTP Still Valid
                if (expiresAt &&
                    new Date(expiresAt) > now) {

                    return res.status(409).json({
                        message:
                            "PREVIOUS OTP STILL VALID"
                    });
                }
            }

            // ✅ Generate OTP
            const otp = generateotp();
            const hashedOtp = await bcrypt.hash(otp, 10);

            const newExpiry =
                new Date(Date.now() + 2 * 60 * 1000);

            const insert_query = `
                INSERT INTO OTP_VERIFICATION
                (prn_id, otp, expiresAt, attempt, blockedUntil)
                VALUES (?, ?, ?, 0, NULL)
                ON DUPLICATE KEY UPDATE
                    otp = VALUES(otp),
                    expiresAt = VALUES(expiresAt)
            `;

            db.query(insert_query,
                [prn_id, hashedOtp, newExpiry],
                (err3) => {

                    if (err3)
                        return res.status(500).json({
                            message: "OTP FAILED"
                        });

                    console.log("OTP (Testing):", otp);

                    return res.status(200).json({
                        message: "OTP SENT"
                    });
                });
        });
    });
});