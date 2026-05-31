import { readFileSync, writeFileSync } from 'fs';

const filePath = './frontend/src/pages/student/Dashboard.jsx';
let src = readFileSync(filePath, 'utf8');
const lines = src.split('\n');

// Lines 779-783 (0-indexed: 778-782) are broken leftover fragments
// They are:
// line 779: "                                                />"
// line 780: "                                            </div>"
// line 781: "                                        </div>"
// line 782: "                                    )}"
// line 783: "                                </div>"
//
// We need to replace lines 778 (the opening div) through 784 with:
// line 778: opening div
// line 779: h2 title
// line 780: chart
// line 781: closing div

const before = lines.slice(0, 777); // lines 1-777 (0-indexed 0-776)
const middle = [
    '                            {/* \u2500\u2500 Cumulative attendance trend \u2500\u2500 */}',
    '                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm">',
    '                                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Cumulative CRT Attendance Trend</h2>',
    '                                <ReactApexChart options={lineOpts} series={[{ name: \'Attendance %\', data: slicedAvgs }]} type="area" />',
    '                            </div>',
];
const after = lines.slice(786); // from line 787 onwards (0-indexed 786+)

const combined = [...before, ...middle, ...after];
writeFileSync(filePath, combined.join('\n'), 'utf8');
console.log('Fixed! Total lines now:', combined.length);
