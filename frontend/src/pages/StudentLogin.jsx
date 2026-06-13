import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { studentLogin } from '../api';
import { useAuth } from '../context/AuthContext';
import cseLogo from '../assets/logo.png';

export default function StudentLogin() {
    const [form, setForm] = useState({ rollNo: '', password: '' });
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.currentTime = 21;
            videoRef.current.pause();
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await studentLogin(form);
            login({ role: 'student', rollNo: data.rollNo, name: data.name, section: data.section }, data.token);
            toast.success(
                <div>
                    <p className="font-semibold">Welcome, {data.name}! </p>
                    {/* <p className="text-xs text-slate-400 mt-0.5">Web Developer: Akash Bandaru</p> */}
                </div>
            );
            navigate('/student/dashboard');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 flex items-center justify-center md:justify-start p-4 md:pl-48 md:pr-24 overflow-hidden">
            {/* Background Video (Desktop only) */}
            <video
                ref={videoRef}
                preload="auto"
                playsInline
                className="hidden md:block absolute inset-0 w-full h-full object-cover scale-105 z-0 pointer-events-none"
            >
                <source src={`${import.meta.env.BASE_URL}Video-729.mp4#t=21`} type="video/mp4" />
            </video>

            <div className="absolute w-96 h-96 bg-blue-600/15 rounded-full blur-3xl top-10 right-10 pointer-events-none z-0" />
            <div className="absolute w-72 h-72 bg-cyan-600/15 rounded-full blur-3xl bottom-10 left-10 pointer-events-none z-0" />

            <div className="relative w-full max-w-md z-10">
                <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-24 h-24 flex items-center justify-center mb-4 overflow-hidden">
                            <img src={cseLogo} alt="CSE Logo" className="max-w-full max-h-full object-contain" fetchPriority="high" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">Student Login</h1>
                        <p className="text-slate-500 text-sm mt-1">View your attendance records</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-slate-700 text-sm font-medium mb-1.5 block">Register Number</label>
                            <div className="relative">
                                <Hash size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={form.rollNo}
                                    onChange={(e) => {
                                        const val = e.target.value.toUpperCase();
                                        setForm({ ...form, rollNo: val });
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all uppercase"
                                    placeholder="e.g. 231FA04867"
                                    required
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-slate-700 text-sm font-medium mb-1.5 block">Password</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type={showPwd ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                                    placeholder="Same as register number"
                                    required
                                    autoComplete="current-password"
                                />
                                <button type="button" onClick={() => setShowPwd(!showPwd)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all duration-200 shadow-md disabled:opacity-60 mt-2 cursor-pointer"
                        >
                            {loading ? 'Signing in...' : 'View My Attendance'}
                        </button>
                    </form>


                </div>
            </div>
        </div>
    );
}
