import { useState, useEffect, type ChangeEvent } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Phone, Calendar, Users, TrendingUp, ArrowUpRight, ArrowDownRight, MoreHorizontal, User } from 'lucide-react';
import api from '../services/api';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';

interface Agent {
    id: string;
    name: string;
    role: string;
}

const StatCard = ({ title, value, icon: Icon, color, trend }: { title: string, value: string | number, icon: any, color: string, trend?: number }) => {
    const colorClasses: any = {
        red: 'text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]',
        white: 'text-gray-900 dark:text-white shadow-[0_0_10px_rgba(0,0,0,0.1)] dark:shadow-[0_0_10px_rgba(255,255,255,0.2)]',
        gray: 'text-gray-500 dark:text-gray-400 shadow-[0_0_10px_rgba(156,163,175,0.2)]',
    };

    return (
        <div className="bg-white dark:bg-[#0E0E11] border border-gray-200 dark:border-white/10 rounded-xl p-6 relative overflow-hidden group shadow-sm dark:shadow-none transition-colors duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity">
                <Icon size={64} className="text-gray-900 dark:text-white" />
            </div>
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`p-3 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 ${colorClasses[color] || 'text-red-500'}`}>
                    <Icon size={24} />
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded border ${trend > 0 ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'}`}>
                        {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <div className="relative z-10">
                <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">{title}</h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white font-mono tracking-tight dark:drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">{value}</p>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const { theme } = useTheme();
    const { user } = useAuth();

    if (user?.role === 'COMMERCIAL') {
        return <Navigate to="/calendar" replace />;
    }

    const [stats, setStats] = useState({
        callsToday: 0,
        appointmentsTotal: 0,
        appointmentsToday: 0,
        newContactsToday: 0,
        conversionRate: 0,
        conversionDetails: {
            weeklyAppointments: 0,
            weeklySigned: 0,
            weekStart: '',
            weekEnd: ''
        },
        periodSignedAppointments: 0,
        graphData: []
    });
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('today');
    const [dateRange, setDateRange] = useState({
        start: startOfDay(new Date()),
        end: endOfDay(new Date())
    });
    const [agents, setAgents] = useState<Agent[]>([]);
    const [selectedAgentId, setSelectedAgentId] = useState<string>('');

    // Fetch agents list on mount
    useEffect(() => {
        const fetchAgents = async () => {
            try {
                const res = await api.get('/users');
                setAgents(res.data.filter((u: Agent) => u.role === 'AGENT' || u.role === 'SUPERVISEUR'));
            } catch (error) {
                console.error('Error fetching agents:', error);
            }
        };
        if (user?.role === 'ADMIN' || user?.role === 'SUPERVISEUR') {
            fetchAgents();
        }
    }, [user?.role]);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const params: any = {
                    startDate: dateRange.start.toISOString(),
                    endDate: dateRange.end.toISOString()
                };
                if (selectedAgentId) {
                    params.agentId = selectedAgentId;
                }
                const response = await api.get('/stats', { params });
                setStats(response.data);
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [dateRange, selectedAgentId]);

    const handlePeriodChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setPeriod(value);
        const now = new Date();

        if (value === 'today') {
            setDateRange({ start: startOfDay(now), end: endOfDay(now) });
        } else if (value === 'week') {
            setDateRange({ start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) });
        } else if (value === 'month') {
            setDateRange({ start: startOfMonth(now), end: endOfMonth(now) });
        }
        // 'custom' does not update dateRange immediately, waits for inputs
    };

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight uppercase">Tableau de Bord <span className="text-red-600">.</span></h1>
                    <p className="text-gray-500 text-sm font-mono mt-1">ÉTAT_SYSTÈME: <span className="text-green-500 dark:text-green-400">EN LIGNE</span></p>
                </div>
                <div className="flex gap-2 items-center">
                    {/* Agent Filter - only for Admin/Superviseur */}
                    {(user?.role === 'ADMIN' || user?.role === 'SUPERVISEUR') && agents.length > 0 && (
                        <div className="flex items-center gap-2">
                            <User size={14} className="text-gray-400" />
                            <select
                                value={selectedAgentId}
                                onChange={(e) => setSelectedAgentId(e.target.value)}
                                className="bg-white dark:bg-[#0E0E11] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-mono rounded-lg focus:ring-red-500/50 focus:border-red-500/50 block p-2.5 outline-none transition-colors min-w-[150px]"
                            >
                                <option value="">Tous les agents</option>
                                {agents.map(agent => (
                                    <option key={agent.id} value={agent.id}>
                                        {agent.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {period === 'custom' && (
                        <div className="flex gap-2 mr-2">
                            <input
                                type="date"
                                className="bg-white dark:bg-[#0E0E11] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-mono rounded-lg p-2 outline-none"
                                value={format(dateRange.start, 'yyyy-MM-dd')}
                                onChange={(e) => setDateRange(prev => ({ ...prev, start: startOfDay(new Date(e.target.value)) }))}
                            />
                            <input
                                type="date"
                                className="bg-white dark:bg-[#0E0E11] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-mono rounded-lg p-2 outline-none"
                                value={format(dateRange.end, 'yyyy-MM-dd')}
                                onChange={(e) => setDateRange(prev => ({ ...prev, end: endOfDay(new Date(e.target.value)) }))}
                            />
                        </div>
                    )}
                    <select
                        value={period}
                        onChange={handlePeriodChange}
                        className="bg-white dark:bg-[#0E0E11] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-mono rounded-lg focus:ring-red-500/50 focus:border-red-500/50 block p-2.5 outline-none uppercase tracking-wide transition-colors"
                    >
                        <option value="today">Aujourd'hui</option>
                        <option value="week">Cette Semaine</option>
                        <option value="month">Ce Mois</option>
                        <option value="custom">Période personnalisée</option>
                    </select>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Appels Sortants"
                    value={stats.callsToday}
                    icon={Phone}
                    color="white"
                    trend={12}
                />
                <StatCard
                    title="RDV Confirmés"
                    value={stats.appointmentsToday}
                    icon={Calendar}
                    color="red"
                    trend={5}
                />
                <StatCard
                    title="Nouveaux Leads"
                    value={stats.newContactsToday}
                    icon={Users}
                    color="gray"
                    trend={-2}
                />
                {/* Carte Taux de Conversion avec détails signés/pris */}
                <div className="bg-white dark:bg-[#0E0E11] border border-gray-200 dark:border-white/10 rounded-xl p-6 relative overflow-hidden group shadow-sm dark:shadow-none transition-colors duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity">
                        <TrendingUp size={64} className="text-gray-900 dark:text-white" />
                    </div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-3 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                            <TrendingUp size={24} />
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-mono text-green-500">{stats.conversionDetails?.weeklySigned || 0}</span>
                            <span className="text-xs font-mono text-gray-400"> / </span>
                            <span className="text-xs font-mono text-gray-500">{stats.conversionDetails?.weeklyAppointments || 0}</span>
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Taux de Conversion</h3>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white font-mono tracking-tight dark:drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">{stats.conversionRate}%</p>
                        <p className="text-[10px] font-mono text-gray-400 mt-1">
                            RDV Signés / RDV Pris (semaine)
                        </p>
                    </div>
                </div>
            </div>

            {/* Graphiques */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-[#0E0E11] border border-gray-200 dark:border-white/10 p-6 rounded-xl shadow-sm dark:shadow-none transition-colors duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Activité Hebdomadaire</h3>
                        <button className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                            <MoreHorizontal size={20} />
                        </button>
                    </div>
                    <div className="h-80 w-full" style={{ minHeight: '320px', minWidth: 0 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                            <AreaChart data={stats.graphData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorAppels" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#888888" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#888888" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorRdv" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.1)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'Space Mono' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'Space Mono' }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                                        borderRadius: '8px',
                                        border: theme === 'dark' ? 'none' : '1px solid #e5e7eb',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                    }}
                                    itemStyle={{
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        fontFamily: 'Space Mono',
                                        color: theme === 'dark' ? '#fff' : '#111827'
                                    }}
                                    labelStyle={{
                                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                                        marginBottom: '5px'
                                    }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontFamily: 'Space Mono', fontSize: '12px' }} />
                                <Area type="monotone" dataKey="appels" stroke="#888888" strokeWidth={2} fillOpacity={1} fill="url(#colorAppels)" name="Appels" />
                                <Area type="monotone" dataKey="rdv" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorRdv)" name="Rendez-vous" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0E0E11] border border-gray-200 dark:border-white/10 p-6 rounded-xl flex flex-col shadow-sm dark:shadow-none transition-colors duration-300">
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest mb-6">Objectifs Mensuels</h3>
                    <div className="flex-1 flex flex-col justify-center gap-8">
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-mono text-gray-500 dark:text-gray-400">
                                <span>OBJECTIF_APPELS</span>
                                <span className="text-gray-900 dark:text-white">75%</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-gray-900 dark:bg-white h-1.5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.2)] dark:shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: '75%' }}></div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-mono text-gray-500 dark:text-gray-400">
                                <span>OBJECTIF_RDV</span>
                                <span className="text-red-500">45%</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-red-600 h-1.5 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.5)]" style={{ width: '45%' }}></div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-mono text-gray-500 dark:text-gray-400">
                                <span>OBJECTIF_REVENU</span>
                                <span className="text-gray-700 dark:text-gray-300">60%</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-gray-400 dark:bg-gray-500 h-1.5 rounded-full" style={{ width: '60%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

