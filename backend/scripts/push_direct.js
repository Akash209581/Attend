const { uploadAttendance } = require('../controllers/adminController');
const { pool } = require('../db');
const fs = require('fs');
const path = require('path');

async function run() {
    console.log('🚀 Starting direct data push...');

    const filesToUpload = [
        {
            filePath: path.join(__dirname, '../../CRT Day wise.xlsx'),
            section: 'CRT-3RD',
            year: '3',
            uploadDate: '2026-05-22',
            desc: 'CRT Day wise.xlsx (May 22 - 3rd Year)'
        },
        {
            filePath: path.join(__dirname, '../../4year.xlsx'),
            section: 'CRT-4TH',
            year: '4',
            uploadDate: '2026-05-22',
            desc: '4year.xlsx (May 22 - 4th Year)'
        },
        {
            filePath: path.join(__dirname, '../../23-3rdyear.xlsx'),
            section: 'CRT-3RD',
            year: '3',
            uploadDate: '2026-05-23',
            desc: '23-3rdyear.xlsx (May 23 - 3rd Year)'
        },
        {
            filePath: path.join(__dirname, '../../23-4thyear.xlsx'),
            section: 'CRT-4TH',
            year: '4',
            uploadDate: '2026-05-23',
            desc: '23-4thyear.xlsx (May 23 - 4th Year)'
        }
    ];

    for (const f of filesToUpload) {
        if (fs.existsSync(f.filePath)) {
            console.log(`\n📄 Uploading ${f.desc}...`);
            const req = {
                body: {
                    section: f.section,
                    year: f.year,
                    uploadDate: f.uploadDate
                },
                file: {
                    buffer: fs.readFileSync(f.filePath),
                    originalname: path.basename(f.filePath)
                }
            };
            const res = {
                status: function(code) { this.statusCode = code; return this; },
                json: function(data) { console.log('Result:', data); }
            };
            await uploadAttendance(req, res);
        } else {
            console.error(`❌ File not found at: ${f.filePath}`);
        }
    }

    console.log('\n🏁 Direct data push finished. Closing database pool...');
    await pool.end();
}

run().catch(err => {
    console.error('Fatal error during push:', err);
    process.exit(1);
});
