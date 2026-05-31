import { readFileSync, writeFileSync } from 'fs';

const filePath = './frontend/src/pages/student/Dashboard.jsx';
let src = readFileSync(filePath, 'utf8');
const lines = src.split('\n');

console.log('Total lines:', lines.length);
// Print lines 775-795 to see the broken section
for (let i = 775; i <= Math.min(795, lines.length); i++) {
    console.log(`${i}: ${JSON.stringify(lines[i-1])}`);
}
