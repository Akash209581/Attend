import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, ChevronDown, ChevronUp, Users, BookOpen, Filter, X, AlertCircle, Target, TrendingDown } from 'lucide-react';
import ReactApexChart from 'react-apexcharts';
import { getNeedsAttention } from '../../api';
import toast from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';
import StatCard from '../../components/StatCard';

/* ── helpers ─────────────────────────────────────────────────────────────────── */
function classesNeeded(attended, total) {
    if (!total) return 0;
    const needed = Math.ceil((0.75 * total - attended) / 0.25);
    return Math.max(0, needed);
}

/* ── per-student expandable card ─────────────────────────────────────────────── */
function StudentCard({ student, index, isDark }) {
    const [expanded, setExpanded] = useState(false);
    const pct = student.totalPercentage ?? 0;
    const subjects = student.subjects || [];

    const overallColor = pct >= 60 ? '#f59e0b' : '#f43f5e';
    const axisColor = isDark ? '#64748b' : '#94a3b8';

    const subjectNames = subjects.map(s => s.subject || '—');
    const subjectPcts = subjects.map(s => s.percentage ?? 0);
    const barColors = subjectPcts.map(p => p >= 75 ? '#10b981' : p >= 60 ? '#f59e0b' : '#f43f5e');
    const lowCount = subjectPcts.filter(p => p < 75).length;

    const chartOptions = {
        chart: { type: 'bar', background: 'transparent', toolbar: { show: false }, zoom: { enabled: false } },
        plotOptions: { bar: { borderRadius: 4, columnWidth: '70%', distributed: true } },
        colors: barColors,
        dataLabels: { enabled: true, formatter: v => v + '%', style: { fontSize: '10px', colors: ['#fff'] }, dropShadow: { enabled: false } },
        xaxis: { categories: subjectNames, labels: { style: { colors: axisColor, fontSize: '9px' }, rotate: -40, maxHeight: 90 } },
        yaxis: { max: 100, labels: { style: { colors: axisColor }, formatter: v => v + '%' } },
        annotations: { yaxis: [{ y: 75, borderColor: '#ef4444', strokeDashArray: 4, label: { text: '75%', style: { color: '#fff', background: '#ef4444', fontSize: '10px' } } }] },
        grid: { borderColor: isDark ? '#1e293b' : '#f1f5f9' },
        legend: { show: false },
        tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: v => v + '%' } },
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
            {/* Header row */}
            <button
                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                onClick={() => setExpanded(e => !e)}
            >
                <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-white truncate">{student.name}</p>
                    <p className="text-xs font-mono text-indigo-500">{student.rollNo} · {student.section}</p>
                </div>
                {lowCount > 0 && (
                    <span className="hidden sm:flex items-center gap-1 text-xs font-medium text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-2.5 py-1 rounded-full shrink-0">
                        <AlertTriangle size={11} /> {lowCount} subject{lowCount > 1 ? 's' : ''} &lt;75%
                    </span>
                )}
                <span className="text-sm font-bold px-3 py-1 rounded-full shrink-0"
                    style={{ background: pct >= 60 ? '#fff7ed' : '#fff1f2', color: overallColor }}>
                    {pct}%
                </span>
                <div className="w-24 hidden md:block shrink-0">
                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: overallColor }} />
                    </div>
                </div>
                {expanded ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
            </button>

            {/* Expanded: bar chart + classes needed + subject list */}
            {expanded && (
                <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-4 space-y-5">
                    {subjects.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">No subject data available.</p>
                    ) : (
                        <>
                            {/* Bar chart */}
                            <div>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                                    Subject-wise Attendance · Red line = 75%
                                </p>
                                <ReactApexChart options={chartOptions} series={[{ name: 'Attendance %', data: subjectPcts }]} type="bar" height={220} />
                            </div>

                            {/* Classes Needed cards */}
                            {lowCount > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-rose-500 mb-3 uppercase tracking-wide">
                                        ⚠ Classes Needed to Reach 75%
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {subjects.filter(s => (s.percentage ?? 0) < 75).map((s, i) => {
                                            const attended = s.attended ?? 0;
                                            const total = s.total ?? 0;
                                            const needed = classesNeeded(attended, total);
                                            const afterTotal = total + needed;
                                            const afterPct = afterTotal > 0 ? Math.round(((attended + needed) / afterTotal) * 100) : 0;
                                            const urgency = (s.percentage ?? 0) >= 60 ? 'amber' : 'rose';
                                            return (
                                                <div key={i} className={`rounded-xl p-3 border bg-${urgency}-50 dark:bg-${urgency}-900/10 border-${urgency}-100 dark:border-${urgency}-900/30`}>
                                                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate mb-1">{s.subject}</p>
                                                    <p className={`text-2xl font-black text-${urgency}-500`}>{needed}
                                                        <span className="text-xs font-normal text-slate-400 ml-1">class{needed !== 1 ? 'es' : ''}</span>
                                                    </p>
                                                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                                                        <span>Now: <b className="text-rose-500">{s.percentage ?? 0}%</b></span>
                                                        <span>After: <b className="text-emerald-500">{afterPct}%</b></span>
                                                    </div>
                                                    {total > 0 && (
                                                        <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">{attended}/{total} attended</p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Subject chips — only show <75% */}
                            {lowCount > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-rose-500 mb-2 uppercase tracking-wide">⚠ Subjects below 75%</p>
                                    <div className="flex flex-wrap gap-2">
                                        {subjects.filter(s => (s.percentage ?? 0) < 75).map((s, i) => (
                                            <span key={i} className={`text-xs font-semibold px-3 py-1 rounded-full ${(s.percentage ?? 0) >= 60
                                                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                                                : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'}`}>
                                                {s.subject} — {s.percentage ?? 0}%
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

/* ── Main Page ────────────────────────────────────────────────────────────────── */
export default function NeedsAttentionPage() {
    const navigate = useNavigate();
    const { dark: isDark } = useTheme();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    /* ── Subject filter state ── */
    const [subjectFilter, setSubjectFilter] = useState('');   // selected subject name
    const [thresholdFilter, setThresholdFilter] = useState('below75'); // 'below75' | 'below60' | 'all'

    useEffect(() => {
        getNeedsAttention()
            .then(({ data }) => setStudents(data))
            .catch(() => toast.error('Failed to load data'))
            .finally(() => setLoading(false));
    }, []);

    /* ── Derive all unique subject names from loaded students ── */
    const allSubjects = useMemo(() => {
        const names = new Set();
        students.forEach(s => (s.subjects || []).forEach(sub => { if (sub.subject) names.add(sub.subject); }));
        return [...names].sort();
    }, [students]);

    /* ── Filter pipeline ── */
    const filtered = useMemo(() => {
        return students.filter(s => {
            // text search
            const txt = search.toLowerCase();
            if (txt && !s.name?.toLowerCase().includes(txt) &&
                !s.rollNo?.toLowerCase().includes(txt) &&
                !s.section?.toLowerCase().includes(txt)) return false;

            // subject filter — keep student only if they are below threshold in that subject
            if (subjectFilter) {
                const sub = (s.subjects || []).find(x => x.subject === subjectFilter);
                if (!sub) return false;
                const pct = sub.percentage ?? 0;
                if (thresholdFilter === 'below75' && pct >= 75) return false;
                if (thresholdFilter === 'below60' && pct >= 60) return false;
            }
            return true;
        });
    }, [students, search, subjectFilter, thresholdFilter]);

    /* ── Active filter count (for badge) ── */
    const activeFilters = (subjectFilter ? 1 : 0) + (thresholdFilter !== 'below75' ? 1 : 0);

    /* ── Section Breakdown (for summary) ── */
    const sectionBreakdown = useMemo(() => {
        const counts = {};
        filtered.forEach(s => {
            if (s.section) counts[s.section] = (counts[s.section] || 0) + 1;
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }, [filtered]);

    /* ── Filter Statistics ── */
    const stats = useMemo(() => {
        if (!filtered.length) return { total: 0, critical: 0, borderline: 0, avg: 0, worstSection: 'N/A' };

        let critical = 0;
        let borderline = 0;
        let sum = 0;

        filtered.forEach(s => {
            let pct;
            if (subjectFilter) {
                const sub = (s.subjects || []).find(x => x.subject === subjectFilter);
                pct = sub?.percentage ?? 0;
            } else {
                pct = s.totalPercentage ?? 0;
            }

            if (pct < 60) critical++;
            else if (pct < 75) borderline++;
            sum += pct;
        });

        return {
            total: filtered.length,
            critical,
            borderline,
            avg: Math.round(sum / filtered.length),
            worstSection: sectionBreakdown?.[0]?.[0] || 'N/A'
        };
    }, [filtered, subjectFilter, sectionBreakdown]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* ── Top bar ── */}
            <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center gap-4 shadow-sm">
                <button onClick={() => navigate(-1)}
                    className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-colors">
                    <ArrowLeft size={18} />
                </button>
                <div className="flex-1">
                    <h1 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <AlertTriangle size={18} className="text-rose-500" /> Needs Attention
                    </h1>
                    <p className="text-xs text-slate-400">Students with overall attendance below 75%</p>
                </div>

                {/* Desktop search */}
                <input type="text" placeholder="Search name / roll / section…" value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="hidden sm:block w-56 text-sm px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />

                {/* Count badge */}
                <span className="flex items-center gap-2 text-sm font-semibold bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 px-4 py-2 rounded-xl">
                    <Users size={15} /> {loading ? '…' : filtered.length}
                </span>
            </div>

            {/* ── Content ── */}
            <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">

                {/* Mobile search */}
                <div className="sm:hidden">
                    <input type="text" placeholder="Search name / roll / section…" value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full text-sm px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                {/* ── Subject-wise Filter Bar ── */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Filter size={14} className="text-indigo-500" />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Filter by Subject</span>
                        {activeFilters > 0 && (
                            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                                {activeFilters} active
                            </span>
                        )}
                        {activeFilters > 0 && (
                            <button onClick={() => { setSubjectFilter(''); setThresholdFilter('below75'); }}
                                className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition-colors">
                                <X size={12} /> Reset filters
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Subject chips */}
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => setSubjectFilter('')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                                    ${!subjectFilter ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'}`}>
                                <BookOpen size={11} /> All Subjects
                            </button>
                            {allSubjects.map(name => (
                                <button key={name} onClick={() => setSubjectFilter(name === subjectFilter ? '' : name)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                                        ${subjectFilter === name ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'}`}>
                                    {name}
                                </button>
                            ))}
                        </div>

                        {/* Threshold selector — only when subject selected */}
                        {subjectFilter && (
                            <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-3 ml-1">
                                <span className="text-xs text-slate-400 mr-1">Show:</span>
                                {[
                                    { v: 'below75', l: '< 75%' },
                                    { v: 'below60', l: '< 60% (critical)' },
                                    { v: 'all', l: 'All enrolled' },
                                ].map(({ v, l }) => (
                                    <button key={v} onClick={() => setThresholdFilter(v)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all
                                            ${thresholdFilter === v ? 'bg-rose-500 text-white border-rose-500' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-rose-300'}`}>
                                        {l}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Active filter summary */}
                    {subjectFilter && (
                        <div className="mt-3 flex items-center gap-2 text-xs">
                            <span className="text-slate-400">Showing students with</span>
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-full">{subjectFilter}</span>
                            <span className="text-slate-400">{thresholdFilter === 'below75' ? 'below 75%' : thresholdFilter === 'below60' ? 'below 60% (critical)' : '(any attendance)'}</span>
                            <span className="font-semibold text-rose-500">→ {filtered.length} student{filtered.length !== 1 ? 's' : ''}</span>
                        </div>
                    )}
                </div>

                {/* ── Filtration Summary Stats ── */}
                {!loading && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            label="Total At-Risk"
                            value={students.length}
                            icon={Users}
                            color="indigo"
                            sub="Total students < 75%"
                        />
                        <StatCard
                            label="Filtered Result"
                            value={filtered.length}
                            icon={Filter}
                            color="indigo"
                            sub={search || subjectFilter ? "Matching your filters" : "All at-risk students"}
                        />
                        <StatCard
                            label="Critical Cases"
                            value={stats.critical}
                            icon={AlertTriangle}
                            color="red"
                            sub="Students below 60%"
                        />
                        <StatCard
                            label="View Average"
                            value={`${stats.avg}%`}
                            icon={TrendingDown}
                            color="amber"
                            sub="Of current selection"
                        />
                    </div>
                )}

                {/* Section Breakdown Pills */}
                {!loading && sectionBreakdown.length > 1 && (
                    <div className="flex flex-wrap items-center gap-2 px-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">Section Breakdown:</span>
                        {sectionBreakdown.map(([sec, count]) => (
                            <div key={sec} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{sec}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                <span className="text-xs font-bold text-indigo-500">{count}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Legend */}
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> ≥ 75% safe</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> 60–74% borderline</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-500 inline-block" /> &lt; 60% critical</span>
                    <span className="ml-auto text-slate-400">Click a row to expand</span>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex justify-center py-24">
                        <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {/* Empty */}
                {!loading && filtered.length === 0 && (
                    <div className="text-center py-20 text-slate-400">
                        {subjectFilter
                            ? `No students match the filter for "${subjectFilter}".`
                            : search ? 'No students match your search.' : '🎉 All students are above 75%!'}
                    </div>
                )}

                {/* Student cards */}
                <div className="space-y-3">
                    {filtered.map((student, i) => (
                        <StudentCard key={student._id} student={student} index={i} isDark={isDark} />
                    ))}
                </div>
            </div>
        </div>
    );
}
