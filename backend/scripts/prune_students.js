const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const xlsx = require('xlsx');
const { query, pool } = require('../db');
const fs = require('fs');

async function prune() {
    try {
        console.log('=== Student Database Pruning Script ===');

        // 1. Read Excel Sheet
        let excelPath = path.join(__dirname, '../../asses.xlsx');
        if (!fs.existsSync(excelPath)) {
            excelPath = 'c:/Users/banda/Desktop/attend/asses.xlsx';
        }
        console.log(`Reading Excel file: ${excelPath}`);
        const workbook = xlsx.readFile(excelPath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        const excelRolls = new Set(
            data.map(row => String(row['Roll Number'] || '').trim().toUpperCase()).filter(Boolean)
        );
        console.log(`Found ${excelRolls.size} unique roll numbers in Excel file.`);

        // 2. Fetch all students from DB
        const studentsRes = await query('SELECT id, roll_no, name FROM students');
        const students = studentsRes.rows;
        console.log(`Found ${students.length} total students in the database.`);

        const toDeleteIds = [];
        const toDeleteRolls = [];
        let preservedCount = 0; // Starts with 24 or above
        let keepCount = 0; // Starts with <= 23 and in Excel

        for (const student of students) {
            const roll = student.roll_no.trim();
            const rollUpper = roll.toUpperCase();
            
            // Extract the first 2 characters as prefix number
            const prefixStr = roll.substring(0, 2);
            const prefixNum = parseInt(prefixStr, 10);

            if (isNaN(prefixNum)) {
                // Preserved if not a valid year prefix
                preservedCount++;
                continue;
            }

            if (prefixNum >= 24) {
                // 24 or above must not be deleted
                preservedCount++;
                continue;
            }

            // At this point, prefixNum <= 23
            if (excelRolls.has(rollUpper)) {
                keepCount++;
            } else {
                toDeleteIds.push(student.id);
                toDeleteRolls.push(student.roll_no);
            }
        }

        console.log('\n--- Pruning Summary ---');
        console.log(`Students starting with 24 or above (Preserved): ${preservedCount}`);
        console.log(`Students starting with 23 or below (Kept - in Excel): ${keepCount}`);
        console.log(`Students starting with 23 or below (To Delete - not in Excel): ${toDeleteIds.length}`);

        if (toDeleteIds.length > 0) {
            console.log(`\nDeleting ${toDeleteIds.length} students and their attendance records...`);
            
            // Deleting attendance records (cascades to attendance_subjects)
            // Use chunks of 100 to prevent query parameter limits
            const chunkSize = 100;
            for (let i = 0; i < toDeleteRolls.length; i += chunkSize) {
                const chunk = toDeleteRolls.slice(i, i + chunkSize);
                await query('DELETE FROM attendance_records WHERE roll_no = ANY($1::varchar[])', [chunk]);
            }
            console.log('✓ Attendance records deleted.');

            // Deleting students (cascades to student_subjects and student_assessments)
            for (let i = 0; i < toDeleteIds.length; i += chunkSize) {
                const chunk = toDeleteIds.slice(i, i + chunkSize);
                await query('DELETE FROM students WHERE id = ANY($1::int[])', [chunk]);
            }
            console.log('✓ Student profile records deleted.');
            console.log('✅ Pruning complete.');
        } else {
            console.log('\nNo students found matching deletion criteria.');
        }

    } catch (err) {
        console.error('Error during pruning:', err.message);
    } finally {
        await pool.end();
    }
}

prune();
