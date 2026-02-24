// const express = require("express");
// const db = require("./db");   
// const bcrypt = require("bcrypt");
// const app = express();
// app.use(express.json());

// app.get("/", (req, res) => {
//     res.send("Backend Running");
// });

// app.post("/login", async (req, res) => {

//     const { email, password } = req.body;

//     // 1️⃣ Basic validation
//     if (!email || !password) {
//         return res.status(400).json({ message: "Email and password are required" });
//     }

//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//         return res.status(400).json({ message: "Invalid email format" });
//     }


//     const query = "SELECT * FROM student WHERE email = ?";

//     db.query(query, [email], async (err, results) => {

//         if (err) {
//             return res.status(500).json({ message: "Database error" });
//         }
//         if (results.length === 0) {
//             return res.status(401).json({ message: "Invalid email or password" });
//         }
//         const user = results[0];
//         const isMatch = await bcrypt.compare(password, user.password);
//         if (!isMatch) {
//             return res.status(401).json({ message: "Invalid email or password" });
//         }
//         return res.status(200).json({
//             message: "Login successful",
//             student_id: user.student_id
//         });
//     });
// });
// app.post("/register", async(req, res) => {
// try{

//     const { student_name, roll_no, branch, dob, email, password } = req.body;


//     if (!student_name || !roll_no || !branch || !email || !password) {
//         return res.status(400).json({ message: "All required fields must be provided" });
//     }
//     if (password.length < 6) {
//         return res.status(400).json({ message: "Password must be at least 6 characters" });
//     }

//     const pass = await bcrypt.hash(password, 10);
//     const query = `
//         INSERT INTO student 
//         (student_name, roll_no, branch, dob, email, password)
//         VALUES (?, ?, ?, ?, ?, ?)
//     `;

//     db.query(
//         query,
//         [student_name, roll_no, branch, dob, email, pass],
//         (err, result) => {

//             if (err) {

//                 // Duplicate email or roll_no
//                 if (err.code === "ER_DUP_ENTRY") {
//                     return res.status(409).json({
//                         message: "Email or Roll Number already exists"
//                     });
//                 }

//                 return res.status(500).json({
//                     message: "Database error",
//                     error: err.message
//                 });
//             }
//             return res.status(201).json({
//                 message: "Student registered successfully",
//                 student_id: result.insertId
//             });
//         }

//     );
// }
// catch (error) {
//     return res.status(500).json({ message: "Hashing failed" });
// }
// });

// app.listen(3000, () => {
//     console.log("Server running on port 3000");
// });
// // const express = require("express");
// // const db = require("./db");
// // const app = express();
// // app.use(express.json);

// // app.get("/", (req, res) => {
// //     res.send("Listening from backend");
// // });
// // app.post("/test", (req, res) => {
// //     const { student_name, roll_no, branch, dob, email, password } = req.body;
// //     if (!student_name || !roll_no || !branch || !dob || !email || !password) {
// //         return res.response(401).json({ message: "missing data field" });
// //     }
// //     if (password.length() < 6) {
// //         return res.response(401).json({ message: "Password is short" });
// //     }
// //     const query = `
// //         INSERT INTO student
// //          (student_name, roll_no, branch, dob, email, password)
// //          VALUES(?,?,?,?,?,?)
// //     `;
// //     db.query(
// //         query,
// //         [student_name, roll_no, branch, dob, email, password],
// //         (err,result)=>{
// //             if(err){
// //                 if(err==="ERR_DUP_ENTRY"){
// //                     res.status()
// //                 }
// //             }
// //         }
// //     )



// // });
// // app.listen(3000, () => {
// //     console.log("Listening on port 3000");
// // }); 
const express = require("express");
const db = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Backend Running");
});

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
function verifyTempToken(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded.otpVerified) {
            return res.status(403).json({ message: "OTP not verified" });
        }

        req.prn_id = decoded.prn_id;
        next();

    } catch (err) {
        return res.status(403).json({ message: "Invalid or expired token" });
    }
}


// Register 
app.post("/register", verifyTempToken, async (req, res) => {

    try {
        const { student_name, roll_no, branch, dob, email, password } = req.body;


        if (!student_name || !roll_no || !branch || !email || !password) {
            return res.status(400).json({ message: "All required fields must be provided" });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = `
            INSERT INTO STUDENT
            (student_name, roll_no, branch, dob, email, password)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.query(
            query,
            [student_name, roll_no, branch, dob, email, hashedPassword],
            (err, result) => {

                if (err) {
                    if (err.code === "ER_DUP_ENTRY") {
                        return res.status(409).json({
                            message: "Email or Roll Number already exists"
                        });
                    }

                    return res.status(500).json({
                        message: "Database error"
                    });
                }

                return res.status(201).json({
                    message: "Student registered successfully",
                    student_id: result.insertId
                });
            }
        );

    } catch (error) {
        return res.status(500).json({ message: "Hashing failed" });
    }
});

app.post("/login", async (req, res) => {

    const { email, password } = req.body;


    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    const query = "SELECT * FROM student WHERE email = ?";

    db.query(query, [email], async (err, results) => {

        if (err) {
            return res.status(500).json({ message: "Database error" });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const user = results[0];

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }


        const token = jwt.sign(
            { student_id: user.student_id },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        return res.status(200).json({
            message: "Login successful",
            token: token
        });
    });
});

app.post("/vote", authenticateToken, (req, res) => {

    const student_id = req.user.student_id;  // From token
    const { candidate_id } = req.body;

    if (!candidate_id) {
        return res.status(400).json({ message: "Candidate ID required" });
    }
    const query = `SELECT is_eligible FROM student WHERE student_id=? `;
    db.query(query, [studend_id], async (err, results) => {
        if (err) {

            return res.status(400).json({ message: "DB error" });
            return

        }
        if (!is_eligible) {
            return res.status(403).json({ message: "You are not allowed to vote" });
        }


    })

    // Now continue voting logic here
    return res.json({
        message: "Token verified. You can vote.",
        student_id: student_id
    });
});
app.listen(3000, () => {
    console.log("Server running on port 3000");
});
