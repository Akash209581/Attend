const XLSX = require('xlsx');

// ─── Helper: parse subject value like "14(70.00%)" or "14(22)(70.00%)" ──────
const parseSubjectValue = (val) => {
    if (!val || val === '-' || val === '') return null;
    const str = String(val).trim();
    const match = str.match(/^(\d+)(?:\((\d+)\))?\((\d+\.?\d*)%\)$/);
    if (!match) return null;
    return {
        attended: parseInt(match[1]),
        total: match[2] ? parseInt(match[2]) : null,
        percentage: parseFloat(match[3])
    };
};

const parseBatchCell = (val) => {
    if (!val || val === '-' || String(val).trim() === '') return null;
    const str = String(val).trim();
    const match3 = str.match(/^(.*?)\((\d+)\)\((\d+)\)\((\d+\.?\d*)\)$/);
    if (match3) {
        return {
            batchName: match3[1].trim(),
            attended: parseInt(match3[2]),
            total: parseInt(match3[3]),
            percentage: parseFloat(match3[4])
        };
    }
    const match2 = str.match(/^(.*?)\((\d+)\)\((\d+\.?\d*)\)$/);
    if (match2) {
        return {
            batchName: match2[1].trim(),
            attended: parseInt(match2[2]),
            total: null,
            percentage: parseFloat(match2[3])
        };
    }
    return {
        batchName: str,
        percentage: null
    };
};

// Simulated parseExcelBuffer with the new changes
const parseExcelBufferSim = (buffer, totalSlots = 3) => {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    let headerRowIdx = 0; // standard header at index 0 for mock
    let headerRow = raw[0];
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

    const regIdx = findColIdx(['registerno', 'regno', 'regd', 'rollno', 'roll_no']);
    const nameIdx = findColIdx(['name']);
    const batchIdx = findColIdx(['batchname', 'batch_name', 'batch']);
    const pctIdx = findColIdx(['attendancepercentage', 'attendance_percentage', 'percentage', 'attendance', 'pct', 'total']);

    const records = [];

    for (let i = 1; i < raw.length; i++) {
        const row = raw[i];
        if (!row) continue;

        const rollNo = regIdx >= 0 && row[regIdx] !== null ? String(row[regIdx]).trim().toUpperCase() : '';
        const name = nameIdx >= 0 && row[nameIdx] ? String(row[nameIdx]).trim() : '';
        const rawBatchVal = batchIdx >= 0 && row[batchIdx] ? String(row[batchIdx]).trim() : 'CRT';
        
        const parsedBatch = parseBatchCell(rawBatchVal) || { batchName: rawBatchVal, percentage: null };
        const batchName = parsedBatch.batchName;

        let attended = 0;
        let total = totalSlots;

        if (parsedBatch && parsedBatch.attended !== undefined && parsedBatch.attended !== null) {
            attended = parsedBatch.attended;
            if (parsedBatch.total !== undefined && parsedBatch.total !== null) {
                total = parsedBatch.total;
            } else if (parsedBatch.percentage !== null && parsedBatch.percentage > 0) {
                total = Math.round(attended / (parsedBatch.percentage / 100));
            } else {
                total = totalSlots;
            }
        } else {
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

            if (pct > 0 && pct <= 1.0) {
                pct = pct * 100;
            }

            attended = Math.round((pct / 100) * totalSlots);
            total = totalSlots;
        }

        if (total <= 0) {
            total = totalSlots;
        }

        const calculatedPct = total > 0 ? Math.round((attended / total) * 10000) / 100 : 0;

        const subjects = [{
            subject: batchName,
            attended: attended,
            total: total,
            percentage: calculatedPct,
            batchName: batchName
        }];

        records.push({
            rollNo,
            name,
            totalPercentage: calculatedPct,
            subjects,
        });
    }

    return { records };
};

// ─── Test Execution ────────────────────────────────────────────────────────
function runTest() {
    console.log('Running simulated Excel parser test...');
    
    // Create a mock workbook in memory
    const headers = ['SL', 'RegisterNO', 'Name', 'Batch', 'Total'];
    const rows = [
        [1, '231FA04899', 'mulpuri mukunda naga datta sarma', 'CSE - Batch - 3(1)(33.33)', '100'], // 1 attended, 33.33% daily, cumulative in Total is 100
        [2, '231FA04999', 'test student 2', 'CSE - Batch - 3(3)(100.00)', '100'],
        [3, '231FA04000', 'absent student', 'CSE - Batch - 3(0)(0.00)', '0']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // Parse using our updated logic
    const { records } = parseExcelBufferSim(buffer, 3);
    
    console.log('\nParsed Records:');
    records.forEach(r => {
        console.log(`Student: ${r.name} (${r.rollNo})`);
        r.subjects.forEach(s => {
            console.log(`  Subject: "${s.subject}" | Attended: ${s.attended} | Total: ${s.total} | Daily Pct: ${s.percentage}%`);
        });
    });
    
    // Validate output
    const r1 = records.find(r => r.rollNo === '231FA04899');
    const s1 = r1.subjects[0];
    if (s1.attended === 1 && s1.total === 3 && s1.percentage === 33.33) {
        console.log('\n✅ TEST PASSED: 1/3 (33.33%) correctly parsed!');
    } else {
        console.error('\n❌ TEST FAILED: parsing is incorrect.', s1);
    }
}

runTest();
