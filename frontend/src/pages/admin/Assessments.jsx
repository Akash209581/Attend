import { useState, useEffect, useMemo } from 'react';
import { Upload as UploadIcon, CheckCircle, AlertCircle, FileSpreadsheet, Calendar, GraduationCap, Trash2, Search, Filter, Award, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadAssessments, getAssessments, deleteAssessmentUpload, getUploads } from '../../api';

const todayStr = () => {
    const d = new Date();
    return d.toISOString().split('T')[0];
};

export default function AdminAssessments() {
    /* ── Upload State ── */
    const [file, setFile] = useState(null);
    const [uploadDate, setUploadDate] = useState(todayStr());
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [uploadsHistory, setUploadsHistory] = useState([]);

    /* ── List/Filter State ── */
    const [assessments, setAssessments] = useState([]);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);

    // Filters
    const [searchRoll, setSearchRoll] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [filterAssessment, setFilterAssessment] = useState('');
    const [allSubjects, setAllSubjects] = useState([]);
    const [allDates, setAllDates] = useState([]);

    /* ── Load Data ── */
    const fetchHistory = async () => {
        try {
            const { data } = await getUploads();
            // Filter to show only assessment uploads
            setUploadsHistory(data.filter(h => h.section === 'CRT-ASSESSMENT'));
        } catch (err) {
            console.error('Failed to load uploads history', err);
        }
    };

    const fetchAssessments = async () => {
        setLoading(true);
        try {
            const { data } = await getAssessments({
                rollNo: searchRoll,
                subject: filterSubject,
                assessmentName: filterAssessment,
                page,
                limit: 20
            });
            setAssessments(data.assessments);
            setTotal(data.total);
            setPages(data.pages);
            if (data.allSubjects) setAllSubjects(data.allSubjects);
            if (data.allDates) setAllDates(data.allDates);
        } catch (err) {
            console.error('Failed to fetch assessments', err);
            toast.error('Failed to load assessments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    useEffect(() => {
        fetchAssessments();
    }, [page, filterSubject, filterAssessment]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        fetchAssessments();
    };

    /* ── Handlers ── */
    const handleDeleteUpload = async (id) => {
        if (!window.confirm('Are you sure you want to delete this upload? This will completely remove all student marks associated with this Excel file.')) {
            return;
        }
        try {
            await deleteAssessmentUpload(id);
            toast.success('Assessment upload deleted successfully');
            fetchHistory();
            setPage(1);
            fetchAssessments();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Delete failed');
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) setFile(f);
        else toast.error('Please drop a valid Excel file (.xlsx)');
    };

    const handleFileChange = (e) => {
        const f = e.target.files[0];
        if (f) setFile(f);
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!file) return toast.error('Please choose an Excel file (.xlsx)');
        if (!uploadDate) return toast.error('Please select an upload date');

        const fd = new FormData();
        fd.append('file', file);
        fd.append('uploadDate', uploadDate);

        setUploadLoading(true);
        setUploadResult(null);
        try {
            const { data } = await uploadAssessments(fd);
            setUploadResult({ ok: true, ...data });
            toast.success(data.message);
            setFile(null);
            fetchHistory();
            setPage(1);
            fetchAssessments();
        } catch (err) {
            setUploadResult({ ok: false, message: err.response?.data?.message || 'Upload failed' });
            toast.error(err.response?.data?.message || 'Upload failed');
        } finally {
            setUploadLoading(false);
        }
    };

    // Derived unique subjects and assessments from the loaded records to populate filter dropdowns dynamically
    const uniqueSubjects = allSubjects;
    const uniqueAssessments = allDates;

    const selectCls = "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Upload Form & History (1 Col) */}
            <div className="lg:col-span-1 space-y-6">
                
                {/* Upload Form Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                            <Award size={18} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <h2 className="text-base font-semibold text-slate-800 dark:text-white">Upload 4th Year Marks</h2>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 ml-12">
                        Upload student assessment score sheets (.xlsx).
                    </p>

                    <form onSubmit={handleUploadSubmit} className="space-y-4">
                        
                        {/* Upload Date */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                                <Calendar size={12} className="inline mr-1" />
                                Assessment Date
                            </label>
                            <input
                                type="date"
                                value={uploadDate}
                                max={todayStr()}
                                onChange={(e) => setUploadDate(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                            />
                        </div>

                        {/* Drop Zone */}
                        <div
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById('assessment-file-input').click()}
                            className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                                ${dragOver
                                    ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                                    : 'border-slate-300 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                        >
                            <input
                                id="assessment-file-input"
                                type="file"
                                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            {file ? (
                                <div className="flex flex-col items-center gap-2">
                                    <FileSpreadsheet size={24} className="text-emerald-500" />
                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[160px]">{file.name}</p>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                        className="text-[10px] text-rose-500 hover:text-rose-400 transition-colors"
                                    >
                                        Remove file
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <UploadIcon size={24} className="text-slate-400" />
                                    <div>
                                        <p className="text-slate-600 dark:text-slate-300 font-semibold text-xs">Drop Excel file here</p>
                                        <p className="text-slate-400 text-[10px]">or click to browse (.xlsx)</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Format guide */}
                        <div className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-3 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 space-y-1">
                            <p className="font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">Spreadsheet format:</p>
                            <ul className="list-disc list-inside space-y-0.5">
                                <li><code className="text-indigo-500 font-mono">Roll Number</code> (e.g. 231FA04048)</li>
                                <li><code className="text-indigo-500 font-mono">Batch Number</code> (e.g. B9, B1)</li>
                                <li><code className="text-indigo-500 font-mono">Assesment name</code> (e.g. Technical, Non Technical or Grand Test)</li>
                                <li><code className="text-indigo-500 font-mono">Marks</code> (Scores out of 100, or AB/ABSENT for absent)</li>
                                <li className="text-rose-500/80 dark:text-rose-400/80 font-medium">No Subject or Date columns required</li>
                            </ul>
                        </div>

                        <button
                            type="submit"
                            disabled={uploadLoading || !file}
                            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-sm"
                        >
                            {uploadLoading ? (
                                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
                            ) : (
                                <><UploadIcon size={14} /> Upload Marks Sheet</>
                            )}
                        </button>
                    </form>

                    {/* Result Banner */}
                    {uploadResult && (
                        <div className={`mt-3 p-3 rounded-xl flex items-start gap-2.5 text-xs ${uploadResult.ok ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300'}`}>
                            {uploadResult.ok ? <CheckCircle size={14} className="shrink-0 mt-0.5" /> : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
                            <div>
                                <p className="font-semibold">{uploadResult.message}</p>
                                {uploadResult.ok && <p className="opacity-80 mt-0.5">Total Records: {uploadResult.total}</p>}
                            </div>
                        </div>
                    )}
                </div>

                {/* Upload History Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-2.5 mb-4">
                        <Calendar size={16} className="text-purple-500" />
                        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Upload History</h2>
                    </div>

                    {uploadsHistory.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">No assessment uploads yet.</p>
                    ) : (
                        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                            {uploadsHistory.map((h) => (
                                <div key={h.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                                    <div className="min-w-0 pr-2">
                                        <p className="font-semibold text-slate-700 dark:text-slate-300 truncate" title={h.filename}>{h.filename}</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                            {new Date(h.upload_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' })} · {h.record_count} rows
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteUpload(h.id)}
                                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 shrink-0 transition-colors"
                                        title="Delete this upload"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>

            {/* Right: Scores List & Filters (2 Cols) */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* Filters card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <Filter size={14} className="text-purple-500" />
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Filters</span>
                    </div>

                    <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row flex-wrap gap-3 items-end">
                        
                        {/* Search Roll No */}
                        <div className="flex flex-col gap-1 w-full sm:w-auto flex-1 min-w-[150px]">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search Student</label>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Roll Number..."
                                    value={searchRoll}
                                    onChange={(e) => setSearchRoll(e.target.value.toUpperCase())}
                                    className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                            </div>
                        </div>

                        {/* Subject Filter */}
                        <div className="flex flex-col gap-1 w-full sm:w-auto">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assessment Name</label>
                            <select
                                value={filterSubject}
                                onChange={(e) => { setFilterSubject(e.target.value); setPage(1); }}
                                className={`${selectCls} w-full`}
                            >
                                <option value="">All Assessments</option>
                                {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        {/* Assessment Filter */}
                        <div className="flex flex-col gap-1 w-full sm:w-auto">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</label>
                            <select
                                value={filterAssessment}
                                onChange={(e) => { setFilterAssessment(e.target.value); setPage(1); }}
                                className={`${selectCls} w-full`}
                            >
                                <option value="">All Dates</option>
                                {uniqueAssessments.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>

                        {/* Filter Trigger */}
                        <button
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all w-full sm:w-auto"
                        >
                            Apply Search
                        </button>
                    </form>
                </div>

                {/* Scores Table Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[600px]">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase text-left">
                                            <th className="px-4 py-3">#</th>
                                            <th className="px-4 py-3">Roll No</th>
                                            <th className="px-4 py-3">Name</th>
                                            <th className="px-4 py-3">Assessment Name</th>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Marks</th>
                                            <th className="px-4 py-3">Pct %</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                        {assessments.map((a, i) => {
                                            const isAbsent = a.marks < 0;
                                            const pct = isAbsent ? 0 : (a.percentage ?? 0);
                                            const color = isAbsent
                                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                                : pct >= 75
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    : pct >= 50
                                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';

                                            return (
                                                <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-4 py-3 text-slate-400 text-xs">{((page - 1) * 20) + i + 1}</td>
                                                    <td className="px-4 py-3 font-mono font-medium text-indigo-600 dark:text-indigo-400 text-xs">{a.rollNo}</td>
                                                    <td className="px-4 py-3 font-medium text-xs">{a.name}</td>
                                                    <td className="px-4 py-3 text-xs">{a.subject}</td>
                                                    <td className="px-4 py-3 text-xs">{a.assessmentName}</td>
                                                    <td className="px-4 py-3 font-semibold text-xs">
                                                        {isAbsent ? (
                                                            <span className="text-rose-600 dark:text-rose-400 font-bold">Absent</span>
                                                        ) : (
                                                            `${a.marks} / ${a.maxMarks}`
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${color}`}>
                                                            {isAbsent ? 'Absent' : `${pct}%`}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {pages > 1 && (
                                <div className="flex justify-between items-center px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                                    <span>Showing page {page} of {pages} ({total} entries)</span>
                                    <div className="flex gap-1">
                                        <button
                                            disabled={page === 1}
                                            onClick={() => setPage(page - 1)}
                                            className="p-1.5 rounded bg-slate-100 dark:bg-slate-850 hover:bg-indigo-100 disabled:opacity-40 transition-all text-slate-600 dark:text-slate-300"
                                        >
                                            <ChevronLeft size={14} />
                                        </button>
                                        <button
                                            disabled={page === pages}
                                            onClick={() => setPage(page + 1)}
                                            className="p-1.5 rounded bg-slate-100 dark:bg-slate-850 hover:bg-indigo-100 disabled:opacity-40 transition-all text-slate-600 dark:text-slate-300"
                                        >
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {assessments.length === 0 && (
                                <div className="py-12 text-center text-slate-400 text-xs">
                                    <Award size={32} className="mx-auto mb-2 opacity-35 text-slate-500" />
                                    No assessment records found matching your filters.
                                </div>
                            )}
                        </>
                    )}
                </div>

            </div>

        </div>
    );
}
