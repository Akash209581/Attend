import { useState, useEffect, useMemo } from 'react';
import {
    getAdminSections, getSectionStudents, downloadCSV,
    getSubjectNames, getStudentsBySubject,
} from '../../api';
import { Download, Users, Filter, X, AlertTriangle, AlertCircle, Target, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';
import StatCard from '../../components/StatCard';

/* ── Attendance badge ─────────────────────────────────────────────────────── */
function AttBadge({ pct }) {
    const color = pct >= 75
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        : pct >= 60
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
    return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{pct}%</span>;
}
                                                                                 
/* ── Main Component ───────────────────────────────────────────────────────── */
export default function AdminStudents() {
    /* ── State ── */
    const [sections, setSections] = useState([]);
    const [selected, setSelected] = useState('');
    const [students, setStudents] = useState([]);
    const [meta, setMeta] = useState({});
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);

    const [subjectNames, setSubjectNames] = useState([]);
    const [subjectFilter, setSubjectFilter] = useState('');   // '' = none
    const [threshold, setThreshold] = useState('all');
    const [subjectStudents, setSubjectStudents] = useState([]);
    const [subLoading, setSubLoading] = useState(false);

    const [search, setSearch] = useState('');

    const subjectMode = Boolean(subjectFilter);

    /* ── Load sections + subject names ── */
    useEffect(() => {
        getAdminSections().then(({ data }) => {
            setSections(data);
            if (data.length) setSelected(data[0]);
        });
        getSubjectNames().then(({ data }) => setSubjectNames(data));
    }, []);

    /* ── Load paginated section students (normal mode) ── */
    useEffect(() => {
        if (subjectMode || !selected) return;
        setLoading(true);
        const thresholdVal = threshold !== 'all' ? parseFloat(threshold) : null;
        getSectionStudents(selected, page, thresholdVal)
            .then(({ data }) => { setStudents(data.students); setMeta(data); })
            .finally(() => setLoading(false));
    }, [selected, page, subjectMode, threshold]);

    /* ── Load subject-filtered students ── */
    useEffect(() => {
        if (!subjectMode) return;
        setSubLoading(true);
        const tVal = threshold === 'all' ? '101' : threshold;
        getStudentsBySubject({ subject: subjectFilter, threshold: tVal, section: selected || 'all' })
            .then(({ data }) => setSubjectStudents(data))
            .finally(() => setSubLoading(false));
    }, [subjectFilter, threshold, selected, subjectMode]);

    /* ── Helpers ── */
    const clearFilter = () => { setSubjectFilter(''); setThreshold('all'); setSearch(''); };

    const handleDownload = async () => {
        try {
            const sec = selected || 'all';
            const { data } = await downloadCSV(sec);
            const url = URL.createObjectURL(new Blob([data]));
            const a = document.createElement('a');
            a.href = url; a.download = `attendance_${sec}.csv`; a.click();
            URL.revokeObjectURL(url);
        } catch { toast.error('Download failed'); }
    };

    /* ── Derived data ── */
    const displayedStudents = subjectMode ? subjectStudents : students;
    const isLoading = subjectMode ? subLoading : loading;

    const filteredStudents = useMemo(() => {
        if (!search.trim()) return displayedStudents;
        const q = search.trim().toLowerCase();

        // 1. If full 10-character alphanumeric roll number is typed, apply binary search
        const isFullRollNo = q.length === 10 && /^[a-zA-Z\d]{10}$/.test(q);
        if (isFullRollNo) {
            // Sort a copy of displayedStudents by rollNo for binary search
            const sorted = [...displayedStudents].sort((a, b) => 
                (a.rollNo || '').localeCompare(b.rollNo || '', undefined, { sensitivity: 'base' })
            );

            let low = 0;
            let high = sorted.length - 1;
            while (low <= high) {
                const mid = Math.floor((low + high) / 2);
                const midVal = (sorted[mid].rollNo || '').toLowerCase();
                if (midVal === q) {
                    return [sorted[mid]];
                } else if (midVal < q) {
                    low = mid + 1;
                } else {
                    high = mid - 1;
                }
            }
            return []; // No exact match found
        }

        // 2. Otherwise, fall back to standard partial filter scan
        return displayedStudents.filter(s =>
            s.name?.toLowerCase().includes(q) ||
            s.rollNo?.toLowerCase().includes(q) ||
            s.section?.toLowerCase().includes(q)
        );
    }, [displayedStudents, search]);

    const getSubjectPct = (student) => {
        if (!subjectFilter) return null;
        const sub = (student.subjects || []).find(x => x.subject === subjectFilter);
        return sub ? (sub.percentage ?? 0) : null;
    };

    /* ── Filter Statistics ── */
    const stats = useMemo(() => {
        if (!filteredStudents.length) return { total: 0, critical: 0, borderline: 0, avg: 0 };

        let critical = 0;
        let borderline = 0;
        let sum = 0;

        filteredStudents.forEach(s => {
            const rawPct = subjectMode ? getSubjectPct(s) : s.totalPercentage;
            const parsed = parseFloat(rawPct);
            const pct = isNaN(parsed) ? 0 : parsed;
            if (pct < 60) critical++;
            else if (pct < 75) borderline++;
            sum += pct;
        });

        return {
            total: filteredStudents.length,
            critical,
            borderline,
            avg: Math.round(sum / filteredStudents.length)
        };
    }, [filteredStudents, subjectMode, subjectFilter]);

    /* ── Shared select className ── */
    const selectCls = "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer";

    return (
        <div className="space-y-4">

            {/* ══════ Filter Bar ══════ */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Filter size={14} className="text-indigo-500" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Filters</span>
                    {subjectMode && (
                        <button onClick={clearFilter}
                            className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition-colors">
                            <X size={12} /> Clear batch filter
                        </button>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3">

                    {/* 1. Year dropdown */}
                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Year</label>
                        <select value={selected} onChange={e => { setSelected(e.target.value); setPage(1); }}
                            className={`${selectCls} w-full`}>
                            <option value="all">All Years</option>
                            {sections.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    {/* 2. Batch dropdown */}
                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Batch</label>
                        <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}
                            className={`${selectCls} w-full`}>
                            <option value="">— All Batches —</option>
                            {subjectNames.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>

                    {/* 3. Threshold dropdown */}
                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Show below</label>
                        <select value={threshold} onChange={e => { setThreshold(e.target.value); setPage(1); }}
                            className={`${selectCls} w-full`}>
                            <option value="all">All Students</option>
                            <option value="90">90% — Below 90%</option>
                            <option value="85">85% — Below 85%</option>
                            <option value="80">80% — Below 80%</option>
                            <option value="75">75% — Below 75%</option>
                            <option value="60">60% — Below 60%</option>
                            <option value="50">50% — Below 50%</option>
                        </select>
                    </div>

                    {/* 4. Text search */}
                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Search</label>
                        <input type="text" placeholder="Name / Roll No…" value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-full sm:w-44" />
                    </div>

                    {/* 5. Result count + Download */}
                    <div className="flex items-center gap-3 w-full sm:w-auto sm:ml-auto">
                        <button onClick={handleDownload}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all">
                            <Download size={15} /> Download CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Filtration Summary Stats ── */}
            {!isLoading && filteredStudents.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        label="Students Shown"
                        value={stats.total}
                        icon={Users}
                        color="indigo"
                        sub={subjectMode ? `For ${subjectFilter}` : (selected === 'all' ? "All Years" : `Year ${selected}`)}
                    />
                    <StatCard
                        label="Critical (<60%)"
                        value={stats.critical}
                        icon={AlertTriangle}
                        color="red"
                        sub="Immediate attention"
                    />
                    <StatCard
                        label="Borderline"
                        value={stats.borderline}
                        icon={AlertCircle}
                        color="amber"
                        sub="60% to 75%"
                    />
                    <StatCard
                        label="Avg. Attendance"
                        value={`${stats.avg}%`}
                        icon={TrendingDown}
                        color="indigo"
                        sub="Of current selection"
                    />
                </div>
            )}

            {/* ══════ Table ══════ */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">#</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Roll No</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Name</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Overall %</th>
                                        {subjectMode && (
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-rose-500 uppercase">
                                                {subjectFilter} %
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredStudents.map((st, i) => {
                                        const subPct = getSubjectPct(st);
                                        return (
                                            <tr key={st._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                                                <td className="px-4 py-3 font-mono font-medium text-indigo-600 dark:text-indigo-400 text-xs">{st.rollNo}</td>
                                                <td className="px-4 py-3 text-slate-700 dark:text-slate-200 font-medium">{st.name}</td>
                                                <td className="px-4 py-3"><AttBadge pct={st.totalPercentage} /></td>
                                                {subjectMode && (
                                                    <td className="px-4 py-3">
                                                        {subPct !== null ? (
                                                            <span className="flex items-center gap-1.5">
                                                                <AttBadge pct={subPct} />
                                                                {subPct < 75 && <AlertTriangle size={11} className="text-rose-400" />}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-slate-300">—</span>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination — normal mode only */}
                        {!subjectMode && meta.pages > 1 && (
                            <div className="flex justify-center items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800">
                                {Array.from({ length: meta.pages }, (_, i) => i + 1).map(p => (
                                    <button key={p} onClick={() => setPage(p)}
                                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-all
                                            ${p === page ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-indigo-100'}`}>
                                        {p}
                                    </button>
                                ))}
                            </div>
                        )}

                        {filteredStudents.length === 0 && (
                            <div className="py-12 text-center text-slate-400">
                                <Users size={40} className="mx-auto mb-2 opacity-30" />
                                {subjectMode
                                    ? `No students found with ${subjectFilter} ${threshold === 'all' ? 'enrolled' : `below ${threshold}%`}`
                                    : `No students found ${threshold !== 'all' ? `with overall attendance below ${threshold}%` : ''}`}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
