import { useState, useEffect, useMemo } from 'react';
import {
    getAdminSections, getSectionStudents, downloadCSV,
    getSubjectNames, getStudentsBySubject, getSectionPerformance,
} from '../../api';
import { Download, Users, Filter, X, AlertTriangle, AlertCircle, Target, TrendingDown, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import StatCard from '../../components/StatCard';
import ReactApexChart from 'react-apexcharts';

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
    
    // Range filter states
    const [filterMode, setFilterMode] = useState('all'); // 'all', 'below', 'range'
    const [belowVal, setBelowVal] = useState('75');
    const [minVal, setMinVal] = useState('40');
    const [maxVal, setMaxVal] = useState('50');

    const [subjectStudents, setSubjectStudents] = useState([]);
    const [subLoading, setSubLoading] = useState(false);

    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('list'); // 'list' or 'analytics'
    const [performanceData, setPerformanceData] = useState([]);
    const [perfLoading, setPerfLoading] = useState(false);

    const subjectMode = Boolean(subjectFilter);

    /* ── Load sections + subject names ── */
    useEffect(() => {
        getAdminSections().then(({ data }) => {
            const sortedData = [...data].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
            setSections(sortedData);
            if (sortedData.length) setSelected(sortedData[0]);
        });
        getSubjectNames().then(({ data }) => setSubjectNames(data));
    }, []);

    /* ── Load paginated section students (normal mode) ── */
    useEffect(() => {
        if (subjectMode || !selected) return;
        setLoading(true);
        let minParam = null;
        let maxParam = null;
        if (filterMode === 'below' && belowVal !== '') {
            maxParam = parseFloat(belowVal);
        } else if (filterMode === 'range') {
            if (minVal !== '') minParam = parseFloat(minVal);
            if (maxVal !== '') maxParam = parseFloat(maxVal);
        }
        getSectionStudents(selected, page, minParam, maxParam)
            .then(({ data }) => { setStudents(data.students); setMeta(data); })
            .finally(() => setLoading(false));
    }, [selected, page, subjectMode, filterMode, belowVal, minVal, maxVal]);

    /* ── Load subject-filtered students ── */
    useEffect(() => {
        if (!subjectMode) return;
        setSubLoading(true);
        let minParam = null;
        let maxParam = null;
        if (filterMode === 'below' && belowVal !== '') {
            maxParam = parseFloat(belowVal);
        } else if (filterMode === 'range') {
            if (minVal !== '') minParam = parseFloat(minVal);
            if (maxVal !== '') maxParam = parseFloat(maxVal);
        }
        getStudentsBySubject({
            subject: subjectFilter,
            minThreshold: minParam,
            maxThreshold: maxParam,
            section: selected || 'all'
        })
            .then(({ data }) => setSubjectStudents(data))
            .finally(() => setSubLoading(false));
    }, [subjectFilter, selected, subjectMode, filterMode, belowVal, minVal, maxVal]);

    /* ── Load Section Assessment Performance ── */
    useEffect(() => {
        if (activeTab !== 'analytics' || !selected) return;
        setPerfLoading(true);
        getSectionPerformance(selected)
            .then(({ data }) => setPerformanceData(data))
            .catch((err) => {
                console.error(err);
                toast.error('Failed to load performance data');
            })
            .finally(() => setPerfLoading(false));
    }, [selected, activeTab]);

    /* ── Helpers ── */
    const clearFilter = () => {
        setSubjectFilter('');
        setFilterMode('all');
        setBelowVal('75');
        setMinVal('40');
        setMaxVal('50');
        setSearch('');
    };

    const handleDownload = () => {
        if (!filteredStudents.length) {
            toast.error('No student data available to download');
            return;
        }

        try {
            // 1. Gather all unique subject/batch names in the filtered list
            const subjectHeadersSet = new Set();
            filteredStudents.forEach(s => {
                (s.subjects || []).forEach(sub => {
                    if (sub.subject) {
                        subjectHeadersSet.add(sub.subject);
                    }
                });
            });
            const sortedSubjects = Array.from(subjectHeadersSet).sort();

            // 2. Define headers
            const headers = ['Roll No', 'Name', 'Year', 'Section', 'Overall Attendance %', ...sortedSubjects];

            // 3. Construct CSV rows
            const rows = filteredStudents.map(s => {
                const base = [
                    s.rollNo || '',
                    s.name || '',
                    s.year || '',
                    s.section || '',
                    s.totalPercentage !== undefined ? `${s.totalPercentage}%` : ''
                ];

                const subjectCells = sortedSubjects.map(subName => {
                    const match = (s.subjects || []).find(sub => sub.subject === subName);
                    if (match) {
                        const att = match.attended !== undefined ? match.attended : 0;
                        const tot = match.total !== undefined ? match.total : 0;
                        const pct = match.percentage !== undefined ? match.percentage : 0;
                        return `${att}/${tot} (${pct}%)`;
                    }
                    return '';
                });

                return [...base, ...subjectCells];
            });

            // 4. Join and format
            const csvContent = [
                headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
                ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
            ].join('\n');

            // 5. Download blob
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const sec = selected || 'all';
            a.href = url;
            a.download = `attendance_report_${sec}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('CSV downloaded successfully');
        } catch (err) {
            console.error(err);
            toast.error('Download failed');
        }
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

    // Aggregated assessment performance data formatted for Line chart
    const lineChartData = useMemo(() => {
        if (!performanceData || performanceData.length === 0) {
            return { series: [], categories: [] };
        }

        // 1. Extract unique sorted dates based on order of appearance (ordered by upload_date ASC from backend)
        const categories = [...new Set(performanceData.map(r => r.assessment_name))];
        
        // 2. Extract unique subjects (test types)
        const subjects = [...new Set(performanceData.map(r => r.subject))];

        // 3. Map to series
        const series = subjects.map(sub => {
            const dataPoints = categories.map(cat => {
                const match = performanceData.find(r => r.assessment_name === cat && r.subject === sub);
                return match ? parseFloat(match.avg_percentage) : null;
            });
            return {
                name: sub,
                data: dataPoints
            };
        });

        return { series, categories };
    }, [performanceData]);

    const lineChartOpts = {
        chart: {
            type: 'line',
            height: 350,
            background: 'transparent',
            toolbar: { show: true },
            zoom: { enabled: true }
        },
        colors: ['#6366f1', '#10b981', '#f59e0b', '#ec4899'],
        stroke: {
            curve: 'smooth',
            width: 3
        },
        markers: {
            size: 5,
            hover: { size: 7 }
        },
        xaxis: {
            categories: lineChartData.categories,
            labels: {
                style: { colors: '#94a3b8', fontSize: '11px' }
            },
            title: {
                text: 'Assessment Date',
                style: { color: '#94a3b8', fontSize: '11px' }
            }
        },
        yaxis: {
            min: 0,
            max: 100,
            labels: {
                style: { colors: '#94a3b8', fontSize: '11px' },
                formatter: v => v + '%'
            },
            title: {
                text: 'Average Score %',
                style: { color: '#94a3b8', fontSize: '11px' }
            }
        },
        grid: {
            borderColor: '#e2e8f0',
            strokeDashArray: 4,
            xaxis: { lines: { show: true } }
        },
        legend: {
            position: 'top',
            horizontalAlign: 'right',
            labels: { colors: '#94a3b8' }
        },
        tooltip: {
            y: {
                formatter: v => (v !== null ? `${v}%` : 'N/A')
            }
        }
    };

    // Attendance charts calculations
    const attendanceChartData = useMemo(() => {
        if (!filteredStudents.length) {
            return {
                donutSeries: [0, 0, 0],
                histogramSeries: [{ name: 'Students', data: [0, 0, 0, 0, 0, 0] }],
                topBottomSeries: [{ name: 'Attendance %', data: [] }],
                topBottomCategories: []
            };
        }

        let regular = 0;
        let borderline = 0;
        let critical = 0;

        let r1 = 0; // <50%
        let r2 = 0; // 50-60%
        let r3 = 0; // 60-75%
        let r4 = 0; // 75-85%
        let r5 = 0; // 85-90%
        let r6 = 0; // 90-100%

        const studentData = filteredStudents.map(s => {
            const rawPct = subjectMode ? getSubjectPct(s) : s.totalPercentage;
            const parsed = parseFloat(rawPct);
            const pct = isNaN(parsed) ? 0 : parsed;
            return { name: s.name, rollNo: s.rollNo, pct };
        });

        studentData.forEach(s => {
            const pct = s.pct;
            if (pct >= 75) regular++;
            else if (pct >= 60) borderline++;
            else critical++;

            if (pct < 50) r1++;
            else if (pct < 60) r2++;
            else if (pct < 75) r3++;
            else if (pct < 85) r4++;
            else if (pct < 90) r5++;
            else r6++;
        });

        // Top & Bottom students
        const sorted = [...studentData].sort((a, b) => b.pct - a.pct);
        const top5 = sorted.slice(0, 5);
        const bottom5 = [...sorted].reverse().slice(0, 5).reverse();

        let topBottomList = [];
        if (studentData.length <= 10) {
            topBottomList = sorted;
        } else {
            topBottomList = [...bottom5, ...top5];
        }

        return {
            donutSeries: [regular, borderline, critical],
            histogramSeries: [{
                name: 'Students',
                data: [r1, r2, r3, r4, r5, r6]
            }],
            topBottomSeries: [{
                name: 'Attendance %',
                data: topBottomList.map(s => s.pct)
            }],
            topBottomCategories: topBottomList.map(s => s.name || s.rollNo)
        };
    }, [filteredStudents, subjectMode, subjectFilter]);

    const donutOpts = {
        chart: { type: 'donut', height: 160, background: 'transparent' },
        labels: ['Regular (≥75%)', 'Borderline (60-75%)', 'Critical (<60%)'],
        colors: ['#10b981', '#f59e0b', '#f43f5e'],
        legend: { position: 'bottom', labels: { colors: '#94a3b8' } },
        stroke: { width: 0 },
        plotOptions: {
            pie: {
                donut: {
                    size: '65%',
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: 'Students',
                            color: '#94a3b8',
                            formatter: () => filteredStudents.length
                        }
                    }
                }
            }
        },
        dataLabels: { enabled: false }
    };

    const histogramOpts = {
        chart: { type: 'bar', height: 160, background: 'transparent', toolbar: { show: false } },
        plotOptions: {
            bar: {
                borderRadius: 4,
                columnWidth: '50%',
                distributed: true
            }
        },
        colors: ['#ef4444', '#f43f5e', '#f59e0b', '#3b82f6', '#6366f1', '#10b981'],
        xaxis: {
            categories: ['<50%', '50-60%', '60-75%', '75-85%', '85-90%', '90-100%'],
            labels: { style: { colors: '#94a3b8', fontSize: '9px' } }
        },
        yaxis: {
            labels: { style: { colors: '#94a3b8', fontSize: '9px' } }
        },
        grid: { borderColor: '#f1f5f9' },
        legend: { show: false },
        dataLabels: { enabled: false }
    };

    const topBottomOpts = {
        chart: { type: 'bar', height: 160, background: 'transparent', toolbar: { show: false } },
        plotOptions: {
            bar: {
                horizontal: true,
                borderRadius: 4,
                barHeight: '65%',
                distributed: true
            }
        },
        colors: (attendanceChartData.topBottomSeries[0]?.data || []).map(val => val >= 75 ? '#10b981' : val >= 60 ? '#f59e0b' : '#ef4444'),
        xaxis: {
            max: 100,
            labels: { style: { colors: '#94a3b8', fontSize: '9px' }, formatter: v => v + '%' }
        },
        yaxis: {
            categories: attendanceChartData.topBottomCategories,
            labels: { 
                style: { colors: '#94a3b8', fontSize: '9px' },
                formatter: (val) => {
                    return val && val.length > 12 ? val.substring(0, 10) + '..' : val;
                }
            }
        },
        grid: { borderColor: '#f1f5f9' },
        legend: { show: false },
        dataLabels: { 
            enabled: true, 
            formatter: v => v + '%',
            style: { fontSize: '9px', colors: ['#fff'] }
        }
    };

    /* ── Shared select className ── */
    const selectCls = "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer";

    return (
        <div className="space-y-4">

            {/* ══════ Filter Bar ══════ */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Filter size={14} className="text-indigo-500" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Filters</span>
                    {(subjectMode || filterMode !== 'all' || search) && (
                        <button onClick={clearFilter}
                            className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition-colors">
                            <X size={12} /> Clear all filters
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

                    {/* 3. Attendance Filter Mode Select */}
                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Attendance Filter</label>
                        <select 
                            value={filterMode} 
                            onChange={e => { setFilterMode(e.target.value); setPage(1); }}
                            className={`${selectCls} w-full sm:w-44`}
                        >
                            <option value="all">All Attendance</option>
                            <option value="below">Below Threshold</option>
                            <option value="range">Range (Min - Max)</option>
                        </select>
                    </div>

                    {/* 4. Conditional inputs */}
                    {filterMode === 'below' && (
                        <div className="flex flex-col gap-1 w-full sm:w-auto">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Below %</label>
                            <div className="relative flex items-center w-full sm:w-24">
                                <input 
                                    type="number" 
                                    min="0" 
                                    max="100"
                                    value={belowVal}
                                    onChange={e => { setBelowVal(e.target.value); setPage(1); }}
                                    placeholder="75"
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-3 pr-8 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-full"
                                />
                                <span className="absolute right-3 text-slate-400 text-xs font-semibold">%</span>
                            </div>
                        </div>
                    )}

                    {filterMode === 'range' && (
                        <>
                            <div className="flex flex-col gap-1 w-full sm:w-auto">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Min %</label>
                                <div className="relative flex items-center w-full sm:w-24">
                                    <input 
                                        type="number" 
                                        min="0" 
                                        max="100"
                                        value={minVal}
                                        onChange={e => { setMinVal(e.target.value); setPage(1); }}
                                        placeholder="40"
                                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-3 pr-8 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-full"
                                    />
                                    <span className="absolute right-3 text-slate-400 text-xs font-semibold">%</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1 w-full sm:w-auto">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Max %</label>
                                <div className="relative flex items-center w-full sm:w-24">
                                    <input 
                                        type="number" 
                                        min="0" 
                                        max="100"
                                        value={maxVal}
                                        onChange={e => { setMaxVal(e.target.value); setPage(1); }}
                                        placeholder="50"
                                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-3 pr-8 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-full"
                                    />
                                    <span className="absolute right-3 text-slate-400 text-xs font-semibold">%</span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* 5. Text search */}
                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Search</label>
                        <input type="text" placeholder="Name / Roll No…" value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-full sm:w-44" />
                    </div>

                    {/* 6. Result count + Download */}
                    <div className="flex items-center gap-3 w-full sm:w-auto sm:ml-auto">
                        <button onClick={handleDownload}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all">
                            <Download size={15} /> Download CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Tabs Bar ── */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border shadow-sm gap-2">
                <button
                    onClick={() => setActiveTab('list')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all
                        ${activeTab === 'list'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                    <Users size={16} /> Student List
                </button>
                <button
                    onClick={() => setActiveTab('analytics')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all
                        ${activeTab === 'analytics'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                    <BarChart3 size={16} /> Analytics
                </button>
            </div>

            {activeTab === 'list' ? (
                /* ══════ Table ══════ */
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
                                                    <td className="px-4 py-3 text-slate-400 text-xs">{subjectMode ? i + 1 : (page - 1) * 50 + i + 1}</td>
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
                                    No students found matching current filters.
                                </div>
                            )}
                        </>
                    )}
                </div>
            ) : (
                /* ══════ Analytics ══════ */
                <>
                    {isLoading ? (
                        <div className="flex justify-center py-24">
                            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-12 text-center text-slate-400">
                            <BarChart3 size={40} className="mx-auto mb-2 opacity-30" />
                            No analytics data available. Adjust filters to load data.
                        </div>
                    ) : (
                        <>
                            {/* ── Filtration Summary Stats ── */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard
                                    label="Students Shown"
                                    value={stats.total}
                                    icon={Users}
                                    color="indigo"
                                    sub={subjectMode ? `For ${subjectFilter}` : (selected === 'all' ? "All Years" : selected)}
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

                            {/* ── Visual Analytics Section ── */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                                <div className="mb-4">
                                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                                        <TrendingDown size={16} className="text-indigo-500" /> Section Performance Over Time
                                    </h3>
                                    <p className="text-xs text-slate-400">Average score percentage by assessment date and test category (Technical, Non-Technical, Grand Test)</p>
                                </div>
                                {perfLoading ? (
                                    <div className="flex justify-center py-20">
                                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : lineChartData.series.length === 0 ? (
                                    <div className="py-20 text-center text-slate-400 text-xs">
                                        No assessment performance data found for the selected section.
                                    </div>
                                ) : (
                                    <ReactApexChart options={lineChartOpts} series={lineChartData.series} type="line" height={350} />
                                )}
                            </div>

                            {/* ── Attendance Distribution & Standings ── */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
                                {/* 1. Donut */}
                                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <div className="mb-4">
                                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                                            <BarChart3 size={16} className="text-indigo-500" /> Attendance Status
                                        </h3>
                                        <p className="text-xs text-slate-400">Proportion of regular, borderline, and critical students</p>
                                    </div>
                                    <ReactApexChart options={donutOpts} series={attendanceChartData.donutSeries} type="donut" height={180} />
                                </div>

                                {/* 2. Histogram */}
                                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <div className="mb-4">
                                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                                            <BarChart3 size={16} className="text-indigo-500" /> Attendance Distribution
                                        </h3>
                                        <p className="text-xs text-slate-400">Number of students in different attendance ranges</p>
                                    </div>
                                    <ReactApexChart options={histogramOpts} series={attendanceChartData.histogramSeries} type="bar" height={180} />
                                </div>

                                {/* 3. Top & Bottom Standings */}
                                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <div className="mb-4">
                                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                                            <BarChart3 size={16} className="text-indigo-500" /> Top & Bottom Attendance
                                        </h3>
                                        <p className="text-xs text-slate-400">Students with the highest and lowest attendance rates</p>
                                    </div>
                                    <ReactApexChart options={topBottomOpts} series={attendanceChartData.topBottomSeries} type="bar" height={180} />
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
