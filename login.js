// // when user login once we verify then send him token in cookies
// const express = require("express");
// const app = express();
// const db = require("./db");
// const jwt = require("jsonwebtoken");
// app.use(express.json());
// const cookie = require("cookie-parser");
// const bcrypt = require("bcrypt");
// app.use(cookie());
// // not telling what is wrong to secure fronm hacker
// app.post("/login", (req, res) => {
//     const { prn_id, password } = req.body;
//     if (!prn_id || !password) {
//         return res.status(400).json({ message: "Enter the complete details" });
//     }
//     if (password.length < 6) {
//         return res.status(400).json({ message: "Enter valid Details" });
//     }
//    // const passwor = await bcrypt.hash(password, 10);
//     // check first prn exists or not
//     const query_prn = `SELECT student_id,password FROM STUDENT WHERE prn_id=? LIMIT 1`;
//     db.query(query_prn, [prn_id], async (err, results) => {
//         if (err) {
//             return res.status(500).json({ message: "DATABASE ERROR" });
//         }
//         if (results.length === 0) {
//             return res.status(401).json({ message: "Enter valid details" });
//         }
//         const pass = results[0].password;
//         const isMatch = await bcrypt.compare(password, pass);

//         if (!isMatch) {
//             return res.status(401).json({ message: "Enter valid details" });
//         }
//         const token = jwt.sign(
//             { student_id: user.student_id },
//             process.env.JWT_SECRET,
//             { expiresIn: "1h" }
//         );
//         res.cookie("token", token, {
//             httpOnly: true,
//             secure: false,      // true in production (HTTPS)
//             sameSite: "strict",
//             maxAge: 60 * 60 * 1000
//         });
//         // let token =
//         return res.status(200).json({ message: "Login successfully" });
//     })
// })
const express = require("express");
const app = express();
const db = require("./db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");

require("dotenv").config();

app.use(express.json());
app.use(cookieParser());

app.post("/login", (req, res) => {

    const { prn_id, password } = req.body;

    if (!prn_id || !password) {
        return res.status(400).json({
            message: "PRN and password required"
        });
    }

    const query = `
        SELECT student_id, password
        FROM STUDENT
        WHERE prn_id = ?
        LIMIT 1
    `;

    db.query(query, [prn_id], async (err, results) => {

        if (err)
            return res.status(500).json({ message: "Database error" });

        if (results.length === 0)
            return res.status(401).json({ message: "Invalid credentials" });

        const user = results[0];

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch)
            return res.status(401).json({ message: "Invalid credentials" });

        const token = jwt.sign(
            {
                student_id: user.student_id,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: false, // true in production
            sameSite: "strict",
            maxAge: 60 * 60 * 1000
        });

        return res.status(200).json({
            message: "Login successful"
        });

    });
});