import { readFileSync, writeFileSync } from 'fs';

/* ═══════════════════════════════════════════════════════
   PATCH 1 – Student Dashboard: "Classes Needed" banner
   Inject after the Subject Table section (tab === 'table')
═══════════════════════════════════════════════════════ */
const dashPath = './frontend/src/pages/student/Dashboard.jsx';
let dash = readFileSync(dashPath, 'utf8');

// Find the Subject Table tab closing tag so we can inject after it
// We look for the closing of tab === 'table' block which ends with         )}
// Inject the calculator just before the History tab comment
const historyMarker = `                {/* ── History Tab (all records) ── */}`;

const classCalcBlock = `                {/* ── Classes Needed Calculator ── */}
                {subjects.some(s => (s.percentage ?? 0) < 75) && tab !== 'charts' && tab !== 'table' ? null : (() => {
                    const lowSubs = subjects.filter(s => (s.percentage ?? 0) < 75);
                    if (!lowSubs.length) return null;
                    return (
                        <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-rose-500 text-lg">⚠️</span>
                                <h2 className="text-sm font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wide">Classes Needed to Reach 75%</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {lowSubs.map((s, i) => {
                                    const attended = s.attended ?? Math.round((s.percentage / 100) * (s.total ?? 100));
                                    const total    = s.total ?? 100;
                                    const needed   = Math.max(0, Math.ceil((0.75 * total - attended) / 0.25));
                                    const afterPct = total + needed > 0 ? Math.round(((attended + needed) / (total + needed)) * 100) : 0;
                                    const urgency  = needed <= 3 ? 'amber' : 'rose';
                                    return (
                                        <div key={i} className={\`bg-white dark:bg-slate-900 rounded-xl p-4 border border-\${urgency}-100 dark:border-\${urgency}-900/30 shadow-sm\`}>
                                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 truncate">{s.subject}</p>
                                            <div className="flex items-end justify-between gap-2">
                                                <div>
                                                    <p className={\`text-2xl font-black text-\${urgency}-500\`}>{needed}</p>
                                                    <p className="text-xs text-slate-400">consecutive class{needed !== 1 ? 'es' : ''}</p>
                                                </div>
                                                <div className="text-right text-xs text-slate-400">
                                                    <p>Now: <span className="font-bold text-rose-500">{s.percentage ?? 0}%</span></p>
                                                    <p>After: <span className="font-bold text-emerald-500">{afterPct}%</span></p>
                                                    <p className="mt-1 text-slate-300">({attended}/{total} classes)</p>
                                                </div>
                                            </div>
                                            <div className="mt-3 w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full bg-rose-400 transition-all" style={{ width: \`\${s.percentage ?? 0}%\` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}

`;

dash = dash.replace(historyMarker, classCalcBlock + historyMarker);
writeFileSync(dashPath, dash, 'utf8');
console.log('[1] Student classes-needed patch done. Size:', dash.length);
