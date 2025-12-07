import { useState, useEffect } from 'react';
import { Trophy, Target, Star, TrendingUp, Award, Zap, Medal, RefreshCw, Phone, Calendar } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, format } from 'date-fns';

interface Stats {
    callsToday: number;
    appointmentsToday: number;
    appointmentsTotal: number;
    newContactsToday: number;
    conversionRate: number;
}

interface Goal {
    id: string;
    name: string;
    target: number;
    current: number;
    unit: string;
    type: 'daily' | 'weekly' | 'monthly';
}

interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    earned: boolean;
    progress?: number;
    maxProgress?: number;
}

interface LeaderboardEntry {
    rank: number;
    userId: string;
    name: string;
    calls: number;
    appointments: number;
    score: number;
    isCurrentUser?: boolean;
}

// Composant Barre d'objectif
const ObjectiveProgress = ({ goal, compact = false }: { goal: Goal; compact?: boolean }) => {
    const percentage = Math.min((goal.current / goal.target) * 100, 100);
    const isCompleted = goal.current >= goal.target;

    const colorClass = isCompleted
        ? 'bg-green-500'
        : percentage >= 75
            ? 'bg-yellow-500'
            : percentage >= 50
                ? 'bg-orange-500'
                : 'bg-red-500';

    if (compact) {
        return (
            <div className="flex items-center gap-3">
                <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500 font-mono uppercase">{goal.name}</span>
                        <span className={`font-bold ${isCompleted ? 'text-green-500' : 'text-gray-700 dark:text-gray-300'}`}>
                            {goal.current}/{goal.target}
                        </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                </div>
                {isCompleted && <Star size={16} className="text-green-500 fill-green-500" />}
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Target size={18} className={isCompleted ? 'text-green-500' : 'text-gray-400'} />
                    <span className="font-medium text-gray-900 dark:text-white">{goal.name}</span>
                </div>
                <span className={`text-sm font-mono ${isCompleted ? 'text-green-500' : 'text-gray-500'}`}>
                    {goal.type === 'daily' ? 'Aujourd\'hui' : goal.type === 'weekly' ? 'Cette semaine' : 'Ce mois'}
                </span>
            </div>

            <div className="flex items-end gap-4 mb-3">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">{goal.current}</span>
                <span className="text-gray-400 text-lg mb-1">/ {goal.target} {goal.unit}</span>
            </div>

            <div className="h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>

            <div className="mt-2 flex justify-between items-center">
                <span className="text-xs text-gray-500">
                    {isCompleted ? (
                        <span className="text-green-500 font-medium">✓ Objectif atteint !</span>
                    ) : (
                        <span>Encore {goal.target - goal.current} {goal.unit} à faire</span>
                    )}
                </span>
                <span className="text-xs font-bold text-gray-400">{Math.round(percentage)}%</span>
            </div>
        </div>
    );
};

// Composant Badge
const BadgeItem = ({ badge }: { badge: Badge }) => (
    <div className={`flex items-center gap-3 p-3 rounded-lg transition-all ${badge.earned
        ? 'bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20'
        : 'bg-gray-50 dark:bg-white/5'
        }`}>
        <span className={`text-2xl ${!badge.earned ? 'grayscale opacity-50' : ''}`}>{badge.icon}</span>
        <div className="flex-1">
            <div className="font-medium text-sm text-gray-900 dark:text-white">{badge.name}</div>
            <div className="text-xs text-gray-500">{badge.description}</div>
            {!badge.earned && badge.progress !== undefined && badge.maxProgress && (
                <div className="mt-1">
                    <div className="h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-yellow-500 rounded-full"
                            style={{ width: `${(badge.progress / badge.maxProgress) * 100}%` }}
                        />
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{badge.progress}/{badge.maxProgress}</div>
                </div>
            )}
        </div>
        {badge.earned && <Star size={16} className="text-yellow-500 fill-yellow-500" />}
    </div>
);

// Composant Streak (pour usage futur)
// const StreakDisplay = ({ days }: { days: number }) => (
//     <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl border border-orange-500/20">
//         <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl text-white">
//             <Flame size={24} />
//         </div>
//         <div>
//             <div className="text-3xl font-bold text-orange-500">{days}</div>
//             <div className="text-xs text-gray-500 uppercase tracking-wide">Jours consécutifs</div>
//         </div>
//     </div>
// );

// Composant Classement
const Leaderboard = ({ entries, loading }: { entries: LeaderboardEntry[]; loading: boolean }) => {
    if (loading) {
        return (
            <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="animate-pulse h-14 bg-gray-100 dark:bg-white/5 rounded-lg" />
                ))}
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 text-sm">
                Aucune donnée de classement disponible
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {entries.map((entry) => (
                <div
                    key={entry.userId}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${entry.isCurrentUser
                        ? 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20'
                        : 'hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                >
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${entry.rank === 1
                        ? 'bg-yellow-500 text-white'
                        : entry.rank === 2
                            ? 'bg-gray-300 text-gray-700'
                            : entry.rank === 3
                                ? 'bg-orange-400 text-white'
                                : 'bg-gray-100 dark:bg-white/10 text-gray-500'
                        }`}>
                        {entry.rank}
                    </div>
                    <div className="flex-1">
                        <span className="font-medium text-gray-900 dark:text-white">
                            {entry.name} {entry.isCurrentUser && <span className="text-xs text-red-500">(vous)</span>}
                        </span>
                        <div className="flex gap-3 text-[10px] text-gray-500">
                            <span className="flex items-center gap-1"><Phone size={10} /> {entry.calls} appels</span>
                            <span className="flex items-center gap-1"><Calendar size={10} /> {entry.appointments} RDV</span>
                        </div>
                    </div>
                    <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{entry.score} pts</span>
                    {entry.rank <= 3 && (
                        <span className="text-lg">
                            {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
};

// Widget compact pour le Dashboard
export const ObjectivesWidget = () => {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await api.get('/stats');
            const data = response.data;

            setGoals([
                { id: 'calls_daily', name: 'Appels du jour', target: 50, current: data.callsToday || 0, unit: 'appels', type: 'daily' },
                { id: 'rdv_daily', name: 'RDV du jour', target: 3, current: data.appointmentsToday || 0, unit: 'RDV', type: 'daily' },
            ]);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="animate-pulse h-24 bg-gray-100 dark:bg-white/5 rounded-xl" />;
    }

    return (
        <div className="space-y-4">
            {goals.map(goal => (
                <ObjectiveProgress key={goal.id} goal={goal} compact />
            ))}
        </div>
    );
};

// Page complète Objectifs et Gamification
const ObjectivesPage = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState<Stats | null>(null);
    const [weeklyStats, setWeeklyStats] = useState<{ calls: number; appointments: number } | null>(null);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [badges, setBadges] = useState<Badge[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [leaderboardLoading, setLeaderboardLoading] = useState(true);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        setLeaderboardLoading(true);

        try {
            // Récupérer les stats du jour
            const todayResponse = await api.get('/stats', {
                params: {
                    startDate: startOfDay(new Date()).toISOString(),
                    endDate: endOfDay(new Date()).toISOString()
                }
            });
            setStats(todayResponse.data);

            // Récupérer les stats de la semaine
            const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
            const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
            const weekResponse = await api.get('/stats', {
                params: {
                    startDate: weekStart.toISOString(),
                    endDate: weekEnd.toISOString()
                }
            });
            setWeeklyStats({
                calls: weekResponse.data.callsToday || 0,
                appointments: weekResponse.data.appointmentsToday || 0
            });

            // Construire les objectifs avec les vraies données
            const dailyStats = todayResponse.data;
            const weeklyData = weekResponse.data;

            setGoals([
                { id: 'calls_daily', name: 'Appels du jour', target: 50, current: dailyStats.callsToday || 0, unit: 'appels', type: 'daily' },
                { id: 'rdv_daily', name: 'RDV du jour', target: 3, current: dailyStats.appointmentsToday || 0, unit: 'RDV', type: 'daily' },
                { id: 'calls_weekly', name: 'Appels semaine', target: 200, current: weeklyData.callsToday || 0, unit: 'appels', type: 'weekly' },
                { id: 'rdv_weekly', name: 'RDV semaine', target: 15, current: weeklyData.appointmentsToday || 0, unit: 'RDV', type: 'weekly' },
            ]);

            // Calculer les badges basés sur les vraies stats
            const totalRdv = todayResponse.data.appointmentsTotal || 0;
            const todayCalls = dailyStats.callsToday || 0;
            const todayRdv = dailyStats.appointmentsToday || 0;

            setBadges([
                {
                    id: 'first_call',
                    name: 'Premier Appel',
                    description: 'Passez votre premier appel',
                    icon: '📞',
                    earned: todayCalls >= 1 || (weeklyData.callsToday || 0) >= 1,
                    progress: Math.min(todayCalls, 1),
                    maxProgress: 1
                },
                {
                    id: 'first_rdv',
                    name: 'Premier RDV',
                    description: 'Obtenez votre premier rendez-vous',
                    icon: '📅',
                    earned: totalRdv >= 1,
                    progress: Math.min(totalRdv, 1),
                    maxProgress: 1
                },
                {
                    id: 'calls_50',
                    name: 'Téléphoniste',
                    description: '50 appels en une journée',
                    icon: '🏆',
                    earned: todayCalls >= 50,
                    progress: Math.min(todayCalls, 50),
                    maxProgress: 50
                },
                {
                    id: 'rdv_5',
                    name: 'Performeur',
                    description: '5 RDV en une journée',
                    icon: '⭐',
                    earned: todayRdv >= 5,
                    progress: Math.min(todayRdv, 5),
                    maxProgress: 5
                },
                {
                    id: 'rdv_10',
                    name: 'Expert',
                    description: '10 RDV au total',
                    icon: '🎯',
                    earned: totalRdv >= 10,
                    progress: Math.min(totalRdv, 10),
                    maxProgress: 10
                },
                {
                    id: 'rdv_50',
                    name: 'Maître',
                    description: '50 RDV au total',
                    icon: '🏅',
                    earned: totalRdv >= 50,
                    progress: Math.min(totalRdv, 50),
                    maxProgress: 50
                },
                {
                    id: 'rdv_100',
                    name: 'Légende',
                    description: '100 RDV au total',
                    icon: '👑',
                    earned: totalRdv >= 100,
                    progress: Math.min(totalRdv, 100),
                    maxProgress: 100
                },
                {
                    id: 'conversion',
                    name: 'Convertisseur',
                    description: 'Taux de conversion > 10%',
                    icon: '🔥',
                    earned: parseFloat(String(dailyStats.conversionRate || 0)) >= 10
                },
            ]);

            setLoading(false);

            // Récupérer le classement (tous les agents)
            await fetchLeaderboard();

        } catch (error) {
            console.error('Error fetching data:', error);
            setLoading(false);
            setLeaderboardLoading(false);
        }
    };

    const fetchLeaderboard = async () => {
        try {
            // Récupérer la liste des utilisateurs (agents)
            const usersResponse = await api.get('/users');
            const users = usersResponse.data.filter((u: any) => u.role === 'AGENT' || u.role === 'SUPERVISEUR');

            // Récupérer les stats pour chaque agent
            const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
            const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

            const leaderboardData: LeaderboardEntry[] = [];

            for (const u of users.slice(0, 10)) { // Limiter à 10 agents
                try {
                    // On récupère les appels de cet agent
                    const callsResponse = await api.get('/calls', {
                        params: {
                            userId: u.id,
                            startDate: weekStart.toISOString(),
                            endDate: weekEnd.toISOString(),
                            limit: 1000
                        }
                    });

                    // On récupère les RDV de cet agent (s'il a reservé des RDV)
                    const appointmentsResponse = await api.get('/appointments', {
                        params: {
                            agentId: u.id,
                            startDate: weekStart.toISOString(),
                            endDate: weekEnd.toISOString()
                        }
                    });

                    const calls = callsResponse.data?.calls?.length || callsResponse.data?.length || 0;
                    const appointments = appointmentsResponse.data?.length || 0;
                    const score = calls + (appointments * 10); // 10 points par RDV

                    leaderboardData.push({
                        rank: 0,
                        userId: u.id,
                        name: u.name,
                        calls,
                        appointments,
                        score,
                        isCurrentUser: u.id === user?.id
                    });
                } catch (err) {
                    // Agent sans données
                    leaderboardData.push({
                        rank: 0,
                        userId: u.id,
                        name: u.name,
                        calls: 0,
                        appointments: 0,
                        score: 0,
                        isCurrentUser: u.id === user?.id
                    });
                }
            }

            // Trier par score et assigner les rangs
            leaderboardData.sort((a, b) => b.score - a.score);
            leaderboardData.forEach((entry, index) => {
                entry.rank = index + 1;
            });

            setLeaderboard(leaderboardData.slice(0, 10));
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            // Fallback avec données de l'utilisateur actuel
            if (stats) {
                setLeaderboard([{
                    rank: 1,
                    userId: user?.id || '',
                    name: user?.name || 'Vous',
                    calls: stats.callsToday || 0,
                    appointments: stats.appointmentsToday || 0,
                    score: (stats.callsToday || 0) + ((stats.appointmentsToday || 0) * 10),
                    isCurrentUser: true
                }]);
            }
        } finally {
            setLeaderboardLoading(false);
        }
    };

    const currentUserRank = leaderboard.find(e => e.isCurrentUser)?.rank || '-';
    const earnedBadgesCount = badges.filter(b => b.earned).length;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight uppercase flex items-center gap-3">
                        <Trophy className="text-yellow-500" />
                        Objectifs & Performances <span className="text-red-600">.</span>
                    </h1>
                    <p className="text-gray-500 text-sm font-mono mt-1">
                        PROGRESSION_DU_{format(new Date(), 'dd/MM/yyyy').toUpperCase()}
                    </p>
                </div>
                <button
                    onClick={fetchAllData}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Actualiser
                </button>
            </div>

            {/* Stats rapides */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Stats du jour */}
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/20">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl text-white">
                        <Phone size={24} />
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-blue-500">{stats?.callsToday || 0}</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Appels aujourd'hui</div>
                    </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
                    <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl text-white">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-green-500">{stats?.appointmentsToday || 0}</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">RDV aujourd'hui</div>
                    </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/20">
                    <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl text-white">
                        <Award size={24} />
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-yellow-500">{earnedBadgesCount}</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Badges obtenus</div>
                    </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-xl border border-purple-500/20">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl text-white">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-purple-500">#{currentUserRank}</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Position classement</div>
                    </div>
                </div>
            </div>

            {/* Objectifs du jour */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Target size={20} className="text-red-500" />
                    Objectifs du jour
                </h2>
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2].map(i => (
                            <div key={i} className="animate-pulse h-32 bg-gray-100 dark:bg-white/5 rounded-xl" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {goals.filter(g => g.type === 'daily').map(goal => (
                            <ObjectiveProgress key={goal.id} goal={goal} />
                        ))}
                    </div>
                )}
            </div>

            {/* Objectifs de la semaine */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Target size={20} className="text-blue-500" />
                    Objectifs de la semaine
                </h2>
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2].map(i => (
                            <div key={i} className="animate-pulse h-32 bg-gray-100 dark:bg-white/5 rounded-xl" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {goals.filter(g => g.type === 'weekly').map(goal => (
                            <ObjectiveProgress key={goal.id} goal={goal} />
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Badges */}
                <div className="bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 rounded-xl p-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Medal size={20} className="text-yellow-500" />
                        Badges ({earnedBadgesCount}/{badges.length})
                    </h2>
                    {loading ? (
                        <div className="space-y-2">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="animate-pulse h-16 bg-gray-100 dark:bg-white/5 rounded-lg" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto">
                            {badges.map(badge => (
                                <BadgeItem key={badge.id} badge={badge} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Classement */}
                <div className="bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 rounded-xl p-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Zap size={20} className="text-red-500" />
                        Classement de la semaine
                    </h2>
                    <Leaderboard entries={leaderboard} loading={leaderboardLoading} />
                </div>
            </div>

            {/* Stats totales */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 dark:from-[#0A0A0C] dark:to-[#111] rounded-xl p-6 text-white">
                <h3 className="text-sm font-mono text-gray-400 mb-2">STATISTIQUES_CUMULÉES</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                        <div className="text-4xl font-bold">{stats?.appointmentsTotal || 0}</div>
                        <div className="text-xs text-gray-400">RDV total</div>
                    </div>
                    <div>
                        <div className="text-4xl font-bold">{stats?.conversionRate || 0}%</div>
                        <div className="text-xs text-gray-400">Taux conversion</div>
                    </div>
                    <div>
                        <div className="text-4xl font-bold">{weeklyStats?.calls || 0}</div>
                        <div className="text-xs text-gray-400">Appels semaine</div>
                    </div>
                    <div>
                        <div className="text-4xl font-bold">{weeklyStats?.appointments || 0}</div>
                        <div className="text-xs text-gray-400">RDV semaine</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ObjectivesPage;
