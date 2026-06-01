import { useState } from 'react';
import { searchStudents, getStudentDetail } from '../../api';
import { Search as SearchIcon, User, BookOpen, CalendarDays, TrendingUp, History } from 'lucide-react';
import ReactApexChart from 'react-apexcharts';

function AttBadge({ pct }) {
    const color = pct >= 75 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        : pct >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
    return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${color}`}>{pct}%</span>;
}

export default function Search() {
    const [query, setQuery] = useState('');
    const [nameQuery, setNameQuery] = useState('');
    const [results, setResults] = useState([]);
    const [selected, setSelected] = useState(null);
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [activeTab, setActiveTab] = useState('subject'); // 'subject' or 'history'

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query && !nameQuery) return;
        setLoading(true);
        setSelected(null);
        setDetail(null);
        try {
            const { data } = await searchStudents({ rollNo: query, name: nameQuery });
            setResults(data);
            setSearched(true);
            if (data && data.length > 0) {
                handleSelectStudent(data[0]);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSelectStudent = async (student) => {
        setSelected(student);
        setDetail(null);
        setDetailLoading(true);
        try {
            const { data } = await getStudentDetail(student.rollNo);
            setDetail(data);
        } catch (err) {
            console.error('Failed to load student details:', err);
        } finally {
            setDetailLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Search Form */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <SearchIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value.toUpperCase())}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                            placeholder="Search by Roll Number..."
                        />
                    </div>
                    <div className="flex-1 relative">
                        <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={nameQuery}
                            onChange={(e) => setNameQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                            placeholder="Search by Name..."
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60 shrink-0"
                    >
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </form>
            </div>

            {/* Results Grid */}
            {searched && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                    {/* Students List */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden lg:max-h-[700px] overflow-y-auto">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Results ({results.length})</span>
                        </div>
                        {results.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 text-sm">No students found</div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {results.map((s) => (
                                    <button
                                        key={s.id || s._id}
                                        type="button"
                                        onClick={() => handleSelectStudent(s)}
                                        className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between
                                            ${selected?.rollNo === s.rollNo ? 'bg-indigo-50/70 dark:bg-indigo-900/20' : ''}`}
                                    >
                                        <div>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-snug">{s.name}</p>
                                            <p className="text-xs text-indigo-500 font-mono mt-0.5">{s.rollNo}</p>
                                        </div>
                                        <AttBadge pct={s.totalPercentage} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Student Detail Panel */}
                    <div className="lg:col-span-2">
                        {selected ? (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-5">
                                {detailLoading ? (
                                    <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400 dark:text-slate-500">
                                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                        <p className="text-sm font-medium">Loading detailed attendance profiles...</p>
                                    </div>
                                ) : detail ? (
                                    <>
                                        {/* Profile */}
                                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0">
                                                    {detail.profile.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white leading-snug">{detail.profile.name}</h3>
                                                    <p className="text-indigo-500 font-mono text-sm">{detail.profile.rollNo}</p>
                                                    <div className="flex gap-2 mt-1">
                                                        <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">{detail.profile.section}</span>
                                                        <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">Year {detail.profile.year}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-0.5">Overall</span>
                                                <AttBadge pct={detail.profile.totalPercentage} />
                                            </div>
                                        </div>

                                        {(() => {
                                            const crtHistory = [...detail.history]
                                                .filter(h => new Date(h.uploadDate) >= new Date('2026-05-22'))
                                                .sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate));

                                            const dailyValues = crtHistory.map(h => Math.round(parseFloat(h.totalPercentage) || 0));

                                            let runningSum = 0;
                                            const runningAvgs = dailyValues.map((v, i) => {
                                                runningSum += v;
                                                return Math.round(runningSum / (i + 1));
                                            });

                                            const totalDays = crtHistory.length;
                                            const daysPresent = crtHistory.filter(h => Math.round(parseFloat(h.totalPercentage) || 0) > 0).length;
                                            const daysAbsent = crtHistory.filter(h => Math.round(parseFloat(h.totalPercentage) || 0) === 0).length;

                                            const dayLabels = crtHistory.map(h => {
                                                const d = new Date(h.uploadDate);
                                                return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' });
                                            });

                                            const yMinRaw = runningAvgs.length > 0 ? Math.min(...runningAvgs) : 0;
                                            const yAxisMin = Math.max(0, Math.floor((yMinRaw - 5) / 5) * 5);

                                            const lineOpts = {
                                                chart: { type: 'area', height: 160, background: 'transparent', toolbar: { show: false }, zoom: { enabled: false } },
                                                stroke: { curve: 'smooth', width: 3 },
                                                fill: { type: 'gradient', gradient: { opacityFrom: 0.25, opacityTo: 0.01 } },
                                                colors: ['#6366f1'],
                                                markers: { size: 4, strokeWidth: 1.5, strokeColors: '#fff', fillColors: ['#6366f1'] },
                                                xaxis: { categories: dayLabels.length ? dayLabels : ['No data'], labels: { style: { colors: '#94a3b8', fontSize: '9px' }, rotate: -35 } },
                                                yaxis: { min: yAxisMin, max: 100, labels: { style: { colors: '#94a3b8', fontSize: '10px' }, formatter: v => v + '%' } },
                                                grid: { borderColor: '#f1f5f9' },
                                                dataLabels: { enabled: false },
                                                tooltip: { y: { formatter: v => v + '%' } },
                                            };

                                            return (
                                                <div className="space-y-4">
                                                    {/* Stats cards */}
                                                    <div className="grid grid-cols-3 gap-3">
                                                        {[
                                                            { l: 'Total Days', v: totalDays, c: 'indigo' },
                                                            { l: 'Days Attended', v: daysPresent, c: 'emerald' },
                                                            { l: 'Days Absent', v: daysAbsent, c: 'rose' },
                                                        ].map(({ l, v, c }) => (
                                                            <div key={l} className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/50 text-center">
                                                                <p className="text-[10px] text-slate-400 mb-0.5 uppercase tracking-wide">{l}</p>
                                                                <p className={`text-xl font-bold text-${c}-500`}>{v}</p>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Line chart */}
                                                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/50">
                                                        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                                                            <TrendingUp size={14} className="text-indigo-500" /> Cumulative Attendance Trend
                                                        </h4>
                                                        {crtHistory.length === 0 ? (
                                                            <p className="text-sm text-slate-400 text-center py-6">No historical trend data available.</p>
                                                        ) : (
                                                            <ReactApexChart options={lineOpts} series={[{ name: 'Attendance %', data: runningAvgs }]} type="area" height={160} />
                                                        )}
                                                    </div>

                                                    {/* Tab switchers */}
                                                    <div className="flex gap-2 bg-slate-100 dark:bg-slate-850 p-1 rounded-xl w-fit">
                                                        <button
                                                            type="button"
                                                            onClick={() => setActiveTab('subject')}
                                                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                                activeTab === 'subject'
                                                                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                                                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                                            }`}
                                                        >
                                                            <BookOpen size={13} /> Subject-wise
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setActiveTab('history')}
                                                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                                activeTab === 'history'
                                                                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                                                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                                            }`}
                                                        >
                                                            <History size={13} /> Daily Logs
                                                        </button>
                                                    </div>

                                                    {/* Tab Panels */}
                                                    {activeTab === 'subject' ? (
                                                        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/80 rounded-2xl">
                                                            <table className="w-full text-sm">
                                                                <thead>
                                                                    <tr className="bg-slate-50 dark:bg-slate-850/50 border-b border-slate-100 dark:border-slate-800">
                                                                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Subject</th>
                                                                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Attended</th>
                                                                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Total</th>
                                                                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">%</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                                    {detail.subjects.length === 0 ? (
                                                                        <tr>
                                                                            <td colSpan="4" className="text-center py-6 text-slate-400 text-sm">No subject-wise details available.</td>
                                                                        </tr>
                                                                    ) : (
                                                                        detail.subjects.map((sub, i) => (
                                                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-850/40">
                                                                                <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">{sub.subject}</td>
                                                                                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{sub.attended}</td>
                                                                                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{sub.total}</td>
                                                                                <td className="px-4 py-2.5"><AttBadge pct={sub.percentage} /></td>
                                                                            </tr>
                                                                        ))
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    ) : (
                                                        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/80 rounded-2xl">
                                                            <table className="w-full text-sm">
                                                                <thead>
                                                                    <tr className="bg-slate-50 dark:bg-slate-850/50 border-b border-slate-100 dark:border-slate-800">
                                                                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Date</th>
                                                                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Status</th>
                                                                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Daily %</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                                    {detail.history.length === 0 ? (
                                                                        <tr>
                                                                            <td colSpan="3" className="text-center py-6 text-slate-400 text-sm">No daily logs found.</td>
                                                                        </tr>
                                                                    ) : (
                                                                        detail.history.map((h, i) => {
                                                                            const isPresent = h.totalPercentage > 0;
                                                                            const statusColor = isPresent
                                                                                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                                                                : 'text-rose-600 dark:text-rose-400 font-semibold';
                                                                            const statusText = isPresent ? '✓ Present' : '✗ Absent';
                                                                            return (
                                                                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-850/40">
                                                                                    <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300">
                                                                                        {new Date(h.uploadDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                                                                                    </td>
                                                                                    <td className="px-4 py-2.5 text-xs">
                                                                                        <span className={statusColor}>{statusText}</span>
                                                                                    </td>
                                                                                    <td className="px-4 py-2.5 font-mono text-slate-600 dark:text-slate-400">
                                                                                        {h.totalPercentage}%
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </>
                                ) : (
                                    <div className="py-12 text-center text-slate-400 text-sm">Select a student to view details</div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                                <User size={28} className="text-slate-300" />
                                <p className="text-sm font-medium">Select a student from the results list to view detailed overall charts and daily logs.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
