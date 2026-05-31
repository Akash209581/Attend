require('dotenv').config();
const { pool } = require('../db');

async function checkStudent() {
    try {
        console.log('--- student_subjects for roll_no 231FA04867 ---');
        const studentRes = await pool.query("SELECT id FROM students WHERE roll_no = '231FA04867'");
        if (studentRes.rows.length === 0) {
            console.log('Student not found');
            return;
        }
        const studentId = studentRes.rows[0].id;
        const res1 = await pool.query('SELECT * FROM student_subjects WHERE student_id = $1', [studentId]);
        console.log(res1.rows);

        console.log('--- attendance_records for roll_no 231FA04867 ---');
        const res2 = await pool.query(`
            SELECT upload_date, total_percentage
            FROM attendance_records
            WHERE roll_no = '231FA04867'
            ORDER BY upload_date
        `);
        console.log(res2.rows);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkStudent();
