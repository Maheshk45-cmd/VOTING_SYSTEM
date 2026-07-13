
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
