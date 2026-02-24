const express = require("express");
const app = express();
const db = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookie = require("cookie-parser");
app.use(express.json());
app.use(cookie());

app.post("/update_status", authenticateToken, (req, res) => {

    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin only action" });
    }

    const { e_id, status } = req.body;

    if (!e_id || !status) {
        return res.status(400).json({ message: "Enter valid details" });
    }

    const validPhases = [
        "NOMINATION",
        "WITHDRAWAL",
        "VOTING",
        "RESULT",
        "CLOSED"
    ];

    if (!validPhases.includes(status)) {
        return res.status(400).json({ message: "Invalid phase" });
    }

    const query = `
        UPDATE ELECTION
        SET phase = ?
        WHERE e_id = ?
    `;

    db.query(query, [status, e_id], (err, result) => {

        if (err) {
            return res.status(500).json({ message: "DATABASE ERROR" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Election not found" });
        }
        if (status !== "NOMINATION") {

            const autoReject = `
                UPDATE NOMINATION
                SET status = 'ADMIN_REJECTED'
                WHERE election_id = ?
                AND status IN ('PENDING','STUDENT_ACCEPTED')
            `;

            db.query(autoReject, [e_id]);
        }

        return res.json({ message: "Phase updated successfully" });

    });

});