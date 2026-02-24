    const express = require("express");
    const app = express();
    const db = require("./db");
    app.use(express.json());
    const jwt = require("jsonwebtoken");
    function authenticateToken(req, res, next) {

        const authHeader = req.headers["authorization"];


        if (!authHeader) {
            return res.status(401).json({ message: "Access denied. No token provided." });
        }
        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "Invalid token format." });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;

            next();
        } catch (error) {
            return res.status(401).json({ message: "Invalid or expired token." });
        }
    }

    app.put("/nomination/:id/respond", authenticateToken, (req, res) => {
// params->:id
        const nomination_id = req.params.id;
        const prn_id = req.prn_id;
        const { action } = req.body;

        if (!action || !["accept", "reject"].includes(action)) {
            return res.status(400).json({
                message: "Action must be 'accept' or 'reject'"
            });
        }

        // 1️⃣ Get nomination with election phase
        const query = `
            SELECT n.prn_id, n.status, e.phase
            FROM NOMINATION n
            JOIN ELECTION e ON n.e_id = e.e_id
            WHERE n.nomination_id = ?
        `;

        db.query(query, [nomination_id], (err, results) => {

            if (err)
                return res.status(500).json({ message: "Database error" });

            if (results.length === 0)
                return res.status(404).json({ message: "Nomination not found" });

            const nomination = results[0];

            // 2️⃣ Check nomination belongs to this student
            if (nomination.prn_id !== prn_id) {
                return res.status(403).json({
                    message: "You can only respond to your own nomination"
                });
            }

            // 3️⃣ Check election phase
            if (nomination.phase !== "NOMINATION") {
                return res.status(403).json({
                    message: "Cannot respond outside nomination phase"
                });
            }

            // 4️⃣ Check current status
            if (nomination.status !== "PENDING") {
                return res.status(409).json({
                    message: "Nomination already processed"
                });
            }

            // 5️⃣ Determine new status
            const newStatus =
                action === "accept"
                    ? "STUDENT_ACCEPTED"
                    : "STUDENT_REJECTED";

            // 6️⃣ Update status
            db.query(
                `UPDATE NOMINATION SET status=? WHERE nomination_id=?`,
                [newStatus, nomination_id],
                (err2) => {

                    if (err2)
                        return res.status(500).json({
                            message: "Update failed"
                        });

                    return res.status(200).json({
                        message: `Nomination ${action}ed successfully`
                    });
                }
            );

        });

    });