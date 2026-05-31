import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminLogin } from '../api';
import { useAuth } from '../context/AuthContext';
import cseLogo from '../assets/logo.png';

export default function AdminLogin() {
    const [form, setForm] = useState({ username: '', password: '' });
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await adminLogin(form);
            login({ role: 'admin', username: data.username }, data.token);
            toast.success('Welcome back, Admin!');
            navigate('/admin/dashboard');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex items-center justify-center p-4">
            {/* Glow orbs */}
            <div className="absolute w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl top-20 left-20 pointer-events-none" />
            <div className="absolute w-72 h-72 bg-purple-600/20 rounded-full blur-3xl bottom-20 right-20 pointer-events-none" />

            <div className="relative w-full max-w-md">
                {/* Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                    {/* Icon */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-24 h-24 flex items-center justify-center mb-4 overflow-hidden">
                            <img src={cseLogo} alt="CSE Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Admin Login</h1>
                        <p className="text-slate-400 text-sm mt-1">CSE Attendance Management System</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Username */}
                        <div>
                            <label className="text-slate-300 text-sm font-medium mb-1.5 block">Username</label>
                            <div className="relative">
                                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={form.username}
                                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                                    className="w-full bg-white/10 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white/15 transition-all"
                                    placeholder="Enter username"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="text-slate-300 text-sm font-medium mb-1.5 block">Password</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type={showPwd ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    className="w-full bg-white/10 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white/15 transition-all"
                                    placeholder="Enter password"
                                    required
                                />
                                <button type="button" onClick={() => setShowPwd(!showPwd)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-900/50 disabled:opacity-60 mt-2"
                        >
                            {loading ? 'Signing in...' : 'Sign In as Admin'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <a href="/student/login" className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
                            Student Login →
                        </a>
                    </div>
                </div>

                <p className="text-center text-slate-500 text-xs mt-4">
                    Default: admin / admin123
                </p>
            </div>
        </div>
    );
}
