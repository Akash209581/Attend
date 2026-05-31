const { pool } = require('./db');
require('dotenv').config();

async function checkDb() {
    try {
        const studentCount = await pool.query('SELECT COUNT(*) as count FROM students');
        console.log('Total students in DB:', studentCount.rows[0].count);
        
        const yearCount = await pool.query('SELECT year, COUNT(*) as count FROM students GROUP BY year ORDER BY year');
        console.log('By year:', yearCount.rows);
        
        const attCount = await pool.query('SELECT COUNT(*) as count FROM attendance_records');
        console.log('Total attendance records:', attCount.rows[0].count);
        
        const uploads = await pool.query('SELECT id, filename, year, upload_date, record_count FROM uploads ORDER BY id');
        console.log('Uploads:', uploads.rows);
        
        // Sample student
        const sample = await pool.query('SELECT roll_no, name, year, total_percentage FROM students ORDER BY id LIMIT 3');
        console.log('Sample students:', sample.rows);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkDb();
