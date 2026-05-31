/**
 * Seed Script — Parses output.json and populates MongoDB
 * Usage: node scripts/seed.js [section] [filepath]
 * Example: node scripts/seed.js CSE-A ../output.json
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Upload = require('../models/Upload');

const SECTION = process.argv[2] || 'CSE-A';
const JSON_PATH = process.argv[3] || path.join(__dirname, '../../output.json');
const SKIP_KEYS = ['SL', 'REGD.NO', 'NAME', 'TOTAL %', 'TRg', 'Counseling', 'library'];

const parseSubjectValue = (val) => {
    if (!val || val === '-') return null;
    // Updated to handle both "37(90.24%)" and "37(41)(90.24%)"
    const match = String(val).match(/^(\d+)(?:\((\d+)\))?\((\d+\.?\d*)%\)$/);
    if (!match) return null;
    return {
        attended: parseInt(match[1]),
        total: match[2] ? parseInt(match[2]) : null,
        percentage: parseFloat(match[3])
    };
};

const parseRecord = (record, conductedHours) => {
    const subjects = [];
    for (const [key, val] of Object.entries(record)) {
        if (SKIP_KEYS.includes(key)) continue;
        const parsed = parseSubjectValue(val);
        if (!parsed) continue;
        const rawTotalHeader = conductedHours[key];
        const totalHeader = rawTotalHeader && rawTotalHeader !== '-' ? parseInt(rawTotalHeader) : 0;
        // Prioritize: 1. Total in parentheses from cell, 2. Total from conductedHours header, 3. Attended count
        const total = parsed.total || totalHeader || parsed.attended;
        subjects.push({ subject: key, attended: parsed.attended, total, percentage: parsed.percentage });
    }
    return subjects;
};

async function seed() {
    console.log(`\n🌱 Seeding from: ${JSON_PATH}`);
    console.log(`📚 Section: ${SECTION}\n`);

    if (!fs.existsSync(JSON_PATH)) {
        console.error(`❌ File not found: ${JSON_PATH}`);
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    const raw = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
    const conductedHours = raw[0] || {}; // First row = header with conducted hours
    const studentRecords = raw.filter((r) => typeof r['REGD.NO'] === 'string');

    console.log(`📊 Found ${studentRecords.length} student records\n`);

    const uploadDate = process.argv[4] ? new Date(process.argv[4]) : new Date();
    uploadDate.setHours(0, 0, 0, 0);

    const uploadDoc = await Upload.create({
        filename: path.basename(JSON_PATH),
        section: SECTION,
        uploadDate,
        recordCount: studentRecords.length,
        uploadedBy: 'seed-script',
    });

    let created = 0, updated = 0, errors = 0;

    for (const record of studentRecords) {
        try {
            const rollNo = String(record['REGD.NO']).toUpperCase().trim();
            const name = String(record['NAME']).trim();
            const subjects = parseRecord(record, conductedHours);
            const totalPercentage = parseFloat(record['TOTAL %']) || 0;
            const training = record['TRg'] || '-';
            const counseling = record['Counseling'] || '-';

            const existing = await Student.findOne({ rollNo });
            if (!existing) {
                // Pass plain rollNo as password — pre-save hook will hash it exactly once
                await Student.create({
                    rollNo,
                    name,
                    section: SECTION,
                    password: rollNo,
                    subjects,
                    totalPercentage,
                    training,
                    counseling,
                });
                created++;
            } else {
                // Only update non-password fields; keep existing password intact
                await Student.updateOne({ rollNo }, {
                    name, section: SECTION, subjects, totalPercentage, training, counseling
                });
                updated++;
            }

            await Attendance.findOneAndUpdate(
                { rollNo, uploadDate },
                { rollNo, name, section: SECTION, uploadDate, subjects, totalPercentage, training, counseling, uploadBatch: uploadDoc._id.toString() },
                { upsert: true }
            );

            process.stdout.write(`\r  ✅ Processed ${created + updated} / ${studentRecords.length}`);
        } catch (err) {
            console.error(`\n  ❌ Error for ${record['REGD.NO']}: ${err.message}`);
            errors++;
        }
    }

    console.log(`\n\n🎉 Seeding complete!`);
    console.log(`   Created : ${created}`);
    console.log(`   Updated : ${updated}`);
    console.log(`   Errors  : ${errors}`);
    console.log(`   Section : ${SECTION}\n`);

    await mongoose.disconnect();
    process.exit(0);
}

seed().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
