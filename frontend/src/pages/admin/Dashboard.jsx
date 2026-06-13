import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, UserX, TrendingUp, Calendar, GraduationCap, Trash2, Award } from 'lucide-react';
import ReactApexChart from 'react-apexcharts';
import StatCard from '../../components/StatCard';
import { getAdminStats, getSubjectStats, getDayWiseStats, getUploads, deleteUpload } from '../../api';
import toast from 'react-hot-toast';

const chartBase = {
    toolbar: { show: false },
    zoom: { enabled: false },
};

/* ── Main Dashboard ─────────────────────────────────────────────────────────── */
export default function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [daywise, setDaywise] = useState({ overall: [], byYear: {} });
    const [daywiseYear, setDaywiseYear] = useState('all');
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState([]);

    const fetchHistory = async () => {
        try {
            const { data } = await getUploads();
            setHistory(data);
        } catch (err) {
            console.error('Failed to load uploads history', err);
        }
    };

    useEffect(() => {
        Promise.all([getAdminStats(), getSubjectStats(), getUploads()])
            .then(([{ data: s }, { data: sub }, { data: hist }]) => {
                setStats(s);
                setSubjects(sub.slice(0, 10));
                setHistory(hist);
            })
            .catch(() => toast.error('Failed to load dashboard data'))
            .finally(() => setLoading(false));
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this upload? This will completely remove all attendance records and recalculate all student averages.')) {
            return;
        }
        setLoading(true);
        try {
            await deleteUpload(id);
            toast.success('Upload deleted successfully');
            const [{ data: s }, { data: sub }, { data: hist }] = await Promise.all([
                getAdminStats(),
                getSubjectStats(),
                getUploads()
            ]);
            setStats(s);
            setSubjects(sub.slice(0, 10));
            setHistory(hist);
            const { data: dw } = await getDayWiseStats(daywiseYear);
            setDaywise(dw);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Delete failed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getDayWiseStats(daywiseYear)
            .then(({ data }) => setDaywise(data))
            .catch(() => { });
    }, [daywiseYear]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const isDark = document.documentElement.classList.contains('dark');
    const axisColor = isDark ? '#64748b' : '#94a3b8';
    const gridColor = isDark ? '#1e293b' : '#f1f5f9';
    const textColor = isDark ? '#e2e8f0' : '#1e293b';

    // ── Year-wise stats ────────────────────────────────────────────────────────
    const yearStats = stats?.yearStats || [];
    const yearLabels = yearStats.map(y => `${y.year === 3 ? '3rd' : '4th'} Year`);
    const yearData = yearStats.map(y => y.avgPercentage);

    // ── Section stats ──────────────────────────────────────────────────────────
    const sectionLabels = stats?.sectionStats?.map((s) => s.section) || [];
    const sectionData = stats?.sectionStats?.map((s) => s.avgPercentage) || [];

    const barOptions = {
        chart: { ...chartBase, type: 'bar', background: 'transparent' },
        plotOptions: { bar: { borderRadius: 6, columnWidth: '55%', distributed: true } },
        colors: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6', '#f97316', '#84cc16'],
        dataLabels: { enabled: true, formatter: (v) => v + '%', style: { fontSize: '11px' } },
        xaxis: { categories: sectionLabels, labels: { style: { colors: axisColor, fontSize: '12px' } } },
        yaxis: { max: 100, labels: { style: { colors: axisColor }, formatter: (v) => v + '%' } },
        grid: { borderColor: gridColor },
        legend: { show: false },
        tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: (v) => v + '%' } },
    };

    const present = stats?.present || 0;
    const absent = stats?.absent || 0;
    const pieOptions = {
        chart: { ...chartBase, type: 'donut', background: 'transparent' },
        labels: ['Present (≥75%)', 'Needs Attention (<75%)'],
        colors: ['#10b981', '#f43f5e'],
        legend: { position: 'bottom', labels: { colors: textColor } },
        plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Total', color: textColor } } } } },
        tooltip: { theme: isDark ? 'dark' : 'light' },
        dataLabels: { dropShadow: { enabled: false } },
    };

    const subjectNames = subjects.map((s) => s.subject);
    const subjectPercentages = subjects.map((s) => s.avgPercentage);

    const hbarOptions = {
        chart: { ...chartBase, type: 'bar', background: 'transparent' },
        plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '65%' } },
        colors: ['#8b5cf6'],
        dataLabels: { enabled: true, formatter: (v) => v + '%', style: { fontSize: '11px' } },
        xaxis: {
            categories: subjectNames,
            labels: { style: { colors: axisColor, fontSize: '10px' } },
        },
        yaxis: {
            max: 100,
            labels: { style: { colors: axisColor }, formatter: (v) => v + '%' },
        },
        grid: { borderColor: gridColor },
        tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: (v) => v + '%' } },
    };

    // ── Day-wise chart data ────────────────────────────────────────────────────
    const getDaywiseData = () => {
        if (daywiseYear === 'all') return daywise.overall || [];
        return daywise.byYear?.[parseInt(daywiseYear)] || [];
    };

    const dwData = getDaywiseData();
    const dwLabels = dwData.map(d => d.dateLabel);
    const dwAvgs = dwData.map(d => d.avg);
    const dwChanges = dwData.map(d => d.change || 0);

    // Cumulative line chart
    const crtLineOptions = {
        chart: { ...chartBase, type: 'area', background: 'transparent', animations: { speed: 600 } },
        stroke: { curve: 'smooth', width: 3 },
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 100] } },
        colors: ['#6366f1'],
        xaxis: {
            categories: dwLabels.length ? dwLabels : ['No data'],
            labels: { style: { colors: axisColor, fontSize: '11px' }, rotate: -35 },
        },
        yaxis: {
            min: 0, max: 100,
            labels: { style: { colors: axisColor }, formatter: (v) => v + '%' },
        },
        annotations: {
            yaxis: [{
                y: 75, borderColor: '#f43f5e', strokeDashArray: 4,
                label: { text: '75%', style: { color: '#fff', background: '#f43f5e', fontSize: '10px' } }
            }]
        },
        grid: { borderColor: gridColor },
        markers: { size: 5, strokeWidth: 2, strokeColors: '#fff' },
        dataLabels: { enabled: dwLabels.length <= 15, formatter: (v) => v + '%', style: { fontSize: '10px' } },
        tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: (v) => v + '%' } },
    };

    // Daily change bar chart
    const crtBarOptions = {
        chart: { ...chartBase, type: 'bar', background: 'transparent' },
        plotOptions: {
            bar: {
                borderRadius: 4, columnWidth: '60%',
                colors: {
                    ranges: [
                        { from: -100, to: -0.01, color: '#f43f5e' },
                        { from: 0, to: 0, color: '#94a3b8' },
                        { from: 0.01, to: 100, color: '#10b981' },
                    ]
                }
            }
        },
        colors: ['#10b981'],
        dataLabels: {
            enabled: true,
            formatter: (v) => (v > 0 ? '+' : '') + v + '%',
            style: { fontSize: '10px' }
        },
        xaxis: {
            categories: dwLabels.length ? dwLabels : ['No data'],
            labels: { style: { colors: axisColor, fontSize: '11px' }, rotate: -35 },
        },
        yaxis: { labels: { style: { colors: axisColor }, formatter: (v) => v + '%' } },
        grid: { borderColor: gridColor },
        tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: (v) => (v > 0 ? '+' : '') + v + '%' } },
    };

    // Year-wise bar
    const yearBarOptions = {
        chart: { ...chartBase, type: 'bar', background: 'transparent' },
        plotOptions: { bar: { borderRadius: 8, columnWidth: '50%', distributed: true } },
        colors: ['#6366f1', '#f59e0b'],
        dataLabels: { enabled: true, formatter: (v) => v + '%', style: { fontSize: '13px' } },
        xaxis: { categories: yearLabels, labels: { style: { colors: axisColor, fontSize: '13px' } } },
        yaxis: { max: 100, labels: { style: { colors: axisColor }, formatter: (v) => v + '%' } },
        grid: { borderColor: gridColor },
        legend: { show: false },
        tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: (v) => v + '%' } },
    };

    return (
        <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Students" value={stats?.totalStudents} icon={Users} color="indigo" />
                <StatCard label="Present (≥75%)" value={present} icon={UserCheck} color="green" sub="Regular attendance" />

                <button
                    id="assessments-card"
                    onClick={() => navigate('/akashisadmin/assessments')}
                    className="text-left group transition-transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-purple-400 rounded-2xl"
                    title="Click to manage student assessments and marks"
                >
                    <StatCard
                        label="Student Assessments"
                        value="Marks"
                        icon={Award}
                        color="purple"
                        sub={<span className="text-purple-600 dark:text-purple-400 group-hover:underline">Manage & Upload ↗</span>}
                    />
                </button>

                <StatCard label="Avg Attendance" value={`${stats?.avgAttendance ?? 0}%`} icon={TrendingUp} color="amber" sub="Overall average" />
            </div>

            {/* Year Stats Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                        <GraduationCap size={15} /> Year-wise Attendance %
                    </h2>
                    <p className="text-xs text-slate-400 mb-4">3rd Year CRT vs 4th Year CRT</p>
                    {yearLabels.length > 0 ? (
                        <ReactApexChart options={yearBarOptions} series={[{ name: 'Avg %', data: yearData }]} type="bar" height={200} />
                    ) : (
                        <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data yet. Upload attendance first.</div>
                    )}
                    {/* Year breakdown cards */}
                    <div className="flex gap-3 mt-2">
                        {yearStats.map(y => (
                            <div key={y.year} className={`flex-1 rounded-xl p-3 text-center ${y.year === 3
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800'
                                : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800'
                                }`}>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{y.year === 3 ? '3rd' : '4th'} Year</p>
                                <p className={`text-xl font-bold ${y.year === 3 ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                    {y.avgPercentage}%
                                </p>
                                <p className="text-xs text-slate-400">{y.count} students</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Present vs Needs Attention</h2>
                    <ReactApexChart options={pieOptions} series={[present, absent]} type="donut" height={260} />
                </div>
            </div>

            {/* ═══════════ CRT DAY-WISE GRAPHS ═══════════ */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Calendar size={15} className="text-indigo-500" />
                            CRT Day-wise Attendance Graphs
                        </h2>
                    </div>
                    {/* Year filter */}
                    <div className="flex gap-2">
                        {[
                            { val: 'all', label: 'All' },
                            { val: '3', label: '3rd Year' },
                            { val: '4', label: '4th Year' },
                        ].map(({ val, label }) => (
                            <button
                                key={val}
                                onClick={() => setDaywiseYear(val)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${daywiseYear === val
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {dwData.length === 0 ? (
                    <div className="py-16 text-center text-slate-400">
                        <Calendar size={40} className="mx-auto mb-3 opacity-30" />
                        <p>No CRT attendance data yet.</p>
                        <p className="text-sm mt-1">Upload an Excel file to see day-wise graphs.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-700">
                        {/* Cumulative line chart */}
                        <div className="p-5">
                            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                                Cumulative Attendance Trend
                            </h3>
                            <ReactApexChart
                                options={crtLineOptions}
                                series={[{ name: 'Attendance %', data: dwAvgs }]}
                                type="area"
                                height={260}
                            />
                        </div>
                        {/* Daily change bar chart */}
                        <div className="p-5">
                            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                                Daily Change
                            </h3>
                            <ReactApexChart
                                options={crtBarOptions}
                                series={[{ name: 'Change %', data: dwChanges }]}
                                type="bar"
                                height={260}
                            />
                        </div>
                    </div>
                )}

                {/* Summary stats below charts */}
                {dwData.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                        {[
                            { label: 'Period Avg', value: dwAvgs.length ? Math.round(dwAvgs.reduce((s, v) => s + v, 0) / dwAvgs.length) + '%' : '—', color: 'indigo' },
                            { label: 'Best Day', value: dwAvgs.length ? Math.max(...dwAvgs) + '%' : '—', color: 'emerald' },
                            { label: 'Worst Day', value: dwAvgs.length ? Math.min(...dwAvgs) + '%' : '—', color: 'rose' },
                        ].map(({ label, value, color }) => (
                            <div key={label} className="text-center">
                                <p className="text-xs text-slate-400">{label}</p>
                                <p className={`text-xl font-bold text-${color}-500 dark:text-${color}-400`}>{value}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Year-wise Attendance %</h2>
                    {sectionLabels.length > 0 ? (
                        <ReactApexChart options={barOptions} series={[{ name: 'Attendance %', data: sectionData }]} type="bar" height={240} />
                    ) : (
                        <div className="h-60 flex items-center justify-center text-slate-400 text-sm">No section data yet.</div>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Batch-wise Avg Attendance %</h2>
                    {subjectNames.length > 0 ? (
                        <ReactApexChart options={hbarOptions} series={[{ name: 'Avg %', data: subjectPercentages }]} type="bar" height={240} />
                    ) : (
                        <div className="h-60 flex items-center justify-center text-slate-400 text-sm">No subject data yet.</div>
                    )}
                </div>
            </div>

            {/* Recent Uploads & History */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm mt-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 bg-rose-100 dark:bg-rose-900/30 rounded-xl flex items-center justify-center">
                        <Calendar size={18} className="text-rose-600 dark:text-rose-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Recent Uploads & History</h2>
                </div>

                {history.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">No uploads found.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase">
                                    <th className="text-left px-4 py-2.5">Filename</th>
                                    <th className="text-left px-4 py-2.5">Upload Date</th>
                                    <th className="text-left px-4 py-2.5">Year</th>
                                    <th className="text-left px-4 py-2.5">Records</th>
                                    <th className="text-center px-4 py-2.5">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {history.map((h) => (
                                    <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300">
                                        <td className="px-4 py-3 font-medium truncate max-w-[180px]" title={h.filename}>{h.filename}</td>
                                        <td className="px-4 py-3">
                                            {new Date(h.upload_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-block px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
                                                {h.section}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">{h.record_count}</td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => handleDelete(h.id)}
                                                className="text-xs font-semibold text-rose-500 hover:text-rose-700 flex items-center justify-center gap-1 mx-auto hover:bg-rose-50 dark:hover:bg-rose-950/20 px-2.5 py-1.5 rounded-lg transition-all"
                                                title="Delete this upload record"
                                            >
                                                <Trash2 size={13} />
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
