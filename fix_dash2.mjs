import { readFileSync, writeFileSync } from 'fs';

const filePath = './frontend/src/pages/student/Dashboard.jsx';
let src = readFileSync(filePath, 'utf8');
const lines = src.split('\n');

console.log('Total lines:', lines.length);
// Print lines 770-796 to see the section
for (let i = 770; i <= Math.min(796, lines.length); i++) {
    console.log(`${i}: ${lines[i-1]}`);
}

// Fix: remove duplicate comment on line 777 (0-indexed 776)
// Line 777: "{/* ── Cumulative attendance trend ── */}"  <-- duplicate, remove
// Line 778: "{/* ── Cumulative attendance trend ── */}"  <-- keep

const before = lines.slice(0, 776); // 1-776
const after = lines.slice(777);     // 778 onwards (skip line 777)

const combined = [...before, ...after];
writeFileSync(filePath, combined.join('\n'), 'utf8');
console.log('\nFixed duplicate comment! Total lines now:', combined.length);
