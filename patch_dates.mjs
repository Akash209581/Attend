import { readFileSync, writeFileSync } from 'fs';

const filePath = './frontend/src/pages/student/Dashboard.jsx';
let src = readFileSync(filePath, 'utf8');

// 1. Add dateFrom / dateTo state after historyView state
src = src.replace(
    `const [historyView, setHistoryView] = useState('all'); // 'all' | 'week' | 'month' | 'module'`,
    `const [historyView, setHistoryView] = useState('all'); // 'all' | 'week' | 'month' | 'module'
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');`
);

// 2. Replace the Week Wise tab section
const weekOld = `                {/* ══════ WEEK WISE TAB ══════ */}
                {tab === 'week' && (() => {
                    const last7 = Array.from({ length: 7 }, (_, i) => {
                        const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d;
                    });
                    const dayLabels = last7.map(d => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }));
                    const realMap = {};
                    history.forEach(h => { realMap[new Date(h.uploadDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })] = h.totalPercentage; });
                    const base = history.length ? Math.round(history.reduce((s, h) => s + h.totalPercentage, 0) / history.length) : 78;
                    const offsets = [0, 3, -2, 5, -4, 2, -1];
                    const lineData = last7.map((d, i) => {
                        const k = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                        return realMap[k] ?? Math.min(99, Math.max(55, base + offsets[i]));
                    });`;

const weekNew = `                {/* ══════ WEEK WISE TAB ══════ */}
                {tab === 'week' && (() => {
                    // Default range: last 7 days
                    const defaultFrom = new Date(); defaultFrom.setDate(defaultFrom.getDate() - 6);
                    const fromDate = dateFrom ? new Date(dateFrom) : defaultFrom;
                    const toDate   = dateTo   ? new Date(dateTo)   : new Date();
                    toDate.setHours(23,59,59,999);

                    // Build day-by-day range
                    const rangeDays = [];
                    const cur = new Date(fromDate);
                    while (cur <= toDate) { rangeDays.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
                    const last7 = rangeDays;
                    const dayLabels = last7.map(d => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }));
                    const realMap = {};
                    history.forEach(h => { realMap[new Date(h.uploadDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })] = h.totalPercentage; });
                    const base = history.length ? Math.round(history.reduce((s, h) => s + h.totalPercentage, 0) / history.length) : 78;
                    const offsets = [0, 3, -2, 5, -4, 2, -1, 4, -3, 1, 6, -5, 2, 3, -1, 4, -2, 5, -3, 2, 1, -1, 3, -2, 4, 1, -3, 2, 5, -1, 0];
                    const lineData = last7.map((d, i) => {
                        const k = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                        return realMap[k] ?? Math.min(99, Math.max(55, base + (offsets[i % offsets.length] || 0)));
                    });`;

src = src.replace(weekOld, weekNew);

// 3. After the stat cards and before the first chart in the Week tab, add the date picker bar
// We inject it right after the opening <div className="space-y-4"> in the week return block
const weekStatCardOld = `                    return (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                                {[{l:'Weekly Avg',v:avg+'%',c:avg>=75?'emerald':'rose'},{l:'Peak Day',v:Math.max(...lineData)+'%',c:'indigo'},{l:'Lowest Day',v:Math.min(...lineData)+'%',c:'amber'}].map(({l,v,c})=>(
                                    <div key={l} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
                                        <p className="text-xs text-slate-400 mb-1">{l}</p>
                                        <p className={\`text-2xl font-bold text-\${c}-500\`}>{v}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Daily Attendance Trend — This Week</h2>
                                <p className="text-xs text-slate-400 mb-3">Red line = 75% threshold · Dots = upload / estimated values</p>`;

const weekStatCardNew = `                    return (
                        <div className="space-y-4">
                            {/* ── Date range picker ── */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-end gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">From Date</label>
                                    <input type="date" value={dateFrom}
                                        max={dateTo || new Date().toISOString().split('T')[0]}
                                        onChange={e => setDateFrom(e.target.value)}
                                        className="px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">To Date</label>
                                    <input type="date" value={dateTo}
                                        min={dateFrom} max={new Date().toISOString().split('T')[0]}
                                        onChange={e => setDateTo(e.target.value)}
                                        className="px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                </div>
                                <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all">
                                    Reset to Last 7 Days
                                </button>
                                <span className="text-xs text-indigo-500 dark:text-indigo-400 font-medium ml-auto">
                                    {last7.length} day{last7.length !== 1 ? 's' : ''} selected
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {[{l:'Period Avg',v:avg+'%',c:avg>=75?'emerald':'rose'},{l:'Peak Day',v:Math.max(...lineData)+'%',c:'indigo'},{l:'Lowest Day',v:Math.min(...lineData)+'%',c:'amber'}].map(({l,v,c})=>(
                                    <div key={l} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
                                        <p className="text-xs text-slate-400 mb-1">{l}</p>
                                        <p className={\`text-2xl font-bold text-\${c}-500\`}>{v}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Daily Attendance Trend</h2>
                                <p className="text-xs text-slate-400 mb-3">Red line = 75% threshold · Dots = upload / estimated values</p>`;

src = src.replace(weekStatCardOld, weekStatCardNew);

// 4. Replace the Month Wise tab section top (date computation part)
const monthOld = `                {/* ══════ MONTH WISE TAB ══════ */}
                {tab === 'month' && (() => {
                    const weekLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
                    const buckets = [[], [], [], []];
                    history.forEach(h => {
                        const daysAgo = Math.floor((Date.now() - new Date(h.uploadDate)) / 86400000);
                        buckets[daysAgo <= 7 ? 3 : daysAgo <= 14 ? 2 : daysAgo <= 21 ? 1 : 0].push(h.totalPercentage);
                    });
                    const base = history.length ? Math.round(history.reduce((s, h) => s + h.totalPercentage, 0) / history.length) : 78;
                    const moffs = [-4, 2, -1, 5];
                    const weekAvgs = buckets.map((b, i) => b.length ? Math.round(b.reduce((s, v) => s + v, 0) / b.length) : Math.min(99, Math.max(55, base + moffs[i])));`;

const monthNew = `                {/* ══════ MONTH WISE TAB ══════ */}
                {tab === 'month' && (() => {
                    // Default range: last 30 days
                    const defaultFrom = new Date(); defaultFrom.setDate(defaultFrom.getDate() - 29);
                    const mFromDate = dateFrom ? new Date(dateFrom) : defaultFrom;
                    const mToDate   = dateTo   ? new Date(dateTo)   : new Date();
                    mToDate.setHours(23,59,59,999);
                    const totalDays = Math.max(1, Math.round((mToDate - mFromDate) / 86400000) + 1);
                    const weekSize  = Math.ceil(totalDays / 4);
                    const weekLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

                    // Bucket history records into 4 equal segments of the selected range
                    const buckets = [[], [], [], []];
                    history.forEach(h => {
                        const d = new Date(h.uploadDate);
                        if (d < mFromDate || d > mToDate) return;
                        const daysFromStart = Math.floor((d - mFromDate) / 86400000);
                        const idx = Math.min(3, Math.floor(daysFromStart / weekSize));
                        buckets[idx].push(h.totalPercentage);
                    });
                    const base = history.length ? Math.round(history.reduce((s, h) => s + h.totalPercentage, 0) / history.length) : 78;
                    const moffs = [-4, 2, -1, 5];
                    const weekAvgs = buckets.map((b, i) => b.length ? Math.round(b.reduce((s, v) => s + v, 0) / b.length) : Math.min(99, Math.max(55, base + moffs[i])));`;

src = src.replace(monthOld, monthNew);

// 5. Inject date picker into Month tab return block
const monthReturnOld = `                    return (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                                {[{l:'Monthly Avg',v:monthAvg+'%',c:monthAvg>=75?'emerald':'rose'},{l:'Best Week',v:Math.max(...weekAvgs)+'%',c:'indigo'},{l:'Worst Week',v:Math.min(...weekAvgs)+'%',c:'amber'}].map(({l,v,c})=>(
                                    <div key={l} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
                                        <p className="text-xs text-slate-400 mb-1">{l}</p>
                                        <p className={\`text-2xl font-bold text-\${c}-500\`}>{v}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Week-by-Week Trend — This Month</h2>
                                <p className="text-xs text-slate-400 mb-3">Area curve through weekly averages · Red = 75%</p>`;

const monthReturnNew = `                    return (
                        <div className="space-y-4">
                            {/* ── Date range picker ── */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-end gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">From Date</label>
                                    <input type="date" value={dateFrom}
                                        max={dateTo || new Date().toISOString().split('T')[0]}
                                        onChange={e => setDateFrom(e.target.value)}
                                        className="px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">To Date</label>
                                    <input type="date" value={dateTo}
                                        min={dateFrom} max={new Date().toISOString().split('T')[0]}
                                        onChange={e => setDateTo(e.target.value)}
                                        className="px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                                </div>
                                <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all">
                                    Reset to Last 30 Days
                                </button>
                                <span className="text-xs text-violet-500 dark:text-violet-400 font-medium ml-auto">
                                    {totalDays} day{totalDays !== 1 ? 's' : ''} selected · 4 equal segments
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {[{l:'Period Avg',v:monthAvg+'%',c:monthAvg>=75?'emerald':'rose'},{l:'Best Segment',v:Math.max(...weekAvgs)+'%',c:'indigo'},{l:'Worst Segment',v:Math.min(...weekAvgs)+'%',c:'amber'}].map(({l,v,c})=>(
                                    <div key={l} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
                                        <p className="text-xs text-slate-400 mb-1">{l}</p>
                                        <p className={\`text-2xl font-bold text-\${c}-500\`}>{v}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Attendance Trend — Selected Period</h2>
                                <p className="text-xs text-slate-400 mb-3">Area curve through 4 equal segments · Red = 75%</p>`;

src = src.replace(monthReturnOld, monthReturnNew);

writeFileSync(filePath, src, 'utf8');
console.log('Patched! File size:', src.length, 'bytes');
