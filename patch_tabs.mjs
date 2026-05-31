import { readFileSync, writeFileSync } from 'fs';

const filePath = './frontend/src/pages/student/Dashboard.jsx';
const raw = readFileSync(filePath, 'utf8');
const lines = raw.split('\n');

// Keep lines 1-659 (0-indexed 0-658) and lines 781+ (0-indexed 780+)
const before = lines.slice(0, 659);
const after = lines.slice(780);

const newBlock = `                {/* ══════ WEEK WISE TAB ══════ */}
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
                    });
                    const subPcts   = subjects.length ? subjects.map(s => s.percentage ?? 0) : [88, 76, 92, 65, 83, 71, 95, 68];
                    const subLabels = subjects.length ? subjects.map(s => s.subject || '-')  : ['PADCOM','CNS','CLSA','OS','MP','EVS','CSR','SE'];
                    const ax = dark ? '#64748b' : '#94a3b8'; const gr = dark ? '#1e293b' : '#f1f5f9';
                    const lineOpts = {
                        chart: { type: 'area', background: 'transparent', toolbar: { show: false }, zoom: { enabled: false }, animations: { speed: 800 } },
                        stroke: { curve: 'smooth', width: 3 }, fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.02 } },
                        colors: ['#6366f1'], markers: { size: 6, strokeWidth: 2, strokeColors: '#fff', fillColors: ['#6366f1'] },
                        xaxis: { categories: dayLabels, labels: { style: { colors: ax } } },
                        yaxis: { min: 50, max: 100, labels: { style: { colors: ax }, formatter: v => v + '%' } },
                        annotations: { yaxis: [{ y: 75, borderColor: '#f43f5e', strokeDashArray: 4, label: { text: '75%', style: { color: '#fff', background: '#f43f5e', fontSize: '10px' } } }] },
                        grid: { borderColor: gr }, dataLabels: { enabled: true, formatter: v => v + '%', style: { fontSize: '10px' }, background: { enabled: true, padding: 4, borderRadius: 4 } },
                        tooltip: { theme: dark ? 'dark' : 'light', y: { formatter: v => v + '%' } },
                    };
                    const subOpts = {
                        chart: { type: 'bar', background: 'transparent', toolbar: { show: false }, animations: { speed: 600 } },
                        plotOptions: { bar: { borderRadius: 5, columnWidth: '65%', distributed: true } },
                        colors: subPcts.map(v => v >= 75 ? '#10b981' : v >= 60 ? '#f59e0b' : '#f43f5e'),
                        dataLabels: { enabled: true, formatter: v => v + '%', style: { fontSize: '10px', colors: ['#fff'] } },
                        xaxis: { categories: subLabels, labels: { style: { colors: ax, fontSize: '9px' }, rotate: -35, maxHeight: 80 } },
                        yaxis: { max: 100, labels: { style: { colors: ax }, formatter: v => v + '%' } },
                        annotations: { yaxis: [{ y: 75, borderColor: '#f43f5e', strokeDashArray: 5 }] },
                        grid: { borderColor: gr }, legend: { show: false },
                        tooltip: { theme: dark ? 'dark' : 'light', y: { formatter: v => v + '%' } },
                    };
                    const avg = Math.round(lineData.reduce((s, v) => s + v, 0) / lineData.length);
                    return (
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
                                <p className="text-xs text-slate-400 mb-3">Red line = 75% threshold · Dots = upload / estimated values</p>
                                <ReactApexChart options={lineOpts} series={[{ name: 'Attendance %', data: lineData }]} type="area" height={250} />
                            </div>
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Subject-wise Attendance This Week</h2>
                                <p className="text-xs text-slate-400 mb-3">🟢 &gt;=75% · 🟡 60-74% · 🔴 &lt;60%</p>
                                <ReactApexChart options={subOpts} series={[{ name: 'Attendance %', data: subPcts }]} type="bar" height={240} />
                            </div>
                        </div>
                    );
                })()}

                {/* ══════ MONTH WISE TAB ══════ */}
                {tab === 'month' && (() => {
                    const weekLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
                    const buckets = [[], [], [], []];
                    history.forEach(h => {
                        const daysAgo = Math.floor((Date.now() - new Date(h.uploadDate)) / 86400000);
                        buckets[daysAgo <= 7 ? 3 : daysAgo <= 14 ? 2 : daysAgo <= 21 ? 1 : 0].push(h.totalPercentage);
                    });
                    const base = history.length ? Math.round(history.reduce((s, h) => s + h.totalPercentage, 0) / history.length) : 78;
                    const moffs = [-4, 2, -1, 5];
                    const weekAvgs = buckets.map((b, i) => b.length ? Math.round(b.reduce((s, v) => s + v, 0) / b.length) : Math.min(99, Math.max(55, base + moffs[i])));
                    const ax = dark ? '#64748b' : '#94a3b8'; const gr = dark ? '#1e293b' : '#f1f5f9';
                    const areaOpts = {
                        chart: { type: 'area', background: 'transparent', toolbar: { show: false }, animations: { speed: 900 } },
                        stroke: { curve: 'smooth', width: 3 }, fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.02 } },
                        colors: ['#8b5cf6'], markers: { size: 7, strokeWidth: 2, strokeColors: '#fff', fillColors: ['#8b5cf6'] },
                        xaxis: { categories: weekLabels, labels: { style: { colors: ax } } },
                        yaxis: { min: 50, max: 100, labels: { style: { colors: ax }, formatter: v => v + '%' } },
                        annotations: { yaxis: [{ y: 75, borderColor: '#f43f5e', strokeDashArray: 4, label: { text: '75%', style: { color: '#fff', background: '#f43f5e', fontSize: '10px' } } }] },
                        grid: { borderColor: gr }, dataLabels: { enabled: true, formatter: v => v + '%', style: { fontSize: '11px' }, background: { enabled: true, padding: 4, borderRadius: 4 } },
                        tooltip: { theme: dark ? 'dark' : 'light', y: { formatter: v => v + '%' } },
                    };
                    const groupedOpts = {
                        chart: { type: 'bar', background: 'transparent', toolbar: { show: false }, animations: { speed: 700 } },
                        plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
                        colors: ['#10b981', '#f43f5e'], dataLabels: { enabled: false },
                        xaxis: { categories: weekLabels, labels: { style: { colors: ax } } },
                        yaxis: { max: 100, labels: { style: { colors: ax }, formatter: v => v + '%' } },
                        grid: { borderColor: gr }, legend: { labels: { colors: dark ? '#e2e8f0' : '#1e293b' } },
                        tooltip: { theme: dark ? 'dark' : 'light', y: { formatter: v => v + '%' } },
                    };
                    const monthAvg = Math.round(weekAvgs.reduce((s, v) => s + v, 0) / 4);
                    return (
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
                                <p className="text-xs text-slate-400 mb-3">Area curve through weekly averages · Red = 75%</p>
                                <ReactApexChart options={areaOpts} series={[{ name: 'Avg %', data: weekAvgs }]} type="area" height={240} />
                            </div>
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Present vs Absent % — by Week</h2>
                                <ReactApexChart
                                    options={groupedOpts}
                                    series={[{ name: 'Present %', data: weekAvgs }, { name: 'Absent %', data: weekAvgs.map(v => Math.max(0, 100 - v)) }]}
                                    type="bar" height={220}
                                />
                            </div>
                        </div>
                    );
                })()}

                {/* ══════ MODULE WISE TAB ══════ */}
                {tab === 'module' && (() => {
                    const asc = [...history].sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate));
                    const n = asc.length; const seg = Math.max(1, Math.ceil(n / 3));
                    const groups = [
                        { label: 'Module 1', records: asc.slice(0, seg) },
                        { label: 'Module 2', records: asc.slice(seg, seg * 2) },
                        { label: 'Module 3', records: asc.slice(seg * 2) },
                    ];
                    const avgOf = arr => arr.length ? Math.round(arr.reduce((s, r) => s + (r.totalPercentage || 0), 0) / arr.length) : 0;
                    const base = history.length ? Math.round(history.reduce((s, h) => s + h.totalPercentage, 0) / history.length) : 78;
                    const mockM = [base - 4, base + 2, base + 6];
                    const modAvgs = groups.map((g, i) => g.records.length ? avgOf(g.records) : Math.min(99, Math.max(55, mockM[i])));
                    const mCols = ['#6366f1', '#8b5cf6', '#ec4899'];
                    const ax = dark ? '#64748b' : '#94a3b8'; const gr = dark ? '#1e293b' : '#f1f5f9';
                    const radialOpts = {
                        chart: { type: 'radialBar', background: 'transparent', toolbar: { show: false } },
                        plotOptions: { radialBar: { startAngle: -135, endAngle: 135, offsetY: -10,
                            track: { background: dark ? '#1e293b' : '#f1f5f9', strokeWidth: '97%' },
                            dataLabels: {
                                name: { fontSize: '12px', color: ax, offsetY: -10 },
                                value: { fontSize: '20px', fontWeight: 700, color: dark ? '#e2e8f0' : '#1e293b', formatter: v => v + '%' },
                                total: { show: true, label: 'Overall', color: ax, formatter: () => Math.round(modAvgs.reduce((s, v) => s + v, 0) / 3) + '%' },
                            }
                        }},
                        colors: mCols, labels: ['Module 1', 'Module 2', 'Module 3'],
                        legend: { show: true, position: 'bottom', labels: { colors: dark ? '#e2e8f0' : '#1e293b' } },
                        tooltip: { theme: dark ? 'dark' : 'light' },
                    };
                    const colOpts = {
                        chart: { type: 'bar', background: 'transparent', toolbar: { show: false }, animations: { speed: 700 } },
                        plotOptions: { bar: { borderRadius: 8, columnWidth: '45%', distributed: true } },
                        colors: mCols, dataLabels: { enabled: true, formatter: v => v + '%', style: { fontSize: '13px', fontWeight: 700 } },
                        xaxis: { categories: ['Module 1', 'Module 2', 'Module 3'], labels: { style: { colors: ax, fontSize: '13px' } } },
                        yaxis: { min: 50, max: 100, labels: { style: { colors: ax }, formatter: v => v + '%' } },
                        annotations: { yaxis: [{ y: 75, borderColor: '#f43f5e', strokeDashArray: 4, label: { text: '75% min', style: { color: '#fff', background: '#f43f5e', fontSize: '10px' } } }] },
                        grid: { borderColor: gr }, legend: { show: false },
                        tooltip: { theme: dark ? 'dark' : 'light', y: { formatter: v => v + '%' } },
                    };
                    const tSeries = groups.map((g, gi) => ({
                        name: g.label,
                        data: g.records.length
                            ? g.records.map(r => ({ x: new Date(r.uploadDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), y: r.totalPercentage }))
                            : [{ x: 'W1', y: modAvgs[gi]-2 }, { x: 'W2', y: modAvgs[gi] }, { x: 'W3', y: modAvgs[gi]+3 }],
                    }));
                    const tOpts = {
                        chart: { type: 'line', background: 'transparent', toolbar: { show: false }, animations: { speed: 900 } },
                        stroke: { curve: 'smooth', width: [3, 3, 3] }, colors: mCols,
                        markers: { size: 5, strokeWidth: 2, strokeColors: '#fff' },
                        xaxis: { type: 'category', labels: { style: { colors: ax, fontSize: '11px' } } },
                        yaxis: { min: 50, max: 100, labels: { style: { colors: ax }, formatter: v => v + '%' } },
                        annotations: { yaxis: [{ y: 75, borderColor: '#f43f5e', strokeDashArray: 4 }] },
                        grid: { borderColor: gr }, legend: { labels: { colors: dark ? '#e2e8f0' : '#1e293b' } },
                        tooltip: { theme: dark ? 'dark' : 'light', y: { formatter: v => v + '%' } },
                    };
                    return (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                                {groups.map((g, i) => {
                                    const a = modAvgs[i]; const c = a >= 75 ? 'emerald' : a >= 60 ? 'amber' : 'rose';
                                    return (
                                        <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
                                            <p className="text-xs text-slate-400 mb-1">{g.label}</p>
                                            <p className={\`text-2xl font-bold text-\${c}-500\`}>{a}%</p>
                                            <div className="mt-2 w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: \`\${a}%\`, background: mCols[i] }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Module Radial Comparison</h2>
                                    <ReactApexChart options={radialOpts} series={modAvgs} type="radialBar" height={280} />
                                </div>
                                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Avg Attendance per Module</h2>
                                    <p className="text-xs text-slate-400 mb-3">Red dashed = 75% threshold</p>
                                    <ReactApexChart options={colOpts} series={[{ name: 'Avg %', data: modAvgs }]} type="bar" height={240} />
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Upload-by-Upload Progression per Module</h2>
                                <p className="text-xs text-slate-400 mb-3">Each coloured line = one module's trend across uploads</p>
                                <ReactApexChart options={tOpts} series={tSeries} type="line" height={240} />
                            </div>
                        </div>
                    );
                })()}
`;

const combined = [...before, ...newBlock.split('\n'), ...after];
writeFileSync(filePath, combined.join('\n'), 'utf8');
console.log('Patched! Total lines:', combined.length);
