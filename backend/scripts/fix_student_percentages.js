const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../db');

async function fixPercentages() {
    console.log('Starting migration to repair database records and recalculate student percentages...');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Step 1: Repair attendance_subjects where total slots is 0 (or null)
        console.log('1. Correcting 0-slot records in attendance_subjects...');
        const fixSubjectsRes = await client.query(`
            UPDATE attendance_subjects asub
            SET total = 3,
                attended = ROUND((COALESCE(ar.total_percentage, 0)::numeric / 100.0) * 3),
                percentage = COALESCE(ar.total_percentage, 0)
            FROM attendance_records ar
            WHERE asub.attendance_id = ar.id
              AND (asub.total = 0 OR asub.total IS NULL)
        `);
        console.log(`   Corrected ${fixSubjectsRes.rowCount} daily subject records where total was 0.`);

        // Step 2: Recalculate and rebuild student_subjects aggregates
        console.log('2. Rebuilding student_subjects table...');
        await client.query('DELETE FROM student_subjects');
        const rebuildSubjectsRes = await client.query(`
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
        console.log(`   Rebuilt ${rebuildSubjectsRes.rowCount} subject aggregate records.`);

        // Step 3: Recalculate and update student overall percentages using slot ratio
        console.log('3. Updating overall student percentages...');
        const updateRes = await client.query(`
            UPDATE students s
            SET total_percentage = COALESCE((
                SELECT ROUND((SUM(asub.attended)::numeric / NULLIF(SUM(asub.total), 0)::numeric) * 100, 2)
                FROM attendance_records ar
                JOIN attendance_subjects asub ON asub.attendance_id = ar.id
                WHERE ar.roll_no = s.roll_no
            ), 0)
        `);
        console.log(`   Successfully recalculated and updated overall percentage for ${updateRes.rowCount} students.`);

        await client.query('COMMIT');
        console.log('✅ Database fix migration committed successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed, rolled back changes:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

fixPercentages();
