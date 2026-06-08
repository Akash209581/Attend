import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactApexChart from 'react-apexcharts';
import { getStudentProfile, getStudentSubjects, getStudentHistory, getStudentAssessments } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
    Sun, Moon, LogOut, BookOpen,
    History, Award, TrendingUp, CheckCircle, AlertTriangle,
    CalendarDays, Calendar, LayoutGrid, Sparkles, BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';
import cseLogo from '../../assets/logo.png';

/* ════════════════════════════════════════════════════════════════════════════
   WormChart — custom SVG: glowing line draws left→right with lightning tip
   Animation triggers only when the chart enters the viewport.
   ════════════════════════════════════════════════════════════════════════════ */
function WormChart({ subjects, percentages, isDark }) {
    const pathRef = useRef(null);
    const containerRef = useRef(null);
    const [pLen, setPLen] = useState(2000);
    const [animKey, setAnimKey] = useState(0); // 0 = not started yet

    // Measure path length AND start animation in one React batch
    // so the keyframe always uses the correct path length (no gap between glow and line tip)
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    // Measure real length first — batched with animKey bump
                    if (pathRef.current) {
                        const realLen = pathRef.current.getTotalLength();
                        if (realLen > 0) setPLen(realLen);
                    }
                    setAnimKey(k => k + 1); // re-render once with both updates
                }
            },
            { threshold: 0.35 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    if (!percentages.length) return null;

    const W = 620, H = 250;
    const PAD = { top: 20, right: 20, bottom: 65, left: 40 };
    const cW = W - PAD.left - PAD.right;
    const cH = H - PAD.top - PAD.bottom;

    const xScale = i => PAD.left + (i / Math.max(percentages.length - 1, 1)) * cW;
    const yScale = v => PAD.top + cH - (Math.min(v, 100) / 100) * cH;

    const pts = percentages.map((p, i) => ({ x: xScale(i), y: yScale(p) }));
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1], curr = pts[i];
        const cp1x = prev.x + (curr.x - prev.x) * 0.4;
        const cp2x = curr.x - (curr.x - prev.x) * 0.4;
        d += ` C ${cp1x} ${prev.y}, ${cp2x} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    const dotColor = p => p >= 75 ? '#10b981' : p >= 60 ? '#f59e0b' : '#f43f5e';
    const axisClr = isDark ? '#64748b' : '#94a3b8';
    const y75 = yScale(75);
    const DUR = '3s';

    const lineAnim = animKey > 0
        ? { animation: `wormDraw_${animKey} ${DUR} linear forwards` }
        : {};

    const ep = pts[pts.length - 1]; // endpoint for persistent spark

    // sky-blue lightning colours
    const SKY1 = '#38bdf8'; // sky-400
    const SKY2 = '#7dd3fc'; // sky-300
    const SKY3 = '#bae6fd'; // sky-200

    // Helper: an animateMotion circle that follows the path
    const motionCircle = (props, key) => (
        <circle key={key} {...props}>
            {animKey > 0 && (
                <animateMotion dur={DUR} fill="freeze" calcMode="linear">
                    <mpath href={`#wp-${animKey}`} />
                </animateMotion>
            )}
        </circle>
    );

    return (
        <div ref={containerRef} className="w-full">
            {animKey > 0 && (
                <style>{`
                    @keyframes wormDraw_${animKey} {
                        from { stroke-dashoffset: ${pLen}; }
                        to   { stroke-dashoffset: 0; }
                    }
                    /* Sky lightning flicker at tip */
                    @keyframes skyFlicker_${animKey} {
                        0%,100% { opacity: 0.15; }
                        15%     { opacity: 1;    }
                        30%     { opacity: 0.2;  }
                        55%     { opacity: 0.9;  }
                        75%     { opacity: 0.1;  }
                        90%     { opacity: 0.8;  }
                    }
                    @keyframes skyRing_${animKey} {
                        0%   { r: 4;  opacity: 1;   }
                        80%  { r: 28; opacity: 0.1; }
                        100% { r: 34; opacity: 0;   }
                    }
                    @keyframes dotPop_${animKey} {
                        0%   { opacity: 0; r: 0; }
                        60%  { opacity: 1; r: 7; }
                        100% { opacity: 1; r: 5; }
                    }
                    /* Endpoint persistent sky spark */
                    @keyframes endSkyRing_${animKey} {
                        0%   { r: 4;  opacity: 1;   }
                        80%  { r: 28; opacity: 0.1; }
                        100% { r: 34; opacity: 0;   }
                    }
                    @keyframes endSkyGlow_${animKey} {
                        0%,100% { opacity: 0.3; }
                        50%     { opacity: 1;   }
                    }
                `}</style>
            )}

            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ overflow: 'visible' }}>
                <defs>
                    {/* Sky-blue outer halo filter */}
                    <filter id={`sk1-${animKey}`} x="-120%" y="-120%" width="340%" height="340%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="b" /></feMerge>
                    </filter>
                    {/* Sky-blue inner tight glow */}
                    <filter id={`sk2-${animKey}`} x="-60%" y="-60%" width="220%" height="220%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    {/* White core micro-glow */}
                    <filter id={`sk3-${animKey}`} x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                {/* 75% threshold */}
                <line x1={PAD.left} y1={y75} x2={W - PAD.right} y2={y75}
                    stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5,4" opacity="0.7" />
                <text x={PAD.left + 4} y={y75 - 5} fill="#ef4444" fontSize="10" fontFamily="Inter,sans-serif">75%</text>

                {/* Y-axis labels */}
                {[0, 25, 50, 75, 100].map(v => (
                    <text key={v} x={PAD.left - 6} y={yScale(v) + 4}
                        fill={axisClr} fontSize="10" textAnchor="end" fontFamily="Inter,sans-serif">{v}%</text>
                ))}

                {/* ── Clean crisp line — NO glow on the body ──────────────────── */}
                <path ref={pathRef} id={`wp-${animKey}`} d={d} fill="none"
                    stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round"
                    strokeDasharray={pLen} strokeDashoffset={pLen}
                    style={lineAnim}
                />

                {/* ── Sky lightning at the moving tip ONLY ────────────────────── */}
                {animKey > 0 && (<>

                    {/* Wide sky-blue outer halo (big diffuse glow) */}
                    {motionCircle({
                        r: 18, fill: SKY2,
                        filter: `url(#sk1-${animKey})`,
                        style: { animation: `skyFlicker_${animKey} 0.22s ease-in-out infinite` }
                    }, 'h1')}

                    {/* Mid sky burst */}
                    {motionCircle({
                        r: 10, fill: SKY1,
                        filter: `url(#sk2-${animKey})`,
                        style: { animation: `skyFlicker_${animKey} 0.14s ease-in-out 0.04s infinite` }
                    }, 'h2')}

                    {/* Sonar ring 1 */}
                    {motionCircle({
                        r: 4, fill: SKY1, opacity: 0,
                        style: { animation: `skyRing_${animKey} 0.5s ease-out infinite` }
                    }, 'r1')}

                    {/* Sonar ring 2 (offset) */}
                    {motionCircle({
                        r: 4, fill: SKY2, opacity: 0,
                        style: { animation: `skyRing_${animKey} 0.5s ease-out 0.25s infinite` }
                    }, 'r2')}

                    {/* Bright white core */}
                    {motionCircle({
                        r: 4, fill: '#ffffff',
                        filter: `url(#sk3-${animKey})`,
                        style: { animation: `skyFlicker_${animKey} 0.1s ease-in-out 0.02s infinite` }
                    }, 'core')}

                </>)}

                {/* ── Persistent sky lightning at endpoint after line finishes ── */}
                {animKey > 0 && (
                    <>
                        {/* 3 staggered sonar rings from endpoint */}
                        {[0, 0.25, 0.5].map((off, i) => (
                            <circle key={`er-${i}`} cx={ep.x} cy={ep.y} r="4"
                                fill={SKY1} opacity="0"
                                style={{ animation: `endSkyRing_${animKey} 0.55s ease-out ${3 + off}s infinite` }}
                            />
                        ))}
                        {/* Glowing sky halo at endpoint */}
                        <circle cx={ep.x} cy={ep.y} r="16"
                            fill={SKY2} opacity="0"
                            filter={`url(#sk1-${animKey})`}
                            style={{ animation: `endSkyGlow_${animKey} 0.4s ease-in-out 3s infinite alternate` }}
                        />
                        {/* Flickering sky core at endpoint */}
                        <circle cx={ep.x} cy={ep.y} r="5"
                            fill={SKY1} opacity="0"
                            filter={`url(#sk2-${animKey})`}
                            style={{ animation: `endSkyGlow_${animKey} 0.25s ease-in-out 3s infinite alternate` }}
                        />
                        {/* White dot at endpoint */}
                        <circle cx={ep.x} cy={ep.y} r="3"
                            fill="#ffffff" opacity="0"
                            filter={`url(#sk3-${animKey})`}
                            style={{ animation: `endSkyGlow_${animKey} 0.15s ease-in-out 3s infinite alternate` }}
                        />
                    </>
                )}

                {/* ── Colour-coded data dots — pop in when line reaches each ──── */}
                {pts.map((pt, i) => {
                    const delay = `${(i / Math.max(percentages.length - 1, 1)) * 3}s`;
                    return (
                        <circle key={i} cx={pt.x} cy={pt.y} r="5"
                            fill={dotColor(percentages[i])} stroke="#fff" strokeWidth="1.5"
                            style={animKey > 0
                                ? { animation: `dotPop_${animKey} 0.35s cubic-bezier(0.34,1.56,0.64,1) ${delay} both` }
                                : { opacity: 0 }}
                        />
                    );
                })}

                {/* ── X-axis labels ────────────────────────────────────────────── */}
                {subjects.map((s, i) => (
                    <text key={i} x={pts[i].x} y={H - PAD.bottom + 14}
                        fill={axisClr} fontSize="9" textAnchor="end" fontFamily="Inter,sans-serif"
                        transform={`rotate(-35,${pts[i].x},${H - PAD.bottom + 14})`}
                    >{s}</text>
                ))}
            </svg>
        </div>
    );
}


/* ── Attendance badge ─────────────────────────────────────────────────────── */
function AttBadge({ pct }) {
    const color =
        pct >= 75 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : pct >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
    return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${color}`}>{pct}%</span>;
}

/* ── Circular progress (SVG) ──────────────────────────────────────────────── */
function CircleProgress({ value, size = 130 }) {
    const r = 46;
    const circ = 2 * Math.PI * r;
    const offset = circ - (Math.min(value, 100) / 100) * circ;
    const color = value >= 75 ? '#10b981' : value >= 60 ? '#f59e0b' : '#f43f5e';
    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8"
                    className="dark:stroke-slate-700" />
                <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
                    strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold" style={{ color }}>{value}%</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">Overall</span>
            </div>
        </div>
    );
}

/* ── Attendance Predictor Component ───────────────────────────────────────── */
function AttendancePredictor({ subjects, history }) {
    const target = 90;
    const sessionsPerDay = 3;

    const crtHistory = (history || [])
        .filter(h => new Date(h.uploadDate) >= new Date('2026-05-22'));

    let totalAttended = 0;
    let totalConducted = 0;

    if (crtHistory.length > 0) {
        totalAttended = crtHistory.reduce((sum, h) => {
            return sum + (h.subjects || []).reduce((sSum, s) => sSum + (s.attended || 0), 0);
        }, 0);
        totalConducted = crtHistory.reduce((sum, h) => {
            return sum + (h.subjects || []).reduce((sSum, s) => sSum + (s.total || 0), 0);
        }, 0);
    } else {
        totalAttended = subjects.reduce((sum, s) => sum + (s.attended || 0), 0);
        totalConducted = subjects.reduce((sum, s) => sum + (s.total || 0), 0);
    }

    const currentPct = totalConducted > 0 ? (totalAttended / totalConducted) * 100 : 0;

    const t = target / 100;
    const additionalSessionsNeeded = currentPct < target && totalConducted > 0
        ? Math.ceil((t * totalConducted - totalAttended) / (1 - t))
        : 0;
    const daysNeeded = Math.ceil(additionalSessionsNeeded / sessionsPerDay);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-xl flex items-center justify-center shrink-0">
                        <Sparkles size={20} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-800 dark:text-white">Attendance Predictor</h2>
                        <p className="text-xs text-slate-450 dark:text-slate-500">Calculate days and sessions required to reach your target percentage</p>
                    </div>
                </div>
            </div>

            {/* Prediction result card */}
            {totalConducted > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60 text-center flex flex-col justify-center">
                        <span className="text-xs font-semibold text-slate-400 block mb-1">Current Situation</span>
                        <span className="text-2xl font-black text-slate-700 dark:text-slate-200">{currentPct.toFixed(1)}%</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">({totalAttended}/{totalConducted} sessions attended)</span>
                    </div>

                    <div className="md:col-span-2 p-5 bg-gradient-to-br from-indigo-50/40 to-blue-50/40 dark:from-indigo-950/10 dark:to-blue-950/10 rounded-xl border border-indigo-100/50 dark:border-indigo-900/20 flex flex-col justify-center">
                        {additionalSessionsNeeded === 0 ? (
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-emerald-500 block flex items-center gap-1">
                                    <CheckCircle size={12} /> Target Achieved
                                </span>
                                <p className="text-sm text-slate-650 dark:text-slate-350 leading-relaxed">
                                    Your current attendance is already at or above the target of <strong>{target}%</strong>. Keep attending sessions to maintain this status.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <span className="text-xs font-bold text-indigo-500 block">Required Attendance to Reach {target}%</span>
                                <p className="text-sm text-slate-650 dark:text-slate-350 leading-relaxed">
                                    To achieve your target of <strong>{target}%</strong> from your current situation:
                                </p>
                                <div className="grid grid-cols-2 gap-3 mt-1 text-center">
                                    <div className="bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-indigo-100/30 dark:border-indigo-900/30">
                                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Sessions to Attend</span>
                                        <span className="text-lg font-black text-indigo-650 dark:text-indigo-400">{additionalSessionsNeeded} sessions</span>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-indigo-100/30 dark:border-indigo-900/30 flex flex-col justify-center items-center">
                                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Days of Full Attendance</span>
                                        <span className="text-lg font-black text-indigo-650 dark:text-indigo-400">{daysNeeded} days</span>
                                        <span className="text-[9px] text-slate-400 dark:text-slate-550 block mt-0.5">(1 day = 3 sessions)</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <p className="text-sm text-slate-400 text-center py-2">No active classes conducted to run predictions.</p>
            )}

            {/* Subject-wise breakdown grid */}
            {subjects.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        <span>Subject-wise Attendance Requirements</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 normal-case font-medium">(1 day = 3 sessions)</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {subjects.map((sub, i) => {
                            let subAttended = sub.attended || 0;
                            let subTotal = sub.total || 0;

                            if (crtHistory.length > 0) {
                                let correctedAttended = 0;
                                let correctedTotal = 0;
                                crtHistory.forEach(h => {
                                    const daySub = h.subjects?.find(s => s.subject === sub.subject);
                                    if (daySub) {
                                        if (daySub.total > 0) {
                                            correctedAttended += daySub.attended;
                                            correctedTotal += daySub.total;
                                        } else {
                                            correctedTotal += 3;
                                        }
                                    }
                                });
                                if (correctedTotal > 0) {
                                    subAttended = correctedAttended;
                                    subTotal = correctedTotal;
                                }
                            }

                            const subPctReal = subTotal > 0 ? (subAttended / subTotal) * 100 : 0;
                            const additionalSubNeeded = subPctReal < target && subTotal > 0
                                ? Math.ceil((t * subTotal - subAttended) / (1 - t))
                                : 0;
                            const subDaysNeeded = Math.ceil(additionalSubNeeded / sessionsPerDay);

                            return (
                                <div key={i} className="p-3 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-150 dark:border-slate-800/40 rounded-xl flex flex-col justify-between gap-2">
                                    <div>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{sub.subject}</p>
                                        <div className="flex justify-between items-baseline mt-1">
                                            <span className="text-xs font-mono text-slate-400">{subAttended}/{subTotal} attended</span>
                                            <span className={`text-sm font-black ${subPctReal >= target ? 'text-emerald-500' : subPctReal >= 60 ? 'text-amber-500' : 'text-rose-500'}`}>
                                                {subPctReal.toFixed(0)}%
                                              </span>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-100 dark:border-slate-800/60 pt-2 text-[11px] font-medium">
                                        {subTotal === 0 ? (
                                            <span className="text-slate-455">No classes yet</span>
                                        ) : additionalSubNeeded === 0 ? (
                                            <span className="text-emerald-500 font-semibold flex items-center gap-0.5">
                                                <CheckCircle size={10} /> Target met
                                            </span>
                                        ) : (
                                            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                                                Need {additionalSubNeeded} sessions ({subDaysNeeded} days)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Main Component ───────────────────────────────────────────────────────── */
export default function StudentDashboard() {
    const [profile, setProfile] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [history, setHistory] = useState([]);
    const [assessments, setAssessments] = useState([]);
    const [tab, setTab] = useState('day');
    const [historyView, setHistoryView] = useState('all'); // 'all' | 'week' | 'month' | 'module'
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [loading, setLoading] = useState(true);
    const { logout } = useAuth();
    const { dark, toggle } = useTheme();
    const navigate = useNavigate();

    useEffect(() => {
        Promise.all([getStudentProfile(), getStudentSubjects(), getStudentHistory(), getStudentAssessments()])
            .then(([{ data: p }, { data: s }, { data: h }, { data: a }]) => {
                setProfile(p);
                setSubjects(s);
                setHistory(h);
                setAssessments(a);

                // Initialize default date range (latest 5 records)
                const crtRecords = h
                    .filter(item => new Date(item.uploadDate) >= new Date('2026-05-22'))
                    .sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate));
                if (crtRecords.length > 0) {
                    const latest = crtRecords[crtRecords.length - 1].uploadDate;
                    const fifthFromLast = crtRecords[Math.max(0, crtRecords.length - 5)].uploadDate;
                    setStartDate(fifthFromLast);
                    setEndDate(latest);
                }
            })
            .catch(() => toast.error('Failed to load data'))
            .finally(() => setLoading(false));
    }, []);

    const handleLogout = () => { logout(); navigate('/student/login'); };

    if (loading) {
        const Skel = ({ cls }) => (
            <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-xl ${cls}`} />
        );
        return (
            <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
                {/* Skeleton Navbar */}
                <div className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center gap-4">
                    <Skel cls="w-16 h-16 rounded-2xl" />
                    <Skel cls="h-4 w-40" />
                    <div className="flex-1" />
                    <Skel cls="h-8 w-8 rounded-lg" />
                    <Skel cls="h-4 w-16" />
                </div>
                <main className="max-w-6xl mx-auto p-6 space-y-5">
                    {/* Profile + circle */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                            <div className="flex gap-5">
                                <Skel cls="w-16 h-16 rounded-2xl shrink-0" />
                                <div className="flex-1 space-y-3">
                                    <Skel cls="h-5 w-48" />
                                    <Skel cls="h-4 w-32" />
                                    <Skel cls="h-6 w-24 rounded-full" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-3">
                            <Skel cls="w-32 h-32 rounded-full" />
                            <Skel cls="h-4 w-28" />
                        </div>
                    </div>
                    {/* Tabs */}
                    <Skel cls="h-12 w-full rounded-2xl" />
                    {/* Chart area */}
                    <div className="grid grid-cols-3 gap-3">
                        <Skel cls="h-24 rounded-2xl" />
                        <Skel cls="h-24 rounded-2xl" />
                        <Skel cls="h-24 rounded-2xl" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Skel cls="h-64 rounded-2xl" />
                        <Skel cls="h-64 rounded-2xl" />
                    </div>
                </main>
            </div>
        );
    }

    const isDark = dark;
    const axisColor = isDark ? '#64748b' : '#94a3b8';
    const gridColor = isDark ? '#1e293b' : '#f1f5f9';

    const safeCount = subjects.filter(s => s.percentage >= 75).length;
    const lowCount = subjects.filter(s => s.percentage < 75).length;
    const subjectNames = subjects.map(s => s.subject || s.name || '—');
    const subjectPct = subjects.map(s => s.percentage || 0);

    /* ── Chart configs ──────────────────────────────────────────────────────── */

    // 1. Grouped subject bar chart (colour-coded by threshold)
    const barOptions = {
        chart: { type: 'bar', background: 'transparent', toolbar: { show: false } },
        plotOptions: { bar: { borderRadius: 6, columnWidth: '60%', distributed: true } },
        colors: subjectPct.map(p => p >= 75 ? '#10b981' : p >= 60 ? '#f59e0b' : '#f43f5e'),
        dataLabels: {
            enabled: true,
            formatter: v => v + '%',
            style: { fontSize: '10px', colors: ['#fff'] },
            dropShadow: { enabled: false },
        },
        xaxis: {
            categories: subjectNames,
            labels: { style: { colors: axisColor, fontSize: '10px' }, rotate: -35, maxHeight: 80 },
        },
        yaxis: { max: 100, labels: { style: { colors: axisColor }, formatter: v => v + '%' } },
        grid: { show: false },
        legend: { show: false },
        tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: v => v + '%' } },
        annotations: {
            yaxis: [{
                y: 75,
                borderColor: '#ef4444',
                strokeDashArray: 4,
                label: { text: '75% Min', style: { color: '#fff', background: '#ef4444', fontSize: '10px' } },
            }],
        },
    };

    // 2. Donut — Safe vs Low attendance subjects
    const donutOptions = {
        chart: { type: 'donut', background: 'transparent', toolbar: { show: false } },
        labels: ['Safe (≥75%)', 'Below 75%'],
        colors: ['#10b981', '#f43f5e'],
        legend: { position: 'bottom', labels: { colors: isDark ? '#e2e8f0' : '#1e293b' } },
        plotOptions: {
            pie: {
                donut: {
                    size: '68%',
                    labels: { show: true, total: { show: true, label: 'Subjects', color: axisColor } },
                },
            },
        },
        dataLabels: { dropShadow: { enabled: false } },
        tooltip: { theme: isDark ? 'dark' : 'light' },
    };

    // 3. Radial bar — per-subject (top 6 by percentage)
    const topSubjects = [...subjects].sort((a, b) => b.percentage - a.percentage).slice(0, 6);
    const radialOptions = {
        chart: { type: 'radialBar', background: 'transparent', toolbar: { show: false } },
        plotOptions: {
            radialBar: {
                offsetY: 0,
                startAngle: -120,
                endAngle: 120,
                hollow: { size: '30%' },
                track: { background: isDark ? '#1e293b' : '#f1f5f9', strokeWidth: '97%' },
                dataLabels: {
                    name: { fontSize: '11px', color: axisColor },
                    value: { fontSize: '13px', fontWeight: 700, formatter: v => v + '%' },
                },
            },
        },
        colors: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'],
        labels: topSubjects.map(s => s.subject || s.name || '—'),
        legend: { show: true, position: 'bottom', labels: { colors: axisColor } },
        tooltip: { theme: isDark ? 'dark' : 'light' },
    };

    // Assessments Chart Configs
    const assessmentLabels = assessments.map(a => `${a.subject} - ${a.assessmentName}`);
    const assessmentScores = assessments.map(a => Math.round(a.marks < 0 ? 0 : a.percentage || 0));

    const assessmentChartOpts = {
        chart: { type: 'area', height: 250, background: 'transparent', toolbar: { show: false }, zoom: { enabled: false }, animations: { speed: 800 } },
        stroke: { curve: 'smooth', width: 3 },
        fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.02 } },
        colors: ['#a855f7'],
        markers: { size: 6, strokeWidth: 2, strokeColors: '#fff', fillColors: ['#a855f7'] },
        xaxis: { categories: assessmentLabels.length ? assessmentLabels : ['No data'], labels: { style: { colors: axisColor, fontSize: '11px' }, rotate: -35 } },
        yaxis: { min: 0, max: 100, labels: { style: { colors: axisColor }, formatter: v => v + '%' } },
        grid: { borderColor: gridColor },
        dataLabels: { enabled: assessmentLabels.length <= 12, formatter: v => v + '%', style: { fontSize: '11px' }, background: { enabled: true, padding: 4, borderRadius: 4 } },
        tooltip: { theme: dark ? 'dark' : 'light', y: { formatter: v => v + '%' } },
        responsive: [
            {
                breakpoint: 640,
                options: {
                    chart: { height: 200 },
                    dataLabels: { enabled: false },
                    markers: { size: 4 },
                    xaxis: { labels: { rotate: -45, style: { fontSize: '9px' } } }
                }
            }
        ]
    };

    // Category overall performance calculations
    const getCategory = (subjectStr) => {
        const s = String(subjectStr || '').toLowerCase().trim();
        if (s.includes('non') || s.includes('non-technical') || s.includes('non technical')) {
            return 'Non-Technical';
        }
        if (s.includes('grand') || s.includes('gt') || s.includes('grand test')) {
            return 'Grand Test';
        }
        return 'Technical';
    };

    const categoryTotals = {
        'Technical': { sum: 0, count: 0 },
        'Non-Technical': { sum: 0, count: 0 },
        'Grand Test': { sum: 0, count: 0 }
    };

    assessments.forEach(a => {
        if (a.marks >= 0) {
            const cat = getCategory(a.subject);
            categoryTotals[cat].sum += (a.percentage || 0);
            categoryTotals[cat].count += 1;
        }
    });

    const categoriesData = [
        { name: 'Technical', avg: categoryTotals['Technical'].count > 0 ? Math.round(categoryTotals['Technical'].sum / categoryTotals['Technical'].count) : 0, count: categoryTotals['Technical'].count },
        { name: 'Non-Technical', avg: categoryTotals['Non-Technical'].count > 0 ? Math.round(categoryTotals['Non-Technical'].sum / categoryTotals['Non-Technical'].count) : 0, count: categoryTotals['Non-Technical'].count },
        { name: 'Grand Test', avg: categoryTotals['Grand Test'].count > 0 ? Math.round(categoryTotals['Grand Test'].sum / categoryTotals['Grand Test'].count) : 0, count: categoryTotals['Grand Test'].count }
    ];

    const categoryChartSeries = [{
        name: 'Average Score',
        data: categoriesData.map(c => c.avg)
    }];

    const categoryChartOpts = {
        chart: { type: 'bar', height: 250, background: 'transparent', toolbar: { show: false } },
        plotOptions: {
            bar: {
                borderRadius: 5,
                columnWidth: '45%',
                distributed: true,
            }
        },
        colors: ['#3b82f6', '#10b981', '#f59e0b'],
        dataLabels: {
            enabled: true,
            formatter: (val) => `${val}%`,
            style: { fontSize: '11px', colors: ['#fff'] }
        },
        xaxis: {
            categories: categoriesData.map(c => c.name),
            labels: { style: { colors: axisColor, fontSize: '11px' } }
        },
        yaxis: {
            min: 0,
            max: 100,
            labels: { style: { colors: axisColor }, formatter: v => v + '%' }
        },
        grid: { borderColor: gridColor },
        legend: { show: false },
        tooltip: {
            theme: dark ? 'dark' : 'light',
            y: {
                formatter: (val, opts) => {
                    const catData = categoriesData[opts.dataPointIndex];
                    return `${val}% (${catData.count} test${catData.count !== 1 ? 's' : ''})`;
                }
            }
        }
    };

    const is4thYear = !!(profile?.rollNo && (profile.rollNo.startsWith('22') || profile.rollNo.startsWith('23')));

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
            {/* Top Navbar */}
            <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm px-6 py-3 flex items-center gap-4">
                <div className="w-16 h-16 flex items-center justify-center shrink-0 overflow-hidden">
                    <img src={cseLogo} alt="CSE Logo" className="max-w-full max-h-full object-contain" />
                </div>
                <span className="font-semibold text-slate-800 dark:text-white text-sm flex-1">CSE Attendance Portal</span>
                <button onClick={toggle}
                    className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-all">
                    {dark ? <Sun size={15} /> : <Moon size={15} />}
                </button>
                <button onClick={handleLogout}
                    className="flex items-center gap-1.5 text-sm text-rose-500 hover:text-rose-400 font-medium transition-colors">
                    <LogOut size={15} /> Logout
                </button>
            </header>

            <main className="max-w-6xl mx-auto p-6 space-y-5">



                {/* ── Profile + Circular Progress ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Profile card */}
                    <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 w-full">
                            <div className="flex items-start gap-5">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shrink-0">
                                    {profile?.name?.charAt(0)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h1 className="text-xl font-bold text-slate-800 dark:text-white break-words leading-tight">{profile?.name}</h1>
                                    <p className="text-blue-500 font-mono text-sm mt-0.5">{profile?.rollNo}</p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full font-medium">
                                            <BookOpen size={11} /> {profile?.section}
                                        </span>
                                        <AttBadge pct={profile?.totalPercentage || 0} />
                                    </div>
                                </div>
                            </div>

                            {/* Highlighted Batch container on the right using the empty space */}
                            {subjects.length > 0 && (
                                <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
                                    {subjects.map((sub, i) => (
                                        <div key={i} className="flex flex-col items-center sm:items-end gap-1 px-4 py-3 bg-gradient-to-br from-blue-50/70 to-indigo-50/70 dark:from-blue-950/20 dark:to-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-2xl shadow-sm transition-all hover:scale-[1.02]">
                                            <span className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">Assigned Batch</span>
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                                <LayoutGrid size={14} className="text-indigo-500 dark:text-indigo-400" />
                                                {sub.subject}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Circular progress */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center gap-3">
                        <Award size={18} className="text-slate-400" />
                        <CircleProgress value={profile?.totalPercentage || 0} size={130} />
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Overall Attendance</p>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${(profile?.totalPercentage || 0) >= 75
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                            }`}>
                            {(profile?.totalPercentage || 0) >= 75 ? '✓ Regular' : '⚠ Short'}
                        </span>
                    </div>
                </div>

                {/* ── Tabs ── */}
                <div className="grid grid-cols-12 sm:flex gap-1.5 sm:gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 w-full sm:w-fit">
                    {[
                        ['day', 'Day Wise', CalendarDays, 'col-span-6'],
                        ['history', 'History', History, 'col-span-6'],
                        ['charts', 'Charts & Analysis', TrendingUp, 'col-span-6'],
                        ['table', 'Subject Table', BookOpen, 'col-span-6'],
                        ['assessment', 'Assessments', Award, 'col-span-6'],
                        is4thYear && ['predictor', 'Attendance Predictor', Sparkles, 'col-span-12'],
                    ].filter(Boolean).map(([key, label, Icon, gridClasses]) => (
                        <button key={key} onClick={() => setTab(key)}
                            className={`sm:col-span-auto sm:col-start-auto sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${gridClasses}
                ${tab === key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600'}`}>
                            <Icon size={14} /> {label}
                        </button>
                    ))}
                </div>

                {/* ── Charts Tab ── */}
                {tab === 'charts' && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-slate-200 dark:border-slate-800 shadow-sm text-center flex flex-col items-center justify-center gap-4">
                        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-full flex items-center justify-center">
                            <TrendingUp size={28} />
                        </div>
                        <div className="space-y-2 max-w-md">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Subject-wise Analytics & Charts</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Present classes are over and CRT classes have started.</p>
                            <div className="inline-block mt-3 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold text-sm border border-indigo-100 dark:border-indigo-800">
                                Available when academic year is started
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Subject Table Tab ── */}
                {tab === 'table' && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-slate-200 dark:border-slate-800 shadow-sm text-center flex flex-col items-center justify-center gap-4">
                        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-full flex items-center justify-center">
                            <BookOpen size={28} />
                        </div>
                        <div className="space-y-2 max-w-md">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Subject-wise Attendance Table</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Present classes are over and CRT classes have started.</p>
                            <div className="inline-block mt-3 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold text-sm border border-indigo-100 dark:border-indigo-800">
                                Available when academic year is started
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Attendance Predictor Tab ── */}
                {tab === 'predictor' && is4thYear && (
                    <AttendancePredictor subjects={subjects} history={history} />
                )}

                {/* ── History Tab (all records) ── */}
                {tab === 'history' && (() => {
                    const sorted = [...history].sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
                    return (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            {sorted.length === 0 ? (
                                <div className="py-12 text-center text-slate-400">No attendance history found.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Upload Date</th>
                                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Section</th>
                                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Slots Present</th>
                                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Slots Absent</th>
                                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Overall %</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {sorted.map(h => {
                                                const slotsPresent = (h.subjects || []).reduce((sum, s) => sum + (s.attended || 0), 0);
                                                const slotsTotal = (h.subjects || []).reduce((sum, s) => sum + (s.total || 0), 0);
                                                const slotsAbsent = Math.max(0, slotsTotal - slotsPresent);
                                                const calculatedPct = slotsTotal > 0 ? Math.round((slotsPresent / slotsTotal) * 100) : 0;
                                                return (
                                                    <tr key={h._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">
                                                            {new Date(h.uploadDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{h.section}</td>
                                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-medium">
                                                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{slotsPresent}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-medium">
                                                            <span className={slotsAbsent > 0 ? "text-rose-600 dark:text-rose-400 font-semibold" : "text-slate-455"}>{slotsAbsent}</span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <AttBadge pct={calculatedPct} />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* ── Day Wise Tab (CRT trends) ── */}
                {tab === 'day' && (() => {
                    const crtHistory = history
                        .filter(h => new Date(h.uploadDate) >= new Date('2026-05-22'))
                        .sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate));
                    const ax = axisColor;
                    const gr = gridColor;

                    // Build day-wise data from CRT history
                    const dayLabels = crtHistory.map(h => {
                        const d = new Date(h.uploadDate);
                        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' });
                    });

                    // Daily raw scores (100 for full day, 50 for half day, 0 for absent)
                    const dailyValues = crtHistory.map(h => Math.round(parseFloat(h.totalPercentage) || 0));

                    // Calculate running cumulative averages for the area trend chart using weighted slot totals
                    let runningAttended = 0;
                    let runningTotal = 0;
                    const runningAvgs = crtHistory.map(h => {
                        const slotsPresent = (h.subjects || []).reduce((sum, s) => sum + (s.attended || 0), 0);
                        const slotsTotal = (h.subjects || []).reduce((sum, s) => sum + (s.total || 0), 0);
                        runningAttended += slotsPresent;
                        runningTotal += slotsTotal;
                        return runningTotal > 0 ? Math.round((runningAttended / runningTotal) * 100) : 0;
                    });

                    // Daily change in cumulative percentage
                    const dayChanges = runningAvgs.map((v, i) => {
                        if (i === 0) return 0;
                        return v - runningAvgs[i - 1];
                    });

                    const startFilter = startDate || '2026-05-22';
                    const endFilter = endDate || '9999-12-31';

                    const fullHistory = crtHistory.map((h, i) => {
                        const d = new Date(h.uploadDate);
                        const label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' });
                        const avg = runningAvgs[i];
                        const change = dayChanges[i];
                        const val = dailyValues[i];
                        return {
                            dateStr: h.uploadDate,
                            label,
                            avg,
                            change,
                            val
                        };
                    });

                    const filteredHistory = fullHistory.filter(
                        item => item.dateStr >= startFilter && item.dateStr <= endFilter
                    );

                    const slicedLabels = filteredHistory.map(item => item.label);
                    const slicedAvgs = filteredHistory.map(item => item.avg);
                    const slicedChanges = filteredHistory.map(item => item.change);

                    let totalAttendedCRT = crtHistory.reduce((sum, h) => sum + (h.subjects || []).reduce((sSum, s) => sSum + (s.attended || 0), 0), 0);
                    let totalConductedCRT = crtHistory.reduce((sum, h) => sum + (h.subjects || []).reduce((sSum, s) => sSum + (s.total || 0), 0), 0);
                    const avg = totalConductedCRT > 0 ? Math.round((totalAttendedCRT / totalConductedCRT) * 100) : 0;
                    const totalDays = fullHistory.length;
                    const daysPresent = fullHistory.filter(item => item.val > 0).length;
                    const daysAbsent = fullHistory.filter(item => item.val === 0).length;

                    // Cumulative area chart options
                    // Compute y-axis min: start from the student's first/minimum value (rounded down to nearest 5, with small buffer)
                    const yMinRaw = slicedAvgs.length > 0 ? Math.min(...slicedAvgs) : 0;
                    const yAxisMin = Math.max(0, Math.floor((yMinRaw - 5) / 5) * 5);

                    const lineOpts = {
                        chart: { type: 'area', height: 250, background: 'transparent', toolbar: { show: false }, zoom: { enabled: false }, animations: { speed: 800 } },
                        stroke: { curve: 'smooth', width: 3 },
                        fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.02 } },
                        colors: ['#6366f1'],
                        markers: { size: 6, strokeWidth: 2, strokeColors: '#fff', fillColors: ['#6366f1'] },
                        xaxis: { categories: slicedLabels.length ? slicedLabels : ['No data'], labels: { style: { colors: ax, fontSize: '11px' }, rotate: -35 } },
                        yaxis: { min: yAxisMin, max: 100, labels: { style: { colors: ax }, formatter: v => v + '%' } },
                        annotations: { yaxis: [{ y: 75, borderColor: '#f43f5e', strokeDashArray: 4, label: { text: '75% Min', style: { color: '#fff', background: '#f43f5e', fontSize: '10px' } } }] },
                        grid: { borderColor: gr },
                        dataLabels: { enabled: slicedLabels.length <= 12, formatter: v => v + '%', style: { fontSize: '11px' }, background: { enabled: true, padding: 4, borderRadius: 4 } },
                        tooltip: { theme: dark ? 'dark' : 'light', y: { formatter: v => v + '%' } },
                        responsive: [
                            {
                                breakpoint: 640,
                                options: {
                                    chart: { height: 200 },
                                    dataLabels: { enabled: false },
                                    markers: { size: 4 },
                                    xaxis: { labels: { rotate: -45, style: { fontSize: '9px' } } }
                                }
                            }
                        ]
                    };

                    // Daily change bar chart options
                    const changeOpts = {
                        chart: { type: 'bar', height: 250, background: 'transparent', toolbar: { show: false }, zoom: { enabled: false } },
                        plotOptions: {
                            bar: {
                                borderRadius: 4, columnWidth: '60%',
                                colors: {
                                    ranges: [
                                        { from: -100, to: -0.01, color: '#f43f5e' },
                                        { from: 0, to: 0, color: '#94a3b8' },
                                        { from: 0.01, to: 100, color: '#10b981' },
                                    ]
                                }
                            }
                        },
                        colors: ['#10b981'],
                        dataLabels: {
                            enabled: true,
                            formatter: v => (v > 0 ? '+' : '') + v + '%',
                            style: { fontSize: '10px' }
                        },
                        xaxis: { categories: slicedLabels.length ? slicedLabels : ['No data'], labels: { style: { colors: ax, fontSize: '11px' }, rotate: -35 } },
                        yaxis: { labels: { style: { colors: ax }, formatter: v => v + '%' } },
                        grid: { borderColor: gr },
                        tooltip: { theme: dark ? 'dark' : 'light', y: { formatter: v => (v > 0 ? '+' : '') + v + '%' } },
                        responsive: [
                            {
                                breakpoint: 640,
                                options: {
                                    chart: { height: 200 },
                                    dataLabels: { enabled: false },
                                    xaxis: { labels: { rotate: -45, style: { fontSize: '9px' } } }
                                }
                            }
                        ]
                    };

                    if (crtHistory.length === 0) {
                        return (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-slate-200 dark:border-slate-800 shadow-sm text-center flex flex-col items-center justify-center gap-4">
                                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-full flex items-center justify-center">
                                    <CalendarDays size={28} />
                                </div>
                                <div className="space-y-2 max-w-md">
                                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">CRT Day-wise Attendance</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">No CRT attendance data found from 22-May-2026 onwards.</p>
                                    <div className="inline-block mt-3 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold text-sm border border-indigo-100 dark:border-indigo-800">
                                        Data will appear after admin uploads attendance
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div className="space-y-4">
                            {/* ── CRT info banner ── */}
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-3 flex items-center gap-3">
                                <CalendarDays size={15} className="text-indigo-500 shrink-0" />
                                <p className="text-xs text-indigo-700 dark:text-indigo-300">
                                    <span className="font-semibold">CRT Attendance Period:</span> 22-May-2026 to present
                                </p>
                            </div>

                            {/* ── Date range filter (shared by both charts) ── */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                                    <span className="text-slate-700 dark:text-slate-300 font-semibold text-sm mr-1">Date Range</span>
                                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <span>From:</span>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={e => setStartDate(e.target.value)}
                                            className="bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none border-none p-0 cursor-pointer w-[110px]"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <span>To:</span>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={e => setEndDate(e.target.value)}
                                            className="bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none border-none p-0 cursor-pointer w-[110px]"
                                        />
                                    </div>
                                    {slicedLabels.length > 0 && (
                                        <span className="ml-auto text-xs text-indigo-500 dark:text-indigo-400 font-medium">
                                            {slicedLabels.length} day{slicedLabels.length !== 1 ? 's' : ''} shown
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* ── Stat cards ── */}
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { l: 'Total Days', v: totalDays, c: 'indigo' },
                                    { l: 'Days Attended', v: daysPresent, c: 'emerald' },
                                    { l: 'Days Absent', v: daysAbsent, c: 'rose' },
                                ].map(({ l, v, c }) => (
                                    <div key={l} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
                                        <p className="text-xs text-slate-400 mb-1">{l}</p>
                                        <p className={`text-2xl font-bold text-${c}-500`}>{v}</p>
                                    </div>
                                ))}
                            </div>

                            {/* ── Cumulative & Daily Change Graphs Grid ── */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* ── Cumulative attendance trend ── */}
                                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Cumulative CRT Attendance Trend</h2>
                                    <ReactApexChart options={lineOpts} series={[{ name: 'Attendance %', data: slicedAvgs }]} type="area" />
                                </div>
                                {/* ── Daily Cumulative Change ── */}
                                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Daily Cumulative Change</h2>
                                    <ReactApexChart options={changeOpts} series={[{ name: 'Change', data: slicedChanges }]} type="bar" />
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* ── Assessments Tab ── */}
                {tab === 'assessment' && (() => {
                    return (
                        <div className="space-y-4">
                            {/* Performance charts */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <h2 className="text-sm font-semibold text-slate-700 dark:text-white mb-4">Assessment Score Trends</h2>
                                    {assessments.length === 0 ? (
                                        <p className="text-sm text-slate-400 text-center py-6">No assessment history found.</p>
                                    ) : (
                                        <ReactApexChart options={assessmentChartOpts} series={[{ name: 'Score %', data: assessmentScores }]} type="area" />
                                    )}
                                </div>
                                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <h2 className="text-sm font-semibold text-slate-700 dark:text-white mb-4 flex items-center gap-1.5">
                                        <BarChart3 size={15} className="text-blue-500" /> Performance by Category
                                    </h2>
                                    {assessments.length === 0 ? (
                                        <p className="text-sm text-slate-400 text-center py-6">No assessment data available.</p>
                                    ) : (
                                        <ReactApexChart options={categoryChartOpts} series={categoryChartSeries} type="bar" />
                                    )}
                                </div>
                            </div>

                            {/* Detailed scores table */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                {assessments.length === 0 ? (
                                    <div className="py-12 text-center text-slate-400">No assessments recorded.</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-left">
                                                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Assessment Name</th>
                                                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                                                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Marks</th>
                                                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Percentage</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                                {assessments.map((a, i) => {
                                                    const isAbsent = a.marks < 0;
                                                    return (
                                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                                            <td className="px-4 py-3 font-medium text-xs sm:text-sm">{a.subject}</td>
                                                            <td className="px-4 py-3 text-xs sm:text-sm">{a.assessmentName}</td>
                                                            <td className="px-4 py-3 text-xs sm:text-sm font-semibold">
                                                                {isAbsent ? (
                                                                    <span className="text-rose-600 dark:text-rose-400 font-bold">Absent</span>
                                                                ) : (
                                                                    `${a.marks} / ${a.maxMarks}`
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                {isAbsent ? (
                                                                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">Absent</span>
                                                                ) : (
                                                                    <AttBadge pct={a.percentage} />
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}

            </main>
        </div>
    );
}
