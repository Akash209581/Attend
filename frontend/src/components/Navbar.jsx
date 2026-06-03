import { Sun, Moon, Bell, User, Menu } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

const titleMap = {
    '/admin/dashboard': 'Dashboard',
    '/admin/upload': 'Upload Attendance',
    '/admin/students': 'All Students',
    '/admin/assessments': 'Assessments',
    '/admin/search': 'Search Student',
};

export default function Navbar({ onToggleSidebar }) {
    const { dark, toggle } = useTheme();
    const { user } = useAuth();
    const { pathname } = useLocation();
    const title = titleMap[pathname] || 'Admin Panel';

    return (
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-6 shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
                <button
                    onClick={onToggleSidebar}
                    className="lg:hidden w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
                >
                    <Menu size={18} />
                </button>
                <h1 className="text-base md:text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
                {/* Theme toggle */}
                <button
                    onClick={toggle}
                    className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
                >
                    {dark ? <Sun size={16} /> : <Moon size={16} />}
                </button>

                {/* User badge */}
                <div className="flex items-center gap-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-1.5">
                    <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                        <User size={14} className="text-white" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {user?.username || 'Admin'}
                    </span>
                </div>
            </div>
        </header>
    );
}
