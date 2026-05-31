const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../db');

const generateToken = (payload, expiresIn = '7d') =>
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

// ─── Admin Login ───────────────────────────────────────────────────────────────
exports.adminLogin = async (req, res) => {
    const { username, password } = req.body;
    if (
        username !== process.env.ADMIN_USERNAME ||
        password !== process.env.ADMIN_PASSWORD
    ) {
        return res.status(401).json({ message: 'Invalid admin credentials' });
    }
    const token = generateToken({ role: 'admin', username });
    res.json({ token, role: 'admin', username });
};

// ─── Student Login ─────────────────────────────────────────────────────────────
exports.studentLogin = async (req, res) => {
    const { rollNo, password } = req.body;
    if (!rollNo || !password)
        return res.status(400).json({ message: 'Register number and password are required' });

    const cleanRollNo = rollNo.toUpperCase().trim();
    const result = await query(
        'SELECT id, roll_no, name, section, year, password_hash FROM students WHERE roll_no = $1',
        [cleanRollNo]
    );

    if (result.rows.length === 0)
        return res.status(404).json({ message: 'Student not found' });

    const student = result.rows[0];
    // Allow login if password matches the roll number directly or matches the bcrypt hash
    const isSameAsRoll = password.toUpperCase().trim() === student.roll_no.toUpperCase().trim();
    const match = isSameAsRoll || await bcrypt.compare(password, student.password_hash);
    if (!match)
        return res.status(401).json({ message: 'Invalid credentials' });

    const token = generateToken({ role: 'student', rollNo: student.roll_no, id: student.id });
    res.json({
        token,
        role: 'student',
        rollNo: student.roll_no,
        name: student.name,
        section: student.section,
        year: student.year,
    });
};