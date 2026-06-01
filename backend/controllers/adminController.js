const { query, getClient } = require('../db');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');

// CRT start date
const CRT_START = new Date('2026-05-22T00:00:00.000Z');

// ─── Helper: parse subject value like "14(70.00%)" or "14(22)(70.00%)" ──────
const parseSubjectValue = (val) => {
    if (!val || val === '-' || val === '') return null;
    const str = String(val).trim();
    // Match: attended(total)(percentage%) OR attended(percentage%)
    const match = str.match(/^(\d+)(?:\((\d+)\))?\((\d+\.?\d*)%\)$/);
    if (!match) return null;
    return {
        attended: parseInt(match[1]),
        total: match[2] ? parseInt(match[2]) : null,
        percentage: parseFloat(match[3])
    };
};

// Keys to skip when parsing subjects
const SKIP_KEYS = ['SL', 'REGD.NO', 'NAME', 'TOTAL %', 'TRg', 'Counseling', 'library', 'sl', 'regd.no', 'name', 'total %', 'trg', 'counseling'];

// ─── Parse CRT Excel buffer into records array ───────────────────────────────
// Format: SL | RegisterNO | Name | BatchName(attended)(pct) | Total %
// Example batch cell: "CSE - Batch - 3(3)(100.00)" → attended=3, total=3, pct=100
const parseBatchCell = (val) => {
    if (!val || val === '-' || String(val).trim() === '') return null;
    const str = String(val).trim();
    // Extract batch name and parse (attended)(total)(percentage) or (attended)(percentage)
    // e.g. "CSE - Batch - 3(3)(100.00)" or "Data Structures(12)(15)(80.00)"
    // Try: word...(num)(num)(num.num) pattern
    const match3 = str.match(/^(.*?)\((\d+)\)\((\d+)\)\((\d+\.?\d*)\)$/);
    if (match3) {
        return {
            batchName: match3[1].trim(),
            attended: parseInt(match3[2]),
            total: parseInt(match3[3]),
            percentage: parseFloat(match3[4])
        };
    }
    // Try: word...(num)(num.num) pattern
    const match2 = str.match(/^(.*?)\((\d+)\)\((\d+\.?\d*)\)$/);
    if (match2) {
        return {
            batchName: match2[1].trim(),
            attended: parseInt(match2[2]),
            total: null,
            percentage: parseFloat(match2[3])
        };
    }
    // Just clean name
    return {
        batchName: str,
        percentage: null
    };
};

const parseExcelBuffer = (buffer) => {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to array of arrays
    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    if (!raw || raw.length < 2) {
        throw new Error('Excel file is empty or too short.');
    }

    // Find the header row — it contains "RegisterNO" or "REGD.NO" or "Register NO" etc.
    let headerRowIdx = -1;
    let headerRow = null;
    for (let i = 0; i < Math.min(raw.length, 15); i++) {
        const row = raw[i];
        if (row && row.some(cell => {
            if (!cell) return false;
            const norm = String(cell).toUpperCase().replace(/[.\s_-]/g, '');
            return norm.includes('REGISTERNO') || norm.includes('REGDNO') || norm.includes('REGNO') || norm.includes('ROLLNO');
        })) {
            headerRowIdx = i;
            headerRow = row;
            break;
        }
    }

    if (headerRowIdx === -1) {
        throw new Error('Could not find header row with RegisterNO / REGD.NO / Roll No column.');
    }

    // Build column map: index → column name
    const colMap = {};
    headerRow.forEach((cell, idx) => {
        if (cell !== null && cell !== undefined && String(cell).trim() !== '') {
            colMap[idx] = String(cell).trim();
        }
    });

    const findColIdx = (keywords) => {
        const entries = Object.entries(colMap);
        for (const [idx, name] of entries) {
            const lower = name.toLowerCase().replace(/[\s._-]/g, '');
            if (keywords.some(k => lower.includes(k))) return parseInt(idx);
        }
        return -1;
    };

    const slIdx = findColIdx(['sl']);
    const regIdx = findColIdx(['registerno', 'regno', 'regd', 'rollno', 'roll_no', 'register_no', 'register_number', 'roll_number']);
    const nameIdx = findColIdx(['name']);
    const batchIdx = findColIdx(['batchname', 'batch_name', 'batch']);
    const pctIdx = findColIdx(['attendancepercentage', 'attendance_percentage', 'percentage', 'attendance', 'pct', 'total']);

    if (regIdx === -1) {
        throw new Error('Could not find RegisterNO column. Found columns: ' + Object.values(colMap).join(', '));
    }

    // Data rows start after header row
    const dataStartIdx = headerRowIdx + 1;
    const records = [];

    for (let i = dataStartIdx; i < raw.length; i++) {
        const row = raw[i];
        if (!row || row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) continue;

        const rollNo = regIdx >= 0 && row[regIdx] !== null ? String(row[regIdx]).trim().toUpperCase() : '';
        if (!rollNo || rollNo.length < 6) continue;
        if (/^\d+$/.test(rollNo) && parseInt(rollNo) < 100) continue;

        const name = nameIdx >= 0 && row[nameIdx] ? String(row[nameIdx]).trim() : '';
        const rawBatchVal = batchIdx >= 0 && row[batchIdx] ? String(row[batchIdx]).trim() : 'CRT';
        
        const parsedBatch = parseBatchCell(rawBatchVal) || { batchName: rawBatchVal, percentage: null };
        const batchName = parsedBatch.batchName;

        let pct = 0;
        let hasPct = false;
        
        if (pctIdx >= 0 && row[pctIdx] !== null && String(row[pctIdx]).trim() !== '') {
            const pctVal = String(row[pctIdx]).trim();
            pct = parseFloat(pctVal.replace(/%/g, '').trim()) || 0;
            hasPct = true;
        }
        
        if (!hasPct && parsedBatch.percentage !== null) {
            pct = parsedBatch.percentage;
        }

        // Convert fraction between 0 and 1 (like 0.3333, 0.6667, 1) to percentage (33.33, 66.67, 100)
        if (pct > 0 && pct <= 1.0) {
            pct = pct * 100;
        }

        // Determine daily slots attended (max 3 slots per day)
        let attended = 0;
        if (pct >= 85) attended = 3;
        else if (pct >= 50) attended = 2;
        else if (pct >= 15) attended = 1;
        else attended = 0;

        const subjects = [{
            subject: batchName,
            attended: attended,
            total: 3,
            percentage: pct,
            batchName: batchName
        }];

        records.push({
            rollNo,
            name,
            totalPercentage: pct,
            subjects,
            training: '-',
            counseling: '-',
        });
    }

    return { records };
};;


const bulkUpsertStudents = async (client, records, hashMap, section, yearNum) => {
    const chunkSize = 200;
    const studentRollToId = {};
    let created = 0;
    let updated = 0;

    for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        const rolls = chunk.map(r => r.rollNo);
        
        const existingRes = await client.query(
            'SELECT roll_no FROM students WHERE roll_no = ANY($1::varchar[])',
            [rolls]
        );
        const existingSet = new Set(existingRes.rows.map(r => r.roll_no.toUpperCase()));
        
        const rows = chunk.map(record => {
            const roll = record.rollNo;
            const hash = hashMap[roll] || '';
            const isNew = !existingSet.has(roll.toUpperCase());
            if (isNew) {
                created++;
            } else {
                updated++;
            }
            
            return {
                roll_no: roll,
                name: record.name,
                section: section || 'CRT',
                year: yearNum,
                password_hash: hash,
                total_percentage: record.totalPercentage || 0,
                training: record.training || '-',
                counseling: record.counseling || '-'
            };
        });

        const columns = ['roll_no', 'name', 'section', 'year', 'password_hash', 'total_percentage', 'training', 'counseling'];
        
        let valIndex = 1;
        const placeholders = [];
        const values = [];
        for (const row of rows) {
            const rowPlaceholders = columns.map(() => `$${valIndex++}`);
            placeholders.push(`(${rowPlaceholders.join(', ')})`);
            columns.forEach(col => values.push(row[col]));
        }

        const sql = `
            INSERT INTO students (roll_no, name, section, year, password_hash, total_percentage, training, counseling)
            VALUES ${placeholders.join(', ')}
            ON CONFLICT (roll_no) DO UPDATE SET
                name = CASE WHEN EXCLUDED.name <> '' THEN EXCLUDED.name ELSE students.name END,
                section = CASE WHEN EXCLUDED.section <> '' THEN EXCLUDED.section ELSE students.section END,
                year = EXCLUDED.year,
                total_percentage = EXCLUDED.total_percentage,
                training = EXCLUDED.training,
                counseling = EXCLUDED.counseling,
                updated_at = NOW()
            RETURNING roll_no, id
        `;

        const res = await client.query(sql, values);
        res.rows.forEach(r => {
            studentRollToId[r.roll_no.toUpperCase()] = r.id;
        });
    }

    return { studentRollToId, created, updated };
};

const bulkUpsertStudentSubjects = async (client, records, studentRollToId) => {
    const studentIds = Object.values(studentRollToId);
    if (studentIds.length === 0) return;

    const chunkSize = 200;
    for (let i = 0; i < studentIds.length; i += chunkSize) {
        const idChunk = studentIds.slice(i, i + chunkSize);
        await client.query('DELETE FROM student_subjects WHERE student_id = ANY($1::int[])', [idChunk]);
    }

    const subjectRows = [];
    for (const record of records) {
        const studentId = studentRollToId[record.rollNo.toUpperCase()];
        if (!studentId) continue;
        for (const sub of record.subjects || []) {
            subjectRows.push({
                student_id: studentId,
                subject: sub.subject,
                attended: sub.attended,
                total: sub.total,
                percentage: sub.percentage
            });
        }
    }

    for (let i = 0; i < subjectRows.length; i += chunkSize) {
        const chunk = subjectRows.slice(i, i + chunkSize);
        const columns = ['student_id', 'subject', 'attended', 'total', 'percentage'];
        
        let valIndex = 1;
        const placeholders = [];
        const values = [];
        for (const row of chunk) {
            const rowPlaceholders = columns.map(() => `$${valIndex++}`);
            placeholders.push(`(${rowPlaceholders.join(', ')})`);
            columns.forEach(col => values.push(row[col]));
        }

        const sql = `
            INSERT INTO student_subjects (student_id, subject, attended, total, percentage)
            VALUES ${placeholders.join(', ')}
        `;
        await client.query(sql, values);
    }
};

const bulkUpsertAttendance = async (client, records, section, yearNum, dateStr, uploadId) => {
    const chunkSize = 200;
    const attRollToId = {};

    for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        
        const rows = chunk.map(record => ({
            roll_no: record.rollNo,
            name: record.name,
            section: section || 'CRT',
            year: yearNum,
            upload_date: dateStr,
            total_percentage: record.totalPercentage || 0,
            training: record.training || '-',
            counseling: record.counseling || '-',
            upload_batch_id: uploadId
        }));

        const columns = ['roll_no', 'name', 'section', 'year', 'upload_date', 'total_percentage', 'training', 'counseling', 'upload_batch_id'];
        
        let valIndex = 1;
        const placeholders = [];
        const values = [];
        for (const row of rows) {
            const rowPlaceholders = columns.map(() => `$${valIndex++}`);
            placeholders.push(`(${rowPlaceholders.join(', ')})`);
            columns.forEach(col => values.push(row[col]));
        }

        const sql = `
            INSERT INTO attendance_records (roll_no, name, section, year, upload_date, total_percentage, training, counseling, upload_batch_id)
            VALUES ${placeholders.join(', ')}
            ON CONFLICT (roll_no, upload_date) DO UPDATE SET
                name = EXCLUDED.name,
                section = EXCLUDED.section,
                year = EXCLUDED.year,
                total_percentage = EXCLUDED.total_percentage,
                training = EXCLUDED.training,
                counseling = EXCLUDED.counseling,
                upload_batch_id = EXCLUDED.upload_batch_id
            RETURNING roll_no, id
        `;

        const res = await client.query(sql, values);
        res.rows.forEach(r => {
            attRollToId[r.roll_no.toUpperCase()] = r.id;
        });
    }

    return attRollToId;
};

const bulkUpsertAttendanceSubjects = async (client, records, attRollToId) => {
    const attIds = Object.values(attRollToId);
    if (attIds.length === 0) return;

    const chunkSize = 200;
    for (let i = 0; i < attIds.length; i += chunkSize) {
        const idChunk = attIds.slice(i, i + chunkSize);
        await client.query('DELETE FROM attendance_subjects WHERE attendance_id = ANY($1::int[])', [idChunk]);
    }

    const subjectRows = [];
    for (const record of records) {
        const attId = attRollToId[record.rollNo.toUpperCase()];
        if (!attId) continue;
        for (const sub of record.subjects || []) {
            subjectRows.push({
                attendance_id: attId,
                subject: sub.subject,
                attended: sub.attended,
                total: sub.total,
                percentage: sub.percentage
            });
        }
    }

    for (let i = 0; i < subjectRows.length; i += chunkSize) {
        const chunk = subjectRows.slice(i, i + chunkSize);
        const columns = ['attendance_id', 'subject', 'attended', 'total', 'percentage'];
        
        let valIndex = 1;
        const placeholders = [];
        const values = [];
        for (const row of chunk) {
            const rowPlaceholders = columns.map(() => `$${valIndex++}`);
            placeholders.push(`(${rowPlaceholders.join(', ')})`);
            columns.forEach(col => values.push(row[col]));
        }

        const sql = `
            INSERT INTO attendance_subjects (attendance_id, subject, attended, total, percentage)
            VALUES ${placeholders.join(', ')}
        `;
        await client.query(sql, values);
    }
};


// ─── Upload Excel Attendance ──────────────────────────────────────────────────
exports.uploadAttendance = async (req, res) => {
    const { section, year, uploadDate } = req.body;
    const yearNum = parseInt(year) || 3;
    if (!req.file) return res.status(400).json({ message: 'Excel file (.xlsx) is required' });

    // Parse upload date — treat date string as local date (not UTC) to avoid timezone issues
    let dateStr;
    if (uploadDate) {
        // uploadDate comes as YYYY-MM-DD string; use it directly to avoid timezone shift
        dateStr = uploadDate; // e.g. "2026-05-22"
    } else {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        dateStr = `${y}-${m}-${d}`;
    }

    // Enforce CRT start date (compare as date strings YYYY-MM-DD)
    if (dateStr < '2026-05-22') {
        return res.status(400).json({ message: 'Upload date cannot be before CRT start date (22-05-2026)' });
    }

    let records;
    try {
        const parsed = parseExcelBuffer(req.file.buffer);
        records = parsed.records;
    } catch (err) {
        return res.status(400).json({ message: 'Failed to parse Excel file: ' + err.message });
    }

    if (!records || records.length === 0) {
        return res.status(400).json({ message: 'No valid student records found in the Excel file' });
    }

    // Pre-hash passwords only for NEW students, in smaller chunks to avoid event-loop blocking
    console.log(`Checking existing students in database...`);
    const existingRes = await query('SELECT roll_no FROM students');
    const existingSet = new Set(existingRes.rows.map(r => String(r.roll_no).toUpperCase().trim()));

    console.log(`Pre-hashing passwords for new students...`);
    const hashMap = {};
    const newStudents = records.filter(r => !existingSet.has(r.rollNo.toUpperCase().trim()));
    console.log(`Found ${newStudents.length} new students out of ${records.length} total records.`);

    const chunkSize = 50;
    for (let i = 0; i < newStudents.length; i += chunkSize) {
        const chunk = newStudents.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (record) => {
            const roll = record.rollNo.toUpperCase().trim();
            hashMap[roll] = await bcrypt.hash(roll, 8);
        }));
        console.log(`  Hashed ${Math.min(i + chunkSize, newStudents.length)} / ${newStudents.length} new passwords...`);
    }
    console.log('Password hashing complete, starting database transaction...');

    const client = await getClient();
    try {
        await client.query('BEGIN');

        // Create upload record
        const uploadRes = await client.query(
            `INSERT INTO uploads (filename, section, year, upload_date, record_count, uploaded_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [req.file.originalname, section || 'CRT', yearNum, dateStr, records.length, 'admin']
        );
        const uploadId = uploadRes.rows[0].id;

        // Perform bulk upserts
        const { studentRollToId, created, updated } = await bulkUpsertStudents(client, records, hashMap, section, yearNum);
        
        // 1. Insert daily records into attendance_records and attendance_subjects first
        const attRollToId = await bulkUpsertAttendance(client, records, section, yearNum, dateStr, uploadId);
        await bulkUpsertAttendanceSubjects(client, records, attRollToId);

        // 2. Recalculate subject/batch attendance in student_subjects for these students based on all history
        const studentIds = Object.values(studentRollToId);
        if (studentIds.length > 0) {
            await client.query('DELETE FROM student_subjects WHERE student_id = ANY($1::int[])', [studentIds]);
            await client.query(`
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
        }

        // 3. Recalculate overall attendance percentage for these students as the running average of all day-wise uploads
        const studentRolls = records.map(r => r.rollNo.toUpperCase().trim());
        await client.query(`
            UPDATE students s
            SET total_percentage = COALESCE((
                SELECT ROUND(AVG(total_percentage), 2)
                FROM attendance_records ar
                WHERE ar.roll_no = s.roll_no
            ), 0)
            WHERE s.roll_no = ANY($1::varchar[])
        `, [studentRolls]);

        await client.query('COMMIT');

        res.json({
            message: `Upload successful: ${created} new, ${updated} updated`,
            section: section || 'CRT',
            year: yearNum,
            uploadDate: dateStr,
            total: records.length,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Upload error:', err);
        res.status(500).json({ message: 'Database error: ' + err.message });
    } finally {
        client.release();
    }
};

// ─── Stats ────────────────────────────────────────────────────────────────────
exports.getStats = async (req, res) => {
    const totalRes = await query('SELECT COUNT(*) as count FROM students');
    const totalStudents = parseInt(totalRes.rows[0].count);

    const avgRes = await query('SELECT AVG(total_percentage) as avg FROM students');
    const avgAttendance = Math.round(parseFloat(avgRes.rows[0].avg) || 0);

    const presentRes = await query('SELECT COUNT(*) as count FROM students WHERE total_percentage >= 75');
    const present = parseInt(presentRes.rows[0].count);
    const absent = totalStudents - present;

    // Year-wise stats
    const yearRes = await query(
        `SELECT year, AVG(total_percentage) as avg, COUNT(*) as count
         FROM students GROUP BY year ORDER BY year`
    );
    const yearStats = yearRes.rows.map(r => ({
        year: r.year,
        avgPercentage: Math.round(parseFloat(r.avg) || 0),
        count: parseInt(r.count),
    }));

    // Section stats
    const secRes = await query(
        `SELECT section, AVG(total_percentage) as avg, COUNT(*) as count
         FROM students GROUP BY section ORDER BY section`
    );
    const sectionStats = secRes.rows.map(r => ({
        section: r.section,
        avgPercentage: Math.round(parseFloat(r.avg) || 0),
        count: parseInt(r.count),
    }));

    // Recent uploads
    const uploadsRes = await query(
        `SELECT id, filename, section, year, upload_date, record_count, uploaded_by, created_at
         FROM uploads ORDER BY upload_date DESC LIMIT 15`
    );

    res.json({
        totalStudents, present, absent, avgAttendance,
        yearStats, sectionStats,
        recentUploads: uploadsRes.rows,
    });
};

// ─── Day-wise stats for graphs ────────────────────────────────────────────────
exports.getDayWiseStats = async (req, res) => {
    const { year } = req.params;
    const yearFilter = year && year !== 'all' ? 'AND year = $1' : '';
    const params = year && year !== 'all' ? [parseInt(year)] : [];

    // Get daily average attendance from 22-05-2026 onwards
    const dailyRes = await query(
        `SELECT
            upload_date,
            year,
            AVG(total_percentage) as avg_pct,
            COUNT(DISTINCT roll_no) as student_count
         FROM attendance_records
         WHERE upload_date >= '2026-05-22' ${yearFilter}
         GROUP BY upload_date, year
         ORDER BY upload_date ASC`,
        params
    );

    // Format dates and group by year
    const byDate = {};
    const byYear = {};

    dailyRes.rows.forEach(row => {
        const d = new Date(row.upload_date);
        const dateLabel = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' });
        const dateKey = row.upload_date;
        const avg = Math.round(parseFloat(row.avg_pct) || 0);
        const yr = row.year;

        if (!byDate[dateKey]) byDate[dateKey] = { dateLabel, dateKey, avg: [], count: 0 };
        byDate[dateKey].avg.push(avg);
        byDate[dateKey].count += parseInt(row.student_count);

        if (!byYear[yr]) byYear[yr] = [];
        byYear[yr].push({ dateLabel, dateKey, avg, count: parseInt(row.student_count) });
    });

    // Overall daily (all years combined)
    const overallDays = Object.values(byDate)
        .sort((a, b) => new Date(a.dateKey) - new Date(b.dateKey))
        .map(d => ({
            dateLabel: d.dateLabel,
            dateKey: d.dateKey,
            avg: Math.round(d.avg.reduce((s, v) => s + v, 0) / d.avg.length),
            count: d.count,
        }));

    // Daily change (difference between consecutive days)
    const dailyChange = overallDays.map((d, i) => {
        if (i === 0) return { ...d, change: 0 };
        return { ...d, change: d.avg - overallDays[i - 1].avg };
    });

    res.json({
        overall: dailyChange,
        byYear,
    });
};

// ─── Section List ─────────────────────────────────────────────────────────────
exports.getSections = async (req, res) => {
    const res2 = await query('SELECT DISTINCT section FROM students WHERE section IS NOT NULL ORDER BY section');
    res.json(res2.rows.map(r => r.section));
};

// ─── Section Wise Students ────────────────────────────────────────────────────
exports.getSectionStudents = async (req, res) => {
    const { section } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const countRes = await query('SELECT COUNT(*) as count FROM students WHERE section = $1', [section]);
    const total = parseInt(countRes.rows[0].count);

    const studRes = await query(
        `SELECT id, roll_no, name, section, year, total_percentage, training, counseling
         FROM students WHERE section = $1 ORDER BY roll_no ASC LIMIT $2 OFFSET $3`,
        [section, limit, offset]
    );

    // Get subjects for each student
    const students = await Promise.all(studRes.rows.map(async (s) => {
        const subjRes = await query(
            'SELECT subject, attended, total, percentage FROM student_subjects WHERE student_id = $1',
            [s.id]
        );
        return { ...s, subjects: subjRes.rows };
    }));

    res.json({ students, total, page, pages: Math.ceil(total / limit) });
};

// ─── Search Student ───────────────────────────────────────────────────────────
exports.searchStudent = async (req, res) => {
    const { rollNo, name } = req.query;
    let sql = 'SELECT id, roll_no, name, section, year, total_percentage FROM students WHERE 1=1';
    const params = [];

    if (rollNo) {
        params.push(`%${rollNo.toUpperCase()}%`);
        sql += ` AND roll_no LIKE $${params.length}`;
    }
    if (name) {
        params.push(`%${name}%`);
        sql += ` AND UPPER(name) LIKE UPPER($${params.length})`;
    }
    sql += ' LIMIT 20';

    const res2 = await query(sql, params);
    res.json(res2.rows);
};

// ─── All Uploads ──────────────────────────────────────────────────────────────
exports.getUploads = async (req, res) => {
    const res2 = await query(
        'SELECT id, filename, section, year, upload_date, record_count, uploaded_by, created_at FROM uploads ORDER BY created_at DESC LIMIT 50'
    );
    res.json(res2.rows);
};

// ─── Subject wise overall stats ───────────────────────────────────────────────
exports.getSubjectStats = async (req, res) => {
    const res2 = await query(
        `SELECT subject, AVG(percentage) as avg_pct, COUNT(*) as count
         FROM student_subjects
         GROUP BY subject
         ORDER BY avg_pct DESC`
    );
    const subjectStats = res2.rows.map(r => ({
        subject: r.subject,
        avgPercentage: Math.round(parseFloat(r.avg_pct) || 0),
        count: parseInt(r.count),
    }));
    res.json(subjectStats);
};

// ─── Download CSV ─────────────────────────────────────────────────────────────
exports.downloadCSV = async (req, res) => {
    const { section } = req.params;
    const sql = section !== 'all'
        ? 'SELECT id, roll_no, name, section, year, total_percentage FROM students WHERE section = $1 ORDER BY roll_no'
        : 'SELECT id, roll_no, name, section, year, total_percentage FROM students ORDER BY roll_no';
    const params = section !== 'all' ? [section] : [];

    const studRes = await query(sql, params);
    const students = await Promise.all(studRes.rows.map(async (s) => {
        const subjRes = await query(
            'SELECT subject, attended, total, percentage FROM student_subjects WHERE student_id = $1',
            [s.id]
        );
        return { ...s, subjects: subjRes.rows };
    }));

    const rows = students.map(s => {
        const row = {
            rollNo: s.roll_no, name: s.name,
            section: s.section, year: s.year,
            totalPercentage: s.total_percentage
        };
        for (const sub of s.subjects || []) {
            row[sub.subject] = `${sub.attended}/${sub.total} (${sub.percentage}%)`;
        }
        return row;
    });

    const headers = ['rollNo', 'name', 'section', 'year', 'totalPercentage'];
    if (rows.length > 0) {
        const extraKeys = Object.keys(rows[0]).filter(k => !headers.includes(k));
        headers.push(...extraKeys);
    }

    const csv = [
        headers.join(','),
        ...rows.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${section}.csv"`);
    res.send(csv);
};

// ─── Students Needing Attention (below 75%) ───────────────────────────────────
exports.getNeedsAttention = async (req, res) => {
    const res2 = await query(
        `SELECT id, roll_no, name, section, year, total_percentage
         FROM students WHERE total_percentage < 75 ORDER BY total_percentage ASC`
    );
    const students = await Promise.all(res2.rows.map(async (s) => {
        const subjRes = await query(
            'SELECT subject, attended, total, percentage FROM student_subjects WHERE student_id = $1',
            [s.id]
        );
        return { ...s, rollNo: s.roll_no, subjects: subjRes.rows };
    }));
    res.json(students);
};

// ─── All distinct subject names ───────────────────────────────────────────────
exports.getSubjectNames = async (req, res) => {
    const res2 = await query(
        'SELECT DISTINCT subject FROM student_subjects WHERE subject IS NOT NULL ORDER BY subject'
    );
    res.json(res2.rows.map(r => r.subject));
};

// ─── Students filtered by subject + attendance threshold ─────────────────────
exports.getStudentsBySubject = async (req, res) => {
    const { subject, threshold = '75', section, year } = req.query;
    const thresholdNum = parseFloat(threshold);

    let sql = `
        SELECT s.id, s.roll_no, s.name, s.section, s.year, s.total_percentage,
               ss.subject, ss.attended, ss.total, ss.percentage
        FROM students s
        JOIN student_subjects ss ON ss.student_id = s.id
        WHERE ss.percentage < $1
    `;
    const params = [thresholdNum];

    if (subject) {
        params.push(subject);
        sql += ` AND ss.subject = $${params.length}`;
    }
    if (section && section !== 'all') {
        params.push(section);
        sql += ` AND s.section = $${params.length}`;
    }
    if (year && year !== 'all') {
        params.push(parseInt(year));
        sql += ` AND s.year = $${params.length}`;
    }
    sql += ' ORDER BY s.roll_no';

    const res2 = await query(sql, params);
    // Group by student
    const map = {};
    for (const row of res2.rows) {
        if (!map[row.roll_no]) {
            map[row.roll_no] = {
                id: row.id, rollNo: row.roll_no, name: row.name,
                section: row.section, year: row.year,
                totalPercentage: row.total_percentage, subjects: []
            };
        }
        if (row.subject) {
            map[row.roll_no].subjects.push({
                subject: row.subject, attended: row.attended,
                total: row.total, percentage: row.percentage
            });
        }
    }
    res.json(Object.values(map));
};

// ─── Year-wise students ───────────────────────────────────────────────────────
exports.getYearStudents = async (req, res) => {
    const { year } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const countRes = await query('SELECT COUNT(*) as count FROM students WHERE year = $1', [parseInt(year)]);
    const total = parseInt(countRes.rows[0].count);

    const studRes = await query(
        `SELECT id, roll_no, name, section, year, total_percentage, training, counseling
         FROM students WHERE year = $1 ORDER BY roll_no ASC LIMIT $2 OFFSET $3`,
        [parseInt(year), limit, offset]
    );

    res.json({ students: studRes.rows, total, page, pages: Math.ceil(total / limit) });
};

// ─── Delete Upload ─────────────────────────────────────────────────────────────
exports.deleteUpload = async (req, res) => {
    const { id } = req.params;
    const uploadId = parseInt(id);

    if (!uploadId) {
        return res.status(400).json({ message: 'Invalid upload ID' });
    }

    const { getClient } = require('../db');
    const client = await getClient();
    try {
        await client.query('BEGIN');

        // 1. Find all affected students (by roll numbers and IDs) who have attendance records in this batch
        const affectedRes = await client.query(`
            SELECT DISTINCT s.id, s.roll_no
            FROM students s
            JOIN attendance_records ar ON ar.roll_no = s.roll_no
            WHERE ar.upload_batch_id = $1
        `, [uploadId]);

        const studentIds = affectedRes.rows.map(r => r.id);
        const studentRolls = affectedRes.rows.map(r => r.roll_no);

        // 2. Delete attendance records for this batch (cascades to attendance_subjects)
        const delAttRes = await client.query('DELETE FROM attendance_records WHERE upload_batch_id = $1', [uploadId]);

        // 3. Delete the upload record itself
        const delUploadRes = await client.query('DELETE FROM uploads WHERE id = $1', [uploadId]);

        if (delUploadRes.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Upload record not found' });
        }

        // 4. Recalculate student_subjects for all affected students based on remaining history
        if (studentIds.length > 0) {
            await client.query('DELETE FROM student_subjects WHERE student_id = ANY($1::int[])', [studentIds]);
            await client.query(`
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
        }

        // 5. Recalculate overall attendance percentage for affected students
        if (studentRolls.length > 0) {
            await client.query(`
                UPDATE students s
                SET total_percentage = COALESCE((
                    SELECT ROUND(AVG(total_percentage), 2)
                    FROM attendance_records ar
                    WHERE ar.roll_no = s.roll_no
                ), 0)
                WHERE s.roll_no = ANY($1::varchar[])
            `, [studentRolls]);
        }

        await client.query('COMMIT');
        res.json({ message: 'Upload successfully deleted and attendance statistics recalculated.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Delete upload error:', err);
        res.status(500).json({ message: 'Database error: ' + err.message });
    } finally {
        client.release();
    }
};

// ─── Get Single Student Full Details (Admin) ───────────────────────────────────
exports.getStudentDetail = async (req, res) => {
    const { rollNo } = req.params;
    if (!rollNo) {
        return res.status(400).json({ message: 'Roll number is required' });
    }

    const cleanRollNo = rollNo.toUpperCase().trim();

    // 1. Fetch Student Profile
    const studentQuery = await query(
        `SELECT id, roll_no, name, section, year, email, total_percentage, training, counseling
         FROM students WHERE roll_no = $1`,
        [cleanRollNo]
    );

    if (studentQuery.rows.length === 0) {
        return res.status(404).json({ message: 'Student not found' });
    }

    const student = studentQuery.rows[0];

    // 2. Fetch Subject-wise Attendance
    const subjectsQuery = await query(
        `SELECT subject, attended, total, percentage 
         FROM student_subjects 
         WHERE student_id = $1 
         ORDER BY subject`,
        [student.id]
    );

    // 3. Fetch Attendance History (All daily records, sorted by date)
    const historyQuery = await query(
        `SELECT id, roll_no, name, section, year, upload_date, total_percentage, training, counseling
         FROM attendance_records
         WHERE roll_no = $1
         ORDER BY upload_date DESC
         LIMIT 100`,
        [cleanRollNo]
    );

    let history = [];
    if (historyQuery.rows.length > 0) {
        const recordIds = historyQuery.rows.map(r => r.id);
        const subjQuery = await query(
            `SELECT attendance_id, subject, attended, total, percentage
             FROM attendance_subjects
             WHERE attendance_id = ANY($1::int[])`,
            [recordIds]
        );

        // Group by attendance_id
        const subjMap = {};
        for (const s of subjQuery.rows) {
            if (!subjMap[s.attendance_id]) subjMap[s.attendance_id] = [];
            subjMap[s.attendance_id].push({
                subject: s.subject,
                attended: s.attended,
                total: s.total,
                percentage: parseFloat(s.percentage) || 0
            });
        }

        history = historyQuery.rows.map(r => ({
            _id: r.id,
            rollNo: r.roll_no,
            name: r.name,
            section: r.section,
            year: r.year,
            uploadDate: r.upload_date,
            totalPercentage: parseFloat(r.total_percentage) || 0,
            training: r.training,
            counseling: r.counseling,
            subjects: subjMap[r.id] || []
        }));
    }

    res.json({
        profile: {
            id: student.id,
            rollNo: student.roll_no,
            name: student.name,
            section: student.section,
            year: student.year,
            email: student.email,
            totalPercentage: parseFloat(student.total_percentage) || 0,
            training: student.training,
            counseling: student.counseling
        },
        subjects: subjectsQuery.rows.map(r => ({
            subject: r.subject,
            attended: r.attended,
            total: r.total,
            percentage: parseFloat(r.percentage) || 0
        })),
        history
    });
};


