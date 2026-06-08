const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../db');

async function fixPercentages() {
    console.log('Starting migration to recalculate and fix student overall percentages...');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Recalculate overall percentage using the true ratio of total slots attended to total slots conducted
        const updateRes = await client.query(`
            UPDATE students s
            SET total_percentage = COALESCE((
                SELECT ROUND((SUM(asub.attended)::numeric / NULLIF(SUM(asub.total), 0)::numeric) * 100, 2)
                FROM attendance_records ar
                JOIN attendance_subjects asub ON asub.attendance_id = ar.id
                WHERE ar.roll_no = s.roll_no
            ), 0)
        `);

        console.log(`Successfully recalculated and updated overall percentage for ${updateRes.rowCount} students.`);

        await client.query('COMMIT');
        console.log('✅ Migration committed successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed, rolled back changes:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

fixPercentages();
