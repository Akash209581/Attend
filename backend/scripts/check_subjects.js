const { pool } = require('../db');
require('dotenv').config();

async function checkSubjects() {
    try {
        console.log('--- Unique subjects in student_subjects ---');
        const res1 = await pool.query('SELECT DISTINCT subject FROM student_subjects ORDER BY subject');
        console.log(res1.rows);

        console.log('--- Unique subjects in attendance_subjects ---');
        const res2 = await pool.query('SELECT DISTINCT subject FROM attendance_subjects ORDER BY subject');
        console.log(res2.rows);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkSubjects();
