const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../db');

async function inspect() {
    try {
        const rollNo = '231FA04222';
        console.log(`=== Inspecting student: ${rollNo} ===`);
        
        // 1. Get student basic info
        const studentRes = await pool.query('SELECT id, roll_no, name, total_percentage FROM students WHERE roll_no = $1', [rollNo]);
        if (studentRes.rows.length === 0) {
            console.log('Student not found in database.');
            return;
        }
        console.log('Student Info:', studentRes.rows[0]);

        // 2. Get subject-wise aggregates
        const studentId = studentRes.rows[0].id;
        const subjectsRes = await pool.query('SELECT * FROM student_subjects WHERE student_id = $1', [studentId]);
        console.log('Student Subjects (aggregated):', subjectsRes.rows);

        // 3. Get detailed daily attendance records
        const recordsRes = await pool.query(`
            SELECT id, upload_date, total_percentage 
            FROM attendance_records 
            WHERE roll_no = $1 
            ORDER BY upload_date DESC
        `, [rollNo]);
        console.log(`\nAttendance records count: ${recordsRes.rows.length}`);
        
        const recordIds = recordsRes.rows.map(r => r.id);
        if (recordIds.length > 0) {
            // Get all subjects for these records
            const subRes = await pool.query(`
                SELECT attendance_id, subject, attended, total, percentage
                FROM attendance_subjects
                WHERE attendance_id = ANY($1::int[])
                ORDER BY attendance_id
            `, [recordIds]);
            
            console.log('\nDaily Attendance Details:');
            for (const rec of recordsRes.rows) {
                const subs = subRes.rows.filter(s => s.attendance_id === rec.id);
                console.log(`Date: ${rec.upload_date} | Daily %: ${rec.total_percentage}%`);
                subs.forEach(s => {
                    console.log(`  - ${s.subject}: ${s.attended}/${s.total} (${s.percentage}%)`);
                });
            }
        }

        // 4. Test the recalculation queries
        const avgQueryRes = await pool.query(`
            SELECT ROUND(AVG(total_percentage), 2) AS avg_of_daily
            FROM attendance_records
            WHERE roll_no = $1
        `, [rollNo]);
        console.log(`\nMethod 1 (Current): AVG of daily percentages: ${avgQueryRes.rows[0].avg_of_daily}%`);

        const trueQueryRes = await pool.query(`
            SELECT 
                SUM(asub.attended) as total_attended,
                SUM(asub.total) as total_slots,
                ROUND((SUM(asub.attended)::numeric / NULLIF(SUM(asub.total), 0)::numeric) * 100, 2) AS true_percentage
            FROM attendance_records ar
            JOIN attendance_subjects asub ON asub.attendance_id = ar.id
            WHERE ar.roll_no = $1
        `, [rollNo]);
        console.log(`Method 2 (Proposed): True overall percentage: ${trueQueryRes.rows[0].true_percentage}% (attended: ${trueQueryRes.rows[0].total_attended}, total: ${trueQueryRes.rows[0].total_slots})`);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

inspect();
