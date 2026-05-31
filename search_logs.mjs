import { readFileSync } from 'fs';

const logPath = 'C:/Users/banda/.gemini/antigravity-ide/brain/bd30f2cc-7fcd-4d41-afaf-4af452e1a6c1/.system_generated/logs/transcript.jsonl';
const log = readFileSync(logPath, 'utf8');

const occurrences = [];
log.split('\n').forEach((line, idx) => {
    if (line.includes('Net change') || line.includes('previous day') || line.includes('compared to')) {
        occurrences.push({ lineNum: idx + 1, snippet: line.slice(0, 200) });
    }
});

console.log('Occurrences found:', occurrences.length);
occurrences.forEach(o => console.log(`Line ${o.lineNum}: ${o.snippet}`));
