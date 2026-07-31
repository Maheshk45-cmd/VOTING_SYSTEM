const express = require("express");
const app = express();
app.use(express.json());
const jwt = require("jsonwebtoken");
function authenticateToken(req, res, next) {
    const authHeader = req.headers("authorization");
    if (!authHeader) {
        return res.status(403).json({ message: "Header required" });
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
        return res.status(500).json({ message: "error" });
    }
}
app.put("/admin/election/:e_id/start-revote", authenticateToken, (req, res) => {

    const e_id = req.params.e_id;

    // Check if tie exists in round 1
    db.query(
        `SELECT position_id
         FROM RE_ELECTION_CANDIDATES
         WHERE election_id=? AND round_no=2`,
        [e_id],
        (err, result) => {

            if (err)
                return res.status(500).json({ message: "Database Error" });

            if (result.length === 0)
                return res.status(400).json({ message: "No re-election required" });

            // Update election phase
            db.query(
                `UPDATE ELECTION SET phase='VOTING' WHERE e_id=?`,
                [e_id]
            );

            return res.json({ message: "Re-election started successfully" });
        }
    );
});
