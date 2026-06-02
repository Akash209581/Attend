const { query, pool } = require('../db');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const getBatchNumber = (str) => {
    const match = str.match(/\d+/);
    return match ? match[0] : null;
};

async function clean() {
    try {
        console.log('--- Cleaning Duplicate Short Batches from student_subjects ---');
        
        // Fetch all rows
        const res = await query('SELECT id, student_id, subject FROM student_subjects');
        
        // Group by student_id
        const studentMap = {};
        for (const row of res.rows) {
            if (!studentMap[row.student_id]) {
                studentMap[row.student_id] = [];
            }
            studentMap[row.student_id].push(row);
        }

        const toDeleteIds = [];
        let cleanCount = 0;

        for (const studentId in studentMap) {
            const list = studentMap[studentId];
            if (list.length <= 1) continue;

            // Separate short batches (e.g. B9) and long ones (e.g. CSE - Batch - 9)
            const shortBatches = list.filter(r => /^[Bb]\d+$/.test(r.subject.trim()));
            const longBatches = list.filter(r => !/^[Bb]\d+$/.test(r.subject.trim()));

            for (const sb of shortBatches) {
                const sbNum = getBatchNumber(sb.subject);
                if (!sbNum) continue;

                // Check if any long batch contains the same batch number
                const matchingLong = longBatches.find(lb => getBatchNumber(lb.subject) === sbNum);
                if (matchingLong) {
                    toDeleteIds.push(sb.id);
                    console.log(`Student ID ${studentId}: Found duplicate "${sb.subject}" (will delete) because "${matchingLong.subject}" exists.`);
                }
            }
        }

        if (toDeleteIds.length > 0) {
            console.log(`\nDeleting ${toDeleteIds.length} duplicate short batch records...`);
            const chunk = 100;
            for (let i = 0; i < toDeleteIds.length; i += chunk) {
                const ids = toDeleteIds.slice(i, i + chunk);
                await query('DELETE FROM student_subjects WHERE id = ANY($1::int[])', [ids]);
            }
            console.log('✅ Cleanup successful.');
        } else {
            console.log('\nNo duplicate short batch records found.');
        }

    } catch (e) {
        console.error('Error during cleanup:', e.message);
    } finally {
        await pool.end();
    }
}

clean();
