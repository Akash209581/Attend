import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Upload, BookOpen, Search, Users, LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import cseLogo from '../assets/logo.png';

const links = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/upload', icon: Upload, label: 'Upload Attendance' },
    { to: '/admin/sections', icon: BookOpen, label: 'Section View' },
    { to: '/admin/students', icon: Users, label: 'All Students' },
    { to: '/admin/search', icon: Search, label: 'Search Student' },
];

export default function Sidebar() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => { logout(); navigate('/admin'); };

    return (
        <aside className="w-64 shrink-0 bg-gradient-to-b from-indigo-950 to-slate-900 flex flex-col shadow-2xl">
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 py-5 border-b border-indigo-800/50">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden border border-slate-200/10 shrink-0">
                    <img src={cseLogo} alt="CSE Logo" className="w-full h-full object-cover" />
                </div>
                <div>
                    <p className="text-white font-bold text-sm leading-tight">CSE Attendance</p>
                    <p className="text-indigo-300 text-xs">Admin Panel</p>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {links.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
               ${isActive
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                                : 'text-indigo-200 hover:bg-indigo-800/40 hover:text-white'}`
                        }
                    >
                        <Icon size={18} />
                        {label}
                    </NavLink>
                ))}
            </nav>

            {/* Logout */}
            <div className="px-3 py-4 border-t border-indigo-800/50">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-300 hover:bg-red-900/30 hover:text-red-200 transition-all"
                >
                    <LogOut size={18} />
                    Logout
                </button>
            </div>
        </aside>
    );
}
