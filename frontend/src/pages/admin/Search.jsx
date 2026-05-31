import { useState } from 'react';
import { searchStudents } from '../../api';
import { Search as SearchIcon, User, BookOpen } from 'lucide-react';

function AttBadge({ pct }) {
    const color = pct >= 75 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        : pct >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
    return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{pct}%</span>;
}

export default function Search() {
    const [query, setQuery] = useState('');
    const [nameQuery, setNameQuery] = useState('');
    const [results, setResults] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query && !nameQuery) return;
        setLoading(true);
        setSelected(null);
        try {
            const { data } = await searchStudents({ rollNo: query, name: nameQuery });
            setResults(data);
            setSearched(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Search Form */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                <form onSubmit={handleSearch} className="flex gap-3">
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
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60"
                    >
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </form>
            </div>

            {/* Results */}
            {searched && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* List */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        {results.length === 0 ? (
                            <div className="py-12 text-center text-slate-400">No students found</div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {results.map((s) => (
                                    <button
                                        key={s._id}
                                        onClick={() => setSelected(s)}
                                        className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors
                      ${selected?._id === s._id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{s.name}</p>
                                                <p className="text-xs text-indigo-500 font-mono">{s.rollNo}</p>
                                            </div>
                                            <AttBadge pct={s.totalPercentage} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Detail */}
                    {selected && (
                        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
                            {/* Profile */}
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0">
                                    {selected.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">{selected.name}</h3>
                                    <p className="text-indigo-500 font-mono text-sm">{selected.rollNo}</p>
                                    <div className="flex gap-3 mt-1">
                                        <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{selected.section}</span>
                                        <AttBadge pct={selected.totalPercentage} />
                                    </div>
                                </div>
                            </div>

                            {/* Subject table */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                                    <BookOpen size={14} /> Subject-wise Attendance
                                </h4>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-800/50">
                                                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Subject</th>
                                                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Attended</th>
                                                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Total</th>
                                                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">%</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {(selected.subjects || []).map((sub, i) => (
                                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                                    <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200">{sub.subject}</td>
                                                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{sub.attended}</td>
                                                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{sub.total}</td>
                                                    <td className="px-3 py-2"><AttBadge pct={sub.percentage} /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
