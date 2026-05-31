const fs = require('fs');
const XLSX = require('xlsx');
const path = require('path');

const parseBatchCell = (val) => {
    if (!val || val === '-' || String(val).trim() === '') return null;
    const str = String(val).trim();
    // Try: name(attended)(total)(percentage)
    const match3 = str.match(/^(.*?)\((\d+)\)\((\d+)\)\((\d+\.?\d*)\)$/);
    if (match3) {
        return {
            batchName: match3[1].trim(),
            percentage: parseFloat(match3[4])
        };
    }
    // Try: name(attended)(percentage)
    const match2 = str.match(/^(.*?)\((\d+)\)\((\d+\.?\d*)\)$/);
    if (match2) {
        return {
            batchName: match2[1].trim(),
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
        throw new Error('Could not find header row.');
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
        throw new Error('Could not find RegisterNO column.');
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
};

['../23-3rdyear.xlsx', '../23-4thyear.xlsx'].forEach(f => {
    console.log('\n--- Parsing file:', f);
    try {
        const buf = fs.readFileSync(path.resolve(__dirname, f));
        const parsed = parseExcelBuffer(buf);
        console.log('Total records parsed:', parsed.records.length);
        console.log('Record 0:', JSON.stringify(parsed.records[0], null, 2));
        console.log('Record 1:', JSON.stringify(parsed.records[1], null, 2));
    } catch(e) {
        console.error('Error parsing:', e.message);
    }
});
