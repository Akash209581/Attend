const { pool } = require('../db');
require('dotenv').config();

async function fixBatchDb() {
    console.log('Starting DB migration to fix Batch names...');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('1. Updating attendance_subjects to replace "Batch" with the correct batch name...');
        const updateRes = await client.query(`
            UPDATE attendance_subjects asub
            SET subject = (
                SELECT DISTINCT asub2.subject 
                FROM attendance_subjects asub2
                JOIN attendance_records ar2 ON asub2.attendance_id = ar2.id
                JOIN attendance_records ar ON asub.attendance_id = ar.id
                WHERE ar2.roll_no = ar.roll_no 
                  AND asub2.subject <> 'Batch' 
                  AND asub2.subject IS NOT NULL
                LIMIT 1
            )
            WHERE asub.subject = 'Batch'
        `);
        console.log(`Updated ${updateRes.rowCount} rows in attendance_subjects.`);

        console.log('2. Deleting all records from student_subjects...');
        const deleteRes = await client.query('DELETE FROM student_subjects');
        console.log(`Deleted ${deleteRes.rowCount} rows from student_subjects.`);

        console.log('3. Re-aggregating student_subjects from attendance_subjects...');
        const insertRes = await client.query(`
            INSERT INTO student_subjects (student_id, subject, attended, total, percentage)
            SELECT 
                s.id AS student_id,
                asub.subject,
                SUM(asub.attended) AS attended,
                SUM(asub.total) AS total,
                ROUND((SUM(asub.attended)::numeric / NULLIF(SUM(asub.total), 0)::numeric) * 100, 2) AS percentage
            FROM students s
            JOIN attendance_records ar ON ar.roll_no = s.roll_no
            JOIN attendance_subjects asub ON asub.attendance_id = ar.id
            GROUP BY s.id, asub.subject
        `);
        console.log(`Inserted ${insertRes.rowCount} rows into student_subjects.`);

        await client.query('COMMIT');
        console.log('Successfully committed the migration!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed, rolled back changes:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

fixBatchDb();
