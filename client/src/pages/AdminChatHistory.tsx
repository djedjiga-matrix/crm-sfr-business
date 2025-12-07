import { useState, useEffect } from 'react';
import { Search, Download, MessageCircle } from 'lucide-react';
import api from '../services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const AdminChatHistory = () => {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        query: '',
        type: 'ALL'
    });

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.query) params.append('query', filters.query);

            const response = await api.get(`/chat/admin/history?${params.toString()}`);
            setMessages(response.data);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchHistory();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Historique des Conversations</h1>
                    <p className="text-gray-500 dark:text-gray-400">Supervision et archivage des messages</p>
                </div>
                <button className="btn-secondary flex items-center gap-2">
                    <Download size={16} />
                    Exporter
                </button>
            </div>

            {/* Filters */}
            <div className="glass-panel p-6 rounded-xl">
                <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Période</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                className="input-field text-xs"
                            />
                            <span className="text-gray-400">→</span>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                className="input-field text-xs"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Recherche</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Mots-clés..."
                                value={filters.query}
                                onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                                className="input-field pl-9"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                        <select
                            value={filters.type}
                            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                            className="input-field"
                        >
                            <option value="ALL">Toutes les conversations</option>
                            <option value="DIRECT">Messages Directs</option>
                            <option value="GROUP">Groupes</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
                            <Search size={16} />
                            Rechercher
                        </button>
                    </div>
                </form>
            </div>

            {/* Results */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <MessageCircle size={18} className="text-red-600" />
                        Résultats ({messages.length})
                    </h3>
                </div>

                <div className="divide-y divide-gray-200 dark:divide-white/5">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Chargement...</div>
                    ) : messages.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">Aucun message trouvé</div>
                    ) : (
                        messages.map((msg) => (
                            <div key={msg.id} className="p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-gray-900 dark:text-white">{msg.sender?.name || 'Utilisateur inconnu'}</span>
                                        <span className="text-xs text-gray-500">dans</span>
                                        <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                            {msg.group?.name || 'Conversation'}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-400 font-mono">
                                        {format(new Date(msg.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-black/20 p-3 rounded-lg border border-gray-100 dark:border-white/5">
                                    {msg.content}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminChatHistory;
