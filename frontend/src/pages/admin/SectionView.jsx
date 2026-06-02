import { useState, useEffect } from 'react';
import { getAdminSections, getSectionStudents, downloadCSV } from '../../api';
import { Download, ChevronRight, Users, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

function AttBadge({ pct }) {
    const color = pct >= 75 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        : pct >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
    return (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{pct}%</span>
    );
}

export default function SectionView() {
    const [sections, setSections] = useState([]);
    const [selected, setSelected] = useState('');
    const [students, setStudents] = useState([]);
    const [meta, setMeta] = useState({});
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getAdminSections().then(({ data }) => {
            const sortedData = [...data].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
            setSections(sortedData);
            if (sortedData.length) setSelected(sortedData[0]);
        });
    }, []);

    useEffect(() => {
        if (!selected) return;
        setLoading(true);
        getSectionStudents(selected, page)
            .then(({ data }) => { setStudents(data.students); setMeta(data); })
            .finally(() => setLoading(false));
    }, [selected, page]);

    const handleDownload = async () => {
        try {
            const { data } = await downloadCSV(selected);
            const url = URL.createObjectURL(new Blob([data]));
            const a = document.createElement('a');
            a.href = url; a.download = `attendance_${selected}.csv`; a.click();
            URL.revokeObjectURL(url);
        } catch { toast.error('Download failed'); }
    };

    const avgPct = students.length
        ? Math.round(students.reduce((s, st) => s + st.totalPercentage, 0) / students.length)
        : 0;

    return (
        <div className="space-y-4">
            {/* Section tabs */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex flex-wrap gap-2">
                    {sections.map((s) => (
                        <button
                            key={s}
                            onClick={() => { setSelected(s); setPage(1); }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${selected === s
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/20'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {selected && (
                <>
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-xl px-4 py-2 border border-slate-200 dark:border-slate-800">
                                <Users size={16} className="text-indigo-500" />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {meta.total || 0} Students
                                </span>
                            </div>
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-xl px-4 py-2 border border-slate-200 dark:border-slate-800">
                                <TrendingUp size={16} className="text-emerald-500" />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Avg {avgPct}%
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={handleDownload}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all"
                        >
                            <Download size={15} /> Download CSV
                        </button>
                    </div>

                    {/* Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="flex justify-center py-16">
                                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm min-w-[500px]">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">#</th>
                                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Roll No</th>
                                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Name</th>
                                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Section</th>
                                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total %</th>
                                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Batches</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {students.map((st, i) => (
                                                <tr key={st._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="px-4 py-3 text-slate-400">{(page - 1) * 50 + i + 1}</td>
                                                    <td className="px-4 py-3 font-mono font-medium text-indigo-600 dark:text-indigo-400">{st.rollNo}</td>
                                                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200 font-medium">{st.name}</td>
                                                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{st.section}</td>
                                                    <td className="px-4 py-3"><AttBadge pct={st.totalPercentage} /></td>
                                                    <td className="px-4 py-3 text-slate-400 text-xs">{(st.subjects || []).length} batches</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {meta.pages > 1 && (
                                    <div className="flex justify-center items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800">
                                        {Array.from({ length: meta.pages }, (_, i) => i + 1).map((p) => (
                                            <button
                                                key={p}
                                                onClick={() => setPage(p)}
                                                className={`w-8 h-8 rounded-lg text-sm font-medium transition-all
                          ${p === page ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-100'}`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </>
            )}

            {sections.length === 0 && (
                <div className="text-center py-20 text-slate-400">
                    <Users size={48} className="mx-auto mb-3 opacity-30" />
                    <p>No sections found. Upload attendance data first.</p>
                </div>
            )}
        </div>
    );
}
