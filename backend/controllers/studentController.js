const { query } = require('../db');

// ─── Get Student Profile ──────────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
    const result = await query(
        `SELECT id, roll_no, name, section, year, email, total_percentage, training, counseling
         FROM students WHERE roll_no = $1`,
        [req.user.rollNo]
    );
    if (result.rows.length === 0)
        return res.status(404).json({ message: 'Student not found' });

    const s = result.rows[0];
    res.json({
        rollNo: s.roll_no,
        name: s.name,
        section: s.section,
        year: s.year,
        email: s.email,
        totalPercentage: parseFloat(s.total_percentage) || 0,
        training: s.training,
        counseling: s.counseling,
    });
};

// ─── Get Subject-wise Attendance ──────────────────────────────────────────────
exports.getSubjects = async (req, res) => {
    const studRes = await query(
        'SELECT id FROM students WHERE roll_no = $1',
        [req.user.rollNo]
    );
    if (studRes.rows.length === 0)
        return res.status(404).json({ message: 'Student not found' });

    const studentId = studRes.rows[0].id;
    const subjRes = await query(
        'SELECT subject, attended, total, percentage FROM student_subjects WHERE student_id = $1',
        [studentId]
    );
    res.json(subjRes.rows.map(r => ({
        subject: r.subject,
        attended: r.attended,
        total: r.total,
        percentage: parseFloat(r.percentage) || 0,
    })));
};

// ─── Get Attendance History ───────────────────────────────────────────────────
exports.getHistory = async (req, res) => {
    const result = await query(
        `SELECT id, roll_no, name, section, year, upload_date, total_percentage, training, counseling
         FROM attendance_records
         WHERE roll_no = $1
         ORDER BY upload_date DESC
         LIMIT 60`,
        [req.user.rollNo]
    );

    const records = await Promise.all(result.rows.map(async (r) => {
        const subjRes = await query(
            'SELECT subject, attended, total, percentage FROM attendance_subjects WHERE attendance_id = $1',
            [r.id]
        );
        return {
            _id: r.id,
            rollNo: r.roll_no,
            name: r.name,
            section: r.section,
            year: r.year,
            uploadDate: r.upload_date,
            totalPercentage: parseFloat(r.total_percentage) || 0,
            training: r.training,
            counseling: r.counseling,
            subjects: subjRes.rows.map(s => ({
                subject: s.subject,
                attended: s.attended,
                total: s.total,
                percentage: parseFloat(s.percentage) || 0,
            })),
        };
    }));

    res.json(records);
};

// ─── Section Mates for Student ────────────────────────────────────────────────
exports.getSectionMates = async (req, res) => {
    const studRes = await query(
        'SELECT section, year FROM students WHERE roll_no = $1',
        [req.user.rollNo]
    );
    if (studRes.rows.length === 0)
        return res.status(404).json({ message: 'Student not found' });

    const { section, year } = studRes.rows[0];
    const matesRes = await query(
        `SELECT roll_no, name, total_percentage FROM students
         WHERE year = $1 ORDER BY total_percentage DESC`,
        [year]
    );
    res.json(matesRes.rows.map(r => ({
        rollNo: r.roll_no,
        name: r.name,
        totalPercentage: parseFloat(r.total_percentage) || 0,
    })));
};
