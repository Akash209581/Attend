const { pool } = require('../db');
require('dotenv').config();

async function inspect() {
    try {
        console.log('--- Students with "Batch" in student_subjects ---');
        const res1 = await pool.query(`
            SELECT s.roll_no, s.name, ss.subject, ss.attended, ss.total 
            FROM students s
            JOIN student_subjects ss ON ss.student_id = s.id
            WHERE ss.subject = 'Batch'
            LIMIT 10
        `);
        console.log(res1.rows);

        console.log('--- Students with "CRT" in student_subjects ---');
        const res2 = await pool.query(`
            SELECT s.roll_no, s.name, ss.subject, ss.attended, ss.total 
            FROM students s
            JOIN student_subjects ss ON ss.student_id = s.id
            WHERE ss.subject = 'CRT'
            LIMIT 10
        `);
        console.log(res2.rows);

        console.log('--- Students with "Batch" who DO NOT have any other subject ---');
        const res3 = await pool.query(`
            SELECT DISTINCT s.roll_no, s.name
            FROM students s
            JOIN student_subjects ss ON ss.student_id = s.id
            WHERE ss.subject = 'Batch'
              AND NOT EXISTS (
                  SELECT 1 FROM student_subjects ss2 
                  WHERE ss2.student_id = s.id AND ss2.subject <> 'Batch' AND ss2.subject IS NOT NULL
              )
            LIMIT 10
        `);
        console.log(res3.rows);

        console.log('--- Students with "CRT" who DO NOT have any other subject ---');
        const res4 = await pool.query(`
            SELECT DISTINCT s.roll_no, s.name
            FROM students s
            JOIN student_subjects ss ON ss.student_id = s.id
            WHERE ss.subject = 'CRT'
              AND NOT EXISTS (
                  SELECT 1 FROM student_subjects ss2 
                  WHERE ss2.student_id = s.id AND ss2.subject <> 'CRT' AND ss2.subject IS NOT NULL
              )
            LIMIT 10
        `);
        console.log(res4.rows);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

inspect();
