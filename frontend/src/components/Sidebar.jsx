import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Upload, Search, Users, LogOut, Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import cseLogo from '../assets/logo.png';

const links = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/upload', icon: Upload, label: 'Upload Attendance' },
    { to: '/admin/students', icon: Users, label: 'All Students' },
    { to: '/admin/assessments', icon: Award, label: 'Assessments' },
    { to: '/admin/search', icon: Search, label: 'Search Student' },
];

export default function Sidebar({ isOpen, setIsOpen }) {
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    const filteredLinks = links.filter(
        link => !(user?.adminRole === 'restricted_admin' && link.to === '/admin/upload')
    );

    const handleLogout = () => {
        logout();
        if (setIsOpen) setIsOpen(false);
        navigate('/admin');
    };

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-indigo-950 to-slate-900 flex flex-col shadow-2xl transition-transform duration-300 lg:static lg:translate-x-0 shrink-0
                ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Logo */}
                <div className="flex items-center gap-3 px-6 py-5 border-b border-indigo-800/50">
                    <div className="w-14 h-14 flex items-center justify-center shrink-0 overflow-hidden">
                        <img src={cseLogo} alt="CSE Logo" className="max-w-full max-h-full object-contain" />
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm leading-tight">CSE Attendance</p>
                        <p className="text-indigo-300 text-xs">Admin Panel</p>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {filteredLinks.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            onClick={() => setIsOpen && setIsOpen(false)}
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
        </>
    );
}
