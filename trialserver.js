const express = require("express");
const app = express();
const db = require("./db");
app.use(express.json());

const crypto = require("crypto");
function generateotp() {
    return crypto.randomInt(100000, 1000000).toString();
}

app.get("/", (req, res) => {
    res.send("Ghost from Backend");
});
app.post("/register", async (req, res) => {
    const { prn_id } = req.body;
    if (!prn_id) {
        return res.status(400).json({ message: "Enter PRN number" });
    }
    // check the student is eligible or not
    const query_prn = `SELECT email FROM ELIGIBLE_STUDENT WHERE prn=?`;
    db.query(query_prn, [prn_id], (err, results) => {
        if (err) {
            return res.status(400).json({ message: "Database error" });
        }
        if (results === 0) {
            return res.status(401), json({ message: "INVALID PRN" });
        }
        // now email exists
        const off_email = results[0].email;
        const otp = generateotp();
        const expiresAt = new Date(Date.now() + 120 * 1000);
        const attempt = 0;
        // const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const query_otp = `INSERT INTO OTP_VERIFICATION (prn_id,otp,expiresAt)
        VALUES(?,?,?)
        ON DUPLICATE KEY UPDATE
        otp=VALUES(otp),
        expiresAt=VALUES(expiresAt),
        attempt=0
        `;
        db.query(query_otp, [prn_id, otp, expireAt], (err) => {
            if (err) {
                return res.status(500).json({ message: "OTP Failed :: PLEASE TRY AgAIN" });
            }
            console.log("OTP:", otp);
            return res.json({ message: "OTP BHEJ DIYA HAI BHAIII" });
        });

    });
    
});
