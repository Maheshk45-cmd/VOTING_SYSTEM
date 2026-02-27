const express = require("express");
const app = express();
const db = require("./db");
const jwt = require("jsonwebtoken");
app.use(express.json());
const bcrypt = require("bcrypt");
require("dotenv").config();
function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
        return res.status(403).json({ message: "Token required" });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Token required" });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({ message: "Not applicable retry" });
    }
}
app.put("/withdrawal/:id/respond", authenticateToken, (req, res) => {

    const nomination_id = req.params.id;
    const student_id = req.user.student_id;

    // 1️⃣ Get nomination + election phase
    const query = `
        SELECT n.status, n.student_id, e.phase
        FROM NOMINATION n
        JOIN ELECTION e ON n.election_id = e.e_id
        WHERE n.nomination_id = ?
    `;

    db.query(query, [nomination_id], (err, results) => {

        if (err)
            return res.status(500).json({ message: "Database error" });

        if (results.length === 0)
            return res.status(404).json({ message: "Nomination not found" });

        const nomination = results[0];

        // 2️⃣ Check phase
        if (nomination.phase !== "WITHDRAWAL") {
            return res.status(403).json({
                message: "Withdrawal phase not active"
            });
        }

        // 3️⃣ Check ownership
        if (nomination.student_id !== student_id) {
            return res.status(403).json({
                message: "You can withdraw only your own nomination"
            });
        }

        // 4️⃣ Check status
        if (nomination.status !== "ADMIN_APPROVED") {
            return res.status(400).json({
                message: "Only approved nominations can be withdrawn"
            });
        }

        // 5️⃣ Update status
        const updateQuery = `
            UPDATE NOMINATION
            SET status = 'WITHDRAWN'
            WHERE nomination_id = ?
        `;

        db.query(updateQuery, [nomination_id], (err2) => {

            if (err2)
                return res.status(500).json({ message: "Update failed" });

            return res.status(200).json({
                message: "Nomination withdrawn successfully"
            });
        });

    });
});