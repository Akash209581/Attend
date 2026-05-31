const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

function debugExcel(filePath) {
    console.log('\n=== Debugging:', filePath, '===');
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    console.log('Total rows:', raw.length);
    console.log('\nFirst 8 rows:');
    for (let i = 0; i < Math.min(8, raw.length); i++) {
        const row = raw[i];
        const nonNull = (row || []).filter(c => c !== null && c !== undefined && String(c).trim() !== '');
        console.log(`Row ${i}: [${nonNull.slice(0, 6).join(' | ')}] ... (${nonNull.length} non-null cells)`);
    }

    console.log('\nLooking for REGD.NO header...');
    for (let i = 0; i < Math.min(10, raw.length); i++) {
        const row = raw[i];
        if (row) {
            for (let j = 0; j < row.length; j++) {
                const cell = row[j];
                if (cell && String(cell).toUpperCase().includes('REGD')) {
                    console.log(`  Found at row ${i}, col ${j}: "${cell}"`);
                }
            }
        }
    }

    // Check a data row
    console.log('\nRow 5 (potential data):');
    if (raw[5]) {
        raw[5].slice(0, 10).forEach((c, i) => {
            if (c !== null && c !== undefined) console.log(`  col ${i}: "${c}"`);
        });
    }
}

debugExcel(path.join(__dirname, 'CRT Day wise.xlsx'));
debugExcel(path.join(__dirname, '4year.xlsx'));
