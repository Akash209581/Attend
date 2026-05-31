import { readFileSync, writeFileSync } from 'fs';

const filePath = './frontend/src/pages/student/Dashboard.jsx';
const raw = readFileSync(filePath, 'utf8');
const lines = raw.split('\n');

// 1-indexed lines 587 to 781 (0-indexed indices 586 to 780)
const before = lines.slice(0, 586);
const after = lines.slice(781);

const combined = [...before, ...after];
writeFileSync(filePath, combined.join('\n'), 'utf8');
console.log('Cleaned Dashboard.jsx! Total lines now:', combined.length);
