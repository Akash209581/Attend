const { pool } = require('../db');
require('dotenv').config();

async function testDelete() {
    // Get the latest upload ID to test
    const res = await pool.query('SELECT id, filename FROM uploads ORDER BY id DESC LIMIT 1');
    if (res.rows.length === 0) {
        console.log('No uploads found in DB to test deletion.');
        await pool.end();
        return;
    }
    const uploadId = res.rows[0].id;
    console.log(`Testing deletion of upload ID: ${uploadId} (${res.rows[0].filename})`);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('1. Querying affected students...');
        const affectedRes = await client.query(`
            SELECT DISTINCT s.id, s.roll_no
            FROM students s
            JOIN attendance_records ar ON ar.roll_no = s.roll_no
            WHERE ar.upload_batch_id = $1
        `, [uploadId]);
        console.log(`Found ${affectedRes.rows.length} affected students.`);

        console.log('2. Deleting attendance records...');
        const delAttRes = await client.query('DELETE FROM attendance_records WHERE upload_batch_id = $1', [uploadId]);
        console.log(`Deleted ${delAttRes.rowCount} attendance records.`);

        console.log('3. Deleting upload record...');
        const delUploadRes = await client.query('DELETE FROM uploads WHERE id = $1', [uploadId]);
        console.log(`Deleted ${delUploadRes.rowCount} upload records.`);

        console.log('4. Performing student subjects recalculation test...');
        const studentIds = affectedRes.rows.map(r => r.id);
        if (studentIds.length > 0) {
            const delSubRes = await client.query('DELETE FROM student_subjects WHERE student_id = ANY($1::int[])', [studentIds]);
            console.log(`Deleted ${delSubRes.rowCount} student subjects.`);

            const insSubRes = await client.query(`
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
                WHERE s.id = ANY($1::int[])
                GROUP BY s.id, asub.subject
            `, [studentIds]);
            console.log(`Inserted ${insSubRes.rowCount} student subjects.`);
        }

        console.log('All queries succeeded in the test transaction! Rolling back to keep data intact.');
    } catch (err) {
        console.error('ERROR OCCURRED:', err);
    } finally {
        await client.query('ROLLBACK');
        client.release();
        await pool.end();
    }
}

testDelete();
