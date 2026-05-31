const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

function debugExcel(filePath) {
    console.log('\n=== Debugging:', filePath, '===');
    if (!fs.existsSync(filePath)) { console.log('File not found!'); return; }
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    console.log('Total rows:', raw.length);
    console.log('\nFirst 8 rows (first 8 non-null cells each):');
    for (let i = 0; i < Math.min(8, raw.length); i++) {
        const row = raw[i];
        const nonNull = (row || []).filter(c => c !== null && c !== undefined && String(c).trim() !== '');
        console.log(`Row ${i}: [${nonNull.slice(0, 6).map(c => String(c).substring(0, 30)).join(' | ')}] ... (${nonNull.length} cells)`);
    }

    console.log('\nLooking for REGD/REG header...');
    for (let i = 0; i < Math.min(10, raw.length); i++) {
        const row = raw[i];
        if (row) {
            for (let j = 0; j < row.length; j++) {
                const cell = row[j];
                if (cell && String(cell).toUpperCase().includes('REG')) {
                    console.log(`  Found at row ${i}, col ${j}: "${cell}"`);
                }
            }
        }
    }
}

debugExcel('C:\\Users\\banda\\Desktop\\attend\\CRT Day wise.xlsx');
debugExcel('C:\\Users\\banda\\Desktop\\attend\\4year.xlsx');
