export default function StatCard({ label, value, icon: Icon, color, sub }) {
    const colorMap = {
        indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-500/20',
        green: 'from-emerald-500 to-emerald-600 shadow-emerald-500/20',
        red: 'from-rose-500 to-rose-600 shadow-rose-500/20',
        amber: 'from-amber-500 to-amber-600 shadow-amber-500/20',
    };
    const grad = colorMap[color] || colorMap.indigo;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{label}</p>
                    <p className="text-3xl font-bold text-slate-800 dark:text-white mt-1 group-hover:scale-105 transition-transform origin-left">
                        {value ?? '—'}
                    </p>
                    {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
                </div>
                <div className={`w-12 h-12 bg-gradient-to-br ${grad} rounded-2xl flex items-center justify-center shadow-lg`}>
                    <Icon size={22} className="text-white" />
                </div>
            </div>
        </div>
    );
}
