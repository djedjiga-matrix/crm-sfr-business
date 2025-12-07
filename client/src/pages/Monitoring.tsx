import { useEffect, useState } from 'react';
import { socketService } from '../services/socket';
import UserCard from '../components/monitoring/UserCard';
import api from '../services/api';
import { Monitor, Coffee, Phone, AlertCircle, Search } from 'lucide-react';

const Monitoring = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL'); // ALL, AGENT, COMMERCIAL, SUPERVISEUR
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchInitialState = async () => {
            try {
                const response = await api.get('/monitoring');
                setUsers(response.data);
            } catch (error) {
                console.error('Error fetching monitoring state:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialState();
        socketService.connect();
        socketService.emit('join_monitoring', {});

        // Refresh every 10 seconds
        const refreshInterval = setInterval(fetchInitialState, 10000);

        const handleStatusUpdate = (data: any) => {
            console.log('Received status update:', data);
            setUsers(prevUsers => prevUsers.map(user =>
                user.id === data.userId ? { ...user, ...data } : user
            ));
            // Also force refetch to be sure we have latest data (e.g. if new user logged in)
            fetchInitialState();
        };

        socketService.on('user_status_update', handleStatusUpdate);

        return () => {
            clearInterval(refreshInterval);
            socketService.off('user_status_update', handleStatusUpdate);
        };
    }, []);

    const stats = {
        connected: users.filter(u => u.status === 'CONNECTED_ACTIVE' || u.status === 'CONNECTED_INACTIVE').length,
        paused: users.filter(u => u.status === 'PAUSED').length,
        onCall: users.filter(u => u.status === 'ON_CALL').length,
        disconnected: users.filter(u => u.status === 'DISCONNECTED').length,
        total: users.length
    };

    const filteredUsers = users.filter(user => {
        const matchesFilter = filter === 'ALL' || user.role === filter;
        const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
                        <Monitor className="text-blue-500" />
                        Monitoring Temps Réel
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Vue d'ensemble de l'activité des équipes
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 rounded-lg p-1">
                    <button
                        onClick={() => setFilter('ALL')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${filter === 'ALL' ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                    >
                        Tous
                    </button>
                    <button
                        onClick={() => setFilter('AGENT')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${filter === 'AGENT' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                    >
                        Agents
                    </button>
                    <button
                        onClick={() => setFilter('COMMERCIAL')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${filter === 'COMMERCIAL' ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                    >
                        Commerciaux
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#0A0A0C] p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Connectés</p>
                        <p className="text-2xl font-bold text-green-500">{stats.connected}</p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-500/10 rounded-full text-green-500">
                        <Monitor size={20} />
                    </div>
                </div>
                <div className="bg-white dark:bg-[#0A0A0C] p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">En Pause</p>
                        <p className="text-2xl font-bold text-orange-500">{stats.paused}</p>
                    </div>
                    <div className="p-3 bg-orange-50 dark:bg-orange-500/10 rounded-full text-orange-500">
                        <Coffee size={20} />
                    </div>
                </div>
                <div className="bg-white dark:bg-[#0A0A0C] p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">En Appel</p>
                        <p className="text-2xl font-bold text-blue-500">{stats.onCall}</p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-full text-blue-500">
                        <Phone size={20} />
                    </div>
                </div>
                <div className="bg-white dark:bg-[#0A0A0C] p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hors Ligne</p>
                        <p className="text-2xl font-bold text-gray-400">{stats.disconnected}</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-500/10 rounded-full text-gray-400">
                        <AlertCircle size={20} />
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Rechercher un utilisateur..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                />
            </div>

            {/* Users Grid */}
            {loading ? (
                <div className="text-center py-12 text-gray-500">Chargement...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredUsers.map(user => (
                        <UserCard key={user.id} user={user} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Monitoring;
