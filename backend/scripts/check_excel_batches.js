const fs = require('fs');
const XLSX = require('xlsx');
const path = require('path');

const parseBatchCell = (val) => {
    if (!val || val === '-' || String(val).trim() === '') return null;
    const str = String(val).trim();
    const match3 = str.match(/^(.*?)\((\d+)\)\((\d+)\)\((\d+\.?\d*)\)$/);
    if (match3) return { batchName: match3[1].trim() };
    const match2 = str.match(/^(.*?)\((\d+)\)\((\d+\.?\d*)\)$/);
    if (match2) return { batchName: match2[1].trim() };
    return { batchName: str };
};

const checkExcel = (filePath) => {
    try {
        const buf = fs.readFileSync(filePath);
        const workbook = XLSX.read(buf, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
        
        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(raw.length, 15); i++) {
            const row = raw[i];
            if (row && row.some(cell => {
                if (!cell) return false;
                const norm = String(cell).toUpperCase().replace(/[.\s_-]/g, '');
                return norm.includes('REGISTERNO') || norm.includes('REGDNO');
            })) {
                headerRowIdx = i;
                break;
            }
        }
        if (headerRowIdx === -1) {
            console.log(`Could not find header in ${path.basename(filePath)}`);
            return;
        }
        
        const colMap = {};
        raw[headerRowIdx].forEach((cell, idx) => {
            if (cell) colMap[idx] = String(cell).trim();
        });
        
        const batchIdx = Object.entries(colMap).findIndex(([_, name]) => {
            const lower = name.toLowerCase().replace(/[\s._-]/g, '');
            return ['batchname', 'batch_name', 'batch'].some(k => lower.includes(k));
        });
        
        if (batchIdx === -1) {
            console.log(`No batch column in ${path.basename(filePath)}`);
            return;
        }
        
        const uniqueValues = new Set();
        for (let i = headerRowIdx + 1; i < raw.length; i++) {
            const row = raw[i];
            if (!row) continue;
            const val = row[batchIdx];
            if (val) {
                const parsed = parseBatchCell(val);
                if (parsed) uniqueValues.add(parsed.batchName);
            }
        }
        console.log(`Unique batch names in ${path.basename(filePath)}:`, Array.from(uniqueValues).slice(0, 10), `(Total unique: ${uniqueValues.size})`);
    } catch(err) {
        console.error(`Error reading ${filePath}:`, err.message);
    }
};

checkExcel(path.resolve(__dirname, '../../CRT Day wise.xlsx'));
checkExcel(path.resolve(__dirname, '../../4year.xlsx'));
