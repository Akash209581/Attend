import { useState, useEffect } from 'react';
import { Upload as UploadIcon, CheckCircle, AlertCircle, FileSpreadsheet, Calendar, GraduationCap, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadFile, getUploads, deleteUpload } from '../../api';

const CRT_START = '2026-05-22';

const todayStr = () => {
    const d = new Date();
    return d.toISOString().split('T')[0];
};

export default function AdminUpload() {
    const [file, setFile] = useState(null);
    const [year, setYear] = useState('3');
    const [uploadDate, setUploadDate] = useState(todayStr());
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [dragOver, setDragOver] = useState(false);
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
        fetchHistory();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this upload? This will completely remove all attendance records and recalculate all student averages.')) {
            return;
        }
        try {
            await deleteUpload(id);
            toast.success('Upload deleted successfully');
            fetchHistory();
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return toast.error('Please choose an Excel file (.xlsx)');
        if (!uploadDate) return toast.error('Please select an upload date');
        if (uploadDate < CRT_START) return toast.error(`Date cannot be before CRT start: ${CRT_START}`);

        const fd = new FormData();
        fd.append('file', file);
        fd.append('year', year);
        fd.append('uploadDate', uploadDate);
        fd.append('section', year === '3' ? 'CRT-3RD' : 'CRT-4TH');

        setLoading(true);
        setResult(null);
        try {
            const { data } = await uploadFile(fd);
            setResult({ ok: true, ...data });
            toast.success(data.message);
            setFile(null);
            fetchHistory();
        } catch (err) {
            setResult({ ok: false, message: err.response?.data?.message || 'Upload failed' });
            toast.error(err.response?.data?.message || 'Upload failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                        <FileSpreadsheet size={18} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Upload CRT Attendance</h2>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 ml-12">
                    Upload the daily Excel attendance sheet (.xlsx). Student accounts are created automatically with password = Roll Number.
                </p>

                {/* CRT Start Info Banner */}
                <div className="mb-5 flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-3">
                    <Calendar size={16} className="text-indigo-500 shrink-0" />
                    <p className="text-sm text-indigo-700 dark:text-indigo-300">
                        <span className="font-semibold">CRT Start Date:</span> 22-May-2026 — Attendance is tracked from this date onwards.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Year Selector */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            <GraduationCap size={14} className="inline mr-1.5" />
                            Select Year
                        </label>
                        <div className="flex flex-col sm:flex-row gap-3">
                            {[
                                { val: '3', label: '3rd Year', desc: 'CRT Day wise.xlsx' },
                                { val: '4', label: '4th Year', desc: '4year.xlsx' },
                            ].map(({ val, label, desc }) => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => setYear(val)}
                                    className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium border-2 transition-all text-left ${year === val
                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300'
                                        }`}
                                >
                                    <div className="font-semibold">{label}</div>
                                    <div className="text-xs opacity-70 mt-0.5">{desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Upload Date */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            <Calendar size={14} className="inline mr-1.5" />
                            Upload Date (Attendance as of this date)
                        </label>
                        <input
                            type="date"
                            value={uploadDate}
                            min={CRT_START}
                            max={todayStr()}
                            onChange={(e) => setUploadDate(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                        />
                    </div>

                    {/* Drop Zone */}
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('excel-file-input').click()}
                        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all
              ${dragOver
                                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                                : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                    >
                        <input
                            id="excel-file-input"
                            type="file"
                            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        {file ? (
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/40 rounded-2xl flex items-center justify-center">
                                    <FileSpreadsheet size={28} className="text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <p className="font-semibold text-slate-700 dark:text-slate-200">{file.name}</p>
                                <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                    className="text-xs text-rose-500 hover:text-rose-400 transition-colors"
                                >
                                    ✕ Remove file
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
                                    <UploadIcon size={28} className="text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-slate-600 dark:text-slate-300 font-medium">Drop your Excel file here</p>
                                    <p className="text-slate-400 text-sm">or click to browse (.xlsx, .xls)</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Format hint */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1.5">Expected Excel format:</p>
                        <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                            <li>Required Columns: <code className="text-indigo-500">RegisterNO</code>, <code className="text-indigo-500">Name</code>, <code className="text-indigo-500">Batch Name</code>, <code className="text-indigo-500">attendance percentage</code></li>
                            <li>No conducted hours needed. Day count and slots (3 slots per day) are calculated automatically based on the attendance percentage.</li>
                        </ul>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !file}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
                        ) : (
                            <><UploadIcon size={16} /> Upload & Process {year === '3' ? '3rd Year' : '4th Year'} Attendance</>
                        )}
                    </button>
                </form>

                {/* Result */}
                {result && (
                    <div className={`mt-4 p-4 rounded-xl flex items-start gap-3 ${result.ok ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300'}`}>
                        {result.ok ? <CheckCircle size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
                        <div>
                            <p className="font-medium text-sm">{result.message}</p>
                            {result.ok && (
                                <p className="text-xs mt-1 opacity-80">
                                    Year: {result.year === 3 ? '3rd' : '4th'} | Date: {result.uploadDate} | Records: {result.total}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Upload History Table */}
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
