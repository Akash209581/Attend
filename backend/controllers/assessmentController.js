const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const { query, getClient } = require('../db');

// Helper to parse date string (DD-MM-YYYY or Excel serial) into ISO format (YYYY-MM-DD)
const parseExcelDate = (val) => {
    if (!val) return null;
    if (typeof val === 'number') {
        const date = new Date((val - 25569) * 86400 * 1000);
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        const d = String(date.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    const str = String(val).trim();
    const match = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (match) {
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        const year = match[3];
        return `${year}-${month}-${day}`;
    }
    const matchISO = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (matchISO) {
        const year = matchISO[1];
        const month = matchISO[2].padStart(2, '0');
        const day = matchISO[3].padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    return null;
};

// Helper to parse assessment spreadsheet (4-column format: Roll Number, Batch Number, Assessment name, Marks)
const parseAssessmentExcelBuffer = (buffer) => {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to array of arrays
    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    if (!raw || raw.length < 2) {
        throw new Error('Excel file is too short (needs header row and at least one data row).');
    }

    // Find the header row — it contains "Roll Number" or similar
    let headerRowIdx = -1;
    let headerRow = null;
    for (let i = 0; i < Math.min(raw.length, 15); i++) {
        const row = raw[i];
        if (row && row.some(cell => {
            if (!cell) return false;
            const norm = String(cell).toUpperCase().replace(/[.\s_-]/g, '');
            return norm.includes('ROLLNUMBER') || norm.includes('REGISTERNO') || norm.includes('REGDNO') || norm.includes('REGNO');
        })) {
            headerRowIdx = i;
            headerRow = row;
            break;
        }
    }

    if (headerRowIdx === -1) {
        throw new Error('Could not find header row with Roll Number / RegisterNO column.');
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

    const rollIdx = findColIdx(['rollnumber', 'rollno', 'registerno', 'regno', 'regd']);
    const batchIdx = findColIdx(['batch']);
    const assessmentNameIdx = findColIdx(['assesmentname', 'assessmentname', 'assessment', 'assesment', 'testtype', 'testname']);
    const marksIdx = findColIdx(['marks', 'mark', 'score']);

    if (rollIdx === -1) {
        throw new Error('Could not find Roll Number / RegisterNO column.');
    }
    if (batchIdx === -1) {
        throw new Error('Could not find Batch Number column.');
    }
    if (assessmentNameIdx === -1) {
        throw new Error('Could not find Assessment Name column.');
    }
    if (marksIdx === -1) {
        throw new Error('Could not find Marks column.');
    }

    const records = [];
    const dataStartIdx = headerRowIdx + 1;

    for (let i = dataStartIdx; i < raw.length; i++) {
        const row = raw[i];
        if (!row || row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) continue;

        const rollNo = row[rollIdx] !== null && row[rollIdx] !== undefined ? String(row[rollIdx]).trim().toUpperCase() : '';
        if (!rollNo || rollNo.length < 6) continue;

        const batchVal = row[batchIdx] !== null && row[batchIdx] !== undefined ? String(row[batchIdx]).trim() : '';
        const assessmentNameVal = row[assessmentNameIdx] !== null && row[assessmentNameIdx] !== undefined ? String(row[assessmentNameIdx]).trim() : 'General Test';
        const rawMarks = row[marksIdx];

        let marks = 0;
        if (rawMarks !== null && rawMarks !== undefined && String(rawMarks).trim() !== '') {
            const marksStr = String(rawMarks).toUpperCase().trim();
            if (marksStr === 'AB' || marksStr === 'ABSENT') {
                marks = -1;
            } else {
                const parsedMarks = parseFloat(marksStr);
                if (isNaN(parsedMarks)) {
                    marks = -1;
                } else {
                    marks = parsedMarks;
                }
            }
        } else {
            marks = -1;
        }

        records.push({
            rollNo,
            section: '1',
            batch: batchVal,
            assessmentName: assessmentNameVal,
            marks,
            maxMarks: 100
        });
    }

    return { records };
};

// Helper to bulk upsert students registered in the assessments file
const bulkUpsertAssessmentStudents = async (client, uniqueStudents, hashMap) => {
    const chunkSize = 200;
    const studentRollToId = {};

    for (let i = 0; i < uniqueStudents.length; i += chunkSize) {
        const chunk = uniqueStudents.slice(i, i + chunkSize);
        const rolls = chunk.map(r => r.rollNo);
        
        const existingRes = await client.query(
            'SELECT roll_no FROM students WHERE roll_no = ANY($1::varchar[])',
            [rolls]
        );
        const existingSet = new Set(existingRes.rows.map(r => r.roll_no.toUpperCase()));
        
        const rows = chunk.map(record => {
            const roll = record.rollNo;
            const hash = hashMap[roll.toUpperCase().trim()] || '';
            
            return {
                roll_no: roll,
                name: roll, // default to roll number
                section: record.section || '1',
                year: 4,
                password_hash: hash,
                total_percentage: 0,
                training: '-',
                counseling: '-'
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
                section = CASE WHEN EXCLUDED.section <> '1' THEN EXCLUDED.section ELSE students.section END,
                updated_at = NOW()
            RETURNING roll_no, id
        `;

        const res = await client.query(sql, values);
        res.rows.forEach(r => {
            studentRollToId[r.roll_no.toUpperCase().trim()] = r.id;
        });
    }

    return studentRollToId;
};

// Helper to provision student assigned batch in student_subjects table
const provisionStudentSubjects = async (client, studentRollToId, uniqueStudents) => {
    const studentIds = Object.values(studentRollToId);
    if (studentIds.length === 0) return;

    // Fetch all existing subjects for these students in one query
    const existsRes = await client.query(
        'SELECT student_id, subject FROM student_subjects WHERE student_id = ANY($1::int[])',
        [studentIds]
    );

    const existingSet = new Set(
        existsRes.rows.map(r => `${r.student_id}::${String(r.subject).trim().toLowerCase()}`)
    );

    // Group existing subjects by student_id
    const existingSubjectsMap = {};
    for (const r of existsRes.rows) {
        const sid = r.student_id;
        if (!existingSubjectsMap[sid]) {
            existingSubjectsMap[sid] = [];
        }
        existingSubjectsMap[sid].push(String(r.subject).trim().toLowerCase());
    }

    const getBatchNumber = (str) => {
        const match = str.match(/\d+/);
        return match ? match[0] : null;
    };

    const toInsert = [];
    for (const student of uniqueStudents) {
        const studentId = studentRollToId[student.rollNo.toUpperCase().trim()];
        if (!studentId || !student.batch) continue;

        const newBatchClean = student.batch.trim().toLowerCase();
        const key = `${studentId}::${newBatchClean}`;
        if (existingSet.has(key)) continue;

        // If new batch is a short form like B9, check if they already have a long batch name like CSE - Batch - 9
        if (/^[Bb]\d+$/.test(student.batch.trim())) {
            const newNum = getBatchNumber(student.batch);
            const studentExisting = existingSubjectsMap[studentId] || [];
            const hasMatchingLong = studentExisting.some(exSub => getBatchNumber(exSub) === newNum);
            if (hasMatchingLong) {
                // Already has a matching long batch like "CSE - Batch - 9", so skip B9
                continue;
            }
        }

        toInsert.push({ studentId, batch: student.batch.trim() });
        existingSet.add(key); // prevent duplicates in the same upload
        if (!existingSubjectsMap[studentId]) {
            existingSubjectsMap[studentId] = [];
        }
        existingSubjectsMap[studentId].push(newBatchClean);
    }

    if (toInsert.length === 0) return;

    // Chunk bulk inserts (max 200 at a time to prevent parameter limits)
    const chunkSize = 200;
    for (let i = 0; i < toInsert.length; i += chunkSize) {
        const chunk = toInsert.slice(i, i + chunkSize);
        
        let valIdx = 1;
        const placeholders = [];
        const values = [];

        for (const item of chunk) {
            placeholders.push(`($${valIdx++}, $${valIdx++}, 0, 0, 0)`);
            values.push(item.studentId);
            values.push(item.batch);
        }

        const sql = `
            INSERT INTO student_subjects (student_id, subject, attended, total, percentage)
            VALUES ${placeholders.join(', ')}
        `;
        await client.query(sql, values);
    }
};

// Upload Assessments Excel file (Admin)
exports.uploadAssessments = async (req, res) => {
    const { uploadDate } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Excel file (.xlsx) is required' });

    let dateStr;
    if (uploadDate) {
        dateStr = uploadDate;
    } else {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        dateStr = `${y}-${m}-${d}`;
    }

    const dateParts = dateStr.split('-');
    const formattedDisplayDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

    let records;
    try {
        const parsed = parseAssessmentExcelBuffer(req.file.buffer);
        records = parsed.records;
    } catch (err) {
        return res.status(400).json({ message: 'Failed to parse Excel file: ' + err.message });
    }

    if (!records || records.length === 0) {
        return res.status(400).json({ message: 'No valid student records found in the Excel file' });
    }

    // Extract unique students for provisioning logins
    const uniqueStudentsMap = {};
    records.forEach(r => {
        const rollUpper = r.rollNo.toUpperCase().trim();
        if (!uniqueStudentsMap[rollUpper]) {
            uniqueStudentsMap[rollUpper] = {
                rollNo: r.rollNo,
                section: r.section,
                batch: r.batch
            };
        }
    });
    const uniqueStudents = Object.values(uniqueStudentsMap);

    // Pre-hash passwords only for new students
    const existingRes = await query('SELECT roll_no FROM students');
    const existingSet = new Set(existingRes.rows.map(r => String(r.roll_no).toUpperCase().trim()));

    const hashMap = {};
    const newStudents = uniqueStudents.filter(s => !existingSet.has(s.rollNo.toUpperCase().trim()));

    const chunkSize = 50;
    for (let i = 0; i < newStudents.length; i += chunkSize) {
        const chunk = newStudents.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (student) => {
            const roll = student.rollNo.toUpperCase().trim();
            hashMap[roll] = await bcrypt.hash(roll, 8);
        }));
    }

    const client = await getClient();
    try {
        await client.query('BEGIN');

        // Create upload record
        const uploadRes = await client.query(
            `INSERT INTO uploads (filename, section, year, upload_date, record_count, uploaded_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [req.file.originalname, 'CRT-ASSESSMENT', 4, dateStr, records.length, 'admin']
        );
        const uploadId = uploadRes.rows[0].id;

        // Upsert students (ensure student accounts exist)
        const studentRollToId = await bulkUpsertAssessmentStudents(client, uniqueStudents, hashMap);

        // Provision student subjects (assigned batch)
        await provisionStudentSubjects(client, studentRollToId, uniqueStudents);

        // Delete existing assessments for the students in this upload on the selected date to prevent duplicates
        const rolls = uniqueStudents.map(s => s.rollNo.toUpperCase().trim());
        if (rolls.length > 0) {
            await client.query(
                'DELETE FROM student_assessments WHERE roll_no = ANY($1::varchar[]) AND upload_date = $2',
                [rolls, dateStr]
            );
        }

        // Bulk insert assessment records
        let valIdx = 1;
        const placeholders = [];
        const values = [];

        for (const r of records) {
            placeholders.push(`($${valIdx++}, $${valIdx++}, $${valIdx++}, $${valIdx++}, $${valIdx++}, $${valIdx++}, $${valIdx++})`);
            values.push(r.rollNo.toUpperCase().trim());
            values.push(r.assessmentName);
            values.push(formattedDisplayDate);
            values.push(r.marks);
            values.push(r.maxMarks);
            values.push(dateStr);
            values.push(uploadId);
        }

        const sql = `
            INSERT INTO student_assessments (roll_no, subject, assessment_name, marks, max_marks, upload_date, upload_batch_id)
            VALUES ${placeholders.join(', ')}
        `;
        await client.query(sql, values);

        // Delete any empty uploads of section CRT-ASSESSMENT that have no assessments left
        await client.query(`
            DELETE FROM uploads 
            WHERE section = 'CRT-ASSESSMENT' 
              AND id NOT IN (SELECT DISTINCT upload_batch_id FROM student_assessments)
        `);

        await client.query('COMMIT');

        res.json({
            message: `Upload successful: ${records.length} assessment records processed`,
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

// Retrieve Assessments with filters and pagination (Admin)
exports.getAssessments = async (req, res) => {
    const { rollNo, subject, assessmentName, year, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClauses = [];
    let params = [];
    let paramIdx = 1;

    if (rollNo) {
        const cleanRoll = rollNo.trim().toUpperCase();
        if (cleanRoll.length === 10) {
            whereClauses.push(`a.roll_no = $${paramIdx++}`);
            params.push(cleanRoll);
        } else {
            whereClauses.push(`a.roll_no ILIKE $${paramIdx++}`);
            params.push(`%${cleanRoll}%`);
        }
    }
    if (subject) {
        whereClauses.push(`a.subject = $${paramIdx++}`);
        params.push(subject);
    }
    if (assessmentName) {
        whereClauses.push(`a.assessment_name = $${paramIdx++}`);
        params.push(assessmentName);
    }
    if (year) {
        whereClauses.push(`s.year = $${paramIdx++}`);
        params.push(parseInt(year));
    }

    const whereStr = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const countQuery = `
        SELECT COUNT(*) as count 
        FROM student_assessments a
        LEFT JOIN students s ON s.roll_no = a.roll_no
        ${whereStr}
    `;
    const countRes = await query(countQuery, params);
    const totalRecords = parseInt(countRes.rows[0].count);

    const selectParams = [...params, parseInt(limit), offset];
    const dataQuery = `
        SELECT a.id, a.roll_no, s.name, s.year, a.subject, a.assessment_name, a.marks, a.max_marks, a.percentage, a.upload_date
        FROM student_assessments a
        LEFT JOIN students s ON s.roll_no = a.roll_no
        ${whereStr}
        ORDER BY a.upload_date DESC, a.roll_no ASC
        LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;

    const dataRes = await query(dataQuery, selectParams);

    const subjectsRes = await query('SELECT DISTINCT subject FROM student_assessments ORDER BY subject');
    const datesRes = await query('SELECT DISTINCT assessment_name FROM student_assessments ORDER BY assessment_name');

    res.json({
        total: totalRecords,
        pages: Math.ceil(totalRecords / parseInt(limit)),
        page: parseInt(page),
        assessments: dataRes.rows.map(r => ({
            id: r.id,
            rollNo: r.roll_no,
            name: r.name || r.roll_no,
            year: r.year || 4,
            subject: r.subject,
            assessmentName: r.assessment_name,
            marks: parseFloat(r.marks),
            maxMarks: parseFloat(r.max_marks),
            percentage: parseFloat(r.percentage),
            uploadDate: r.upload_date
        })),
        allSubjects: subjectsRes.rows.map(r => r.subject).filter(Boolean),
        allDates: datesRes.rows.map(r => r.assessment_name).filter(Boolean)
    });
};

// Delete uploaded assessment batch (Admin)
exports.deleteAssessmentUpload = async (req, res) => {
    const { id } = req.params;
    const client = await getClient();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM uploads WHERE id = $1', [id]);
        await client.query('COMMIT');
        res.json({ message: 'Assessment upload deleted successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: 'Database error: ' + err.message });
    } finally {
        client.release();
    }
};
