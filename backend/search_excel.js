const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const files = [
    '23-3rdyear.xlsx',
    '23-4thyear.xlsx',
    '4year.xlsx',
    'CRT Day wise.xlsx',
    'asses.xlsx'
];

const studentRoll = '231FA04899';

files.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (!fs.existsSync(filePath)) {
        console.log(`File does not exist: ${filePath}`);
        return;
    }
    
    try {
        const buffer = fs.readFileSync(filePath);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        
        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
            
            raw.forEach((row, idx) => {
                if (!row) return;
                const match = row.some(cell => cell && String(cell).toUpperCase().includes(studentRoll));
                if (match) {
                    console.log(`\nFile: ${file} | Sheet: ${sheetName} | Row: ${idx}`);
                    row.forEach((cell, cIdx) => {
                        if (cell !== null && cell !== undefined) {
                            console.log(`  Col ${cIdx}: "${cell}"`);
                        }
                    });
                }
            });
        });
    } catch (err) {
        console.error(`Error reading ${file}:`, err.message);
    }
});
