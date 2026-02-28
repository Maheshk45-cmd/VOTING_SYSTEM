app.get("/get_result/:id/respond", (req, res) => {

    const e_id = req.params.id;

    if (!e_id) {
        return res.status(400).json({
            message: "Election ID required"
        });
    }

    const query = `
        SELECT 
            r.position_id,
            r.round_no,
            r.is_tie,
            r.winner_nomination_id,
            n.nomination_id,
            s.student_name,
            COUNT(v.vote_id) AS total_votes
        FROM RESULT r
        JOIN NOMINATION n 
            ON n.position_id = r.position_id
           AND n.election_id = r.election_id
           AND n.status = 'ADMIN_APPROVED'
        JOIN STUDENT s 
            ON s.student_id = n.student_id
        LEFT JOIN VOTE v
            ON v.candidate_nomination_id = n.nomination_id
           AND v.round_no = r.round_no
        WHERE r.election_id = ?
        GROUP BY 
            r.position_id,
            r.round_no,
            r.is_tie,
            r.winner_nomination_id,
            n.nomination_id,
            s.student_name
        ORDER BY r.position_id, r.round_no DESC, total_votes DESC
    `;

    db.query(query, [e_id], (err, result) => {

        if (err)
            return res.status(500).json({ message: "Database Error" });

        if (result.length === 0)
            return res.status(404).json({ message: "No result found" });

        // Structure response properly
        const formatted = {};

        result.forEach(row => {

            const pos = row.position_id;
            const round = row.round_no;

            if (!formatted[pos])
                formatted[pos] = {};

            if (!formatted[pos][round])
                formatted[pos][round] = {
                    is_tie: row.is_tie,
                    winner: row.winner_nomination_id,
                    candidates: []
                };

            formatted[pos][round].candidates.push({
                nomination_id: row.nomination_id,
                name: row.student_name,
                total_votes: row.total_votes
            });
        });

        return res.json({
            election_id: e_id,
            results: formatted
        });
    });
});