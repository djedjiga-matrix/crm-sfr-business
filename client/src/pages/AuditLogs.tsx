import { useState, useEffect } from 'react';
import api from '../services/api';
import { Search, Download, RefreshCw, Filter, Clock, ChevronLeft, ChevronRight, Eye, Activity, Shield } from 'lucide-react';

interface AuditLog {
    id: string;
    userId: string | null;
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
    } | null;
    action: string;
    details: string | null;
    ipAddress: string | null;
    createdAt: string;
}

interface AuditStats {
    totalToday: number;
    byAction: { action: string; count: number }[];
}

const actionColors: Record<string, string> = {
    LOGIN: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
    LOGOUT: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-400',
    CONTACT_CREATE: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
    CONTACT_UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    CONTACT_DELETE: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
    CONTACT_QUALIFY: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
    APPOINTMENT_CREATE: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
    APPOINTMENT_UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    EXPORT: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
    IMPORT: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400',
};

const AuditLogs = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [stats, setStats] = useState<AuditStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    // Filters
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchLogs();
        fetchStats();
    }, [page, actionFilter, dateStart, dateEnd]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', String(page));
            params.append('limit', '50');
            if (search) params.append('search', search);
            if (actionFilter) params.append('action', actionFilter);
            if (dateStart) params.append('dateStart', dateStart);
            if (dateEnd) params.append('dateEnd', dateEnd);

            const response = await api.get(`/audit?${params.toString()}`);
            setLogs(response.data.logs);
            setTotalPages(response.data.pagination.pages);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await api.get('/audit/stats');
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching audit stats:', error);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchLogs();
    };

    const handleExport = async () => {
        try {
            const params = new URLSearchParams();
            if (actionFilter) params.append('action', actionFilter);
            if (dateStart) params.append('dateStart', dateStart);
            if (dateEnd) params.append('dateEnd', dateEnd);

            const response = await api.get(`/audit/export?${params.toString()}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error exporting audit logs:', error);
        }
    };

    const getActionColor = (action: string) => {
        // Find matching color
        for (const [key, color] of Object.entries(actionColors)) {
            if (action.includes(key)) return color;
        }
        return 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-400';
    };

    const formatAction = (action: string) => {
        return action.replace(/_/g, ' ');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight uppercase flex items-center gap-3">
                        <Shield className="text-red-600" />
                        Audit Logs <span className="text-red-600">.</span>
                    </h1>
                    <p className="text-gray-500 text-sm font-mono mt-1">TRAÇABILITÉ_DES_ACTIONS</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchLogs}
                        className="p-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                        title="Actualiser"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                    >
                        <Download size={18} />
                        Exporter CSV
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-lg text-red-600 dark:text-red-500">
                                <Activity size={20} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalToday}</p>
                                <p className="text-xs text-gray-500 font-mono">ACTIONS AUJOURD'HUI</p>
                            </div>
                        </div>
                    </div>
                    {stats.byAction.slice(0, 3).map((stat) => (
                        <div key={stat.action} className="bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${getActionColor(stat.action)}`}>
                                    {formatAction(stat.action)}
                                </span>
                                <span className="text-xl font-bold text-gray-900 dark:text-white">{stat.count}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 rounded-xl p-4">
                <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs text-gray-500 font-mono mb-1">RECHERCHE</label>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Action, détails..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 font-mono mb-1">TYPE</label>
                        <select
                            value={actionFilter}
                            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                            className="px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm"
                        >
                            <option value="">Toutes les actions</option>
                            <option value="LOGIN">Connexions</option>
                            <option value="CONTACT">Contacts</option>
                            <option value="APPOINTMENT">RDV</option>
                            <option value="EXPORT">Exports</option>
                            <option value="IMPORT">Imports</option>
                            <option value="USER">Utilisateurs</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 font-mono mb-1">DATE DÉBUT</label>
                        <input
                            type="date"
                            value={dateStart}
                            onChange={(e) => { setDateStart(e.target.value); setPage(1); }}
                            className="px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 font-mono mb-1">DATE FIN</label>
                        <input
                            type="date"
                            value={dateEnd}
                            onChange={(e) => { setDateEnd(e.target.value); setPage(1); }}
                            className="px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm"
                        />
                    </div>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium"
                    >
                        <Filter size={16} />
                    </button>
                </form>
            </div>

            {/* Logs Table */}
            <div className="bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                            <tr>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Date</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Utilisateur</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Action</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Détails</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">IP</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500 font-mono animate-pulse">
                                        CHARGEMENT...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500 font-mono">
                                        AUCUN_LOG_TROUVÉ
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                                                <Clock size={12} />
                                                {new Date(log.createdAt).toLocaleString('fr-FR')}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-gray-400 to-gray-600 flex items-center justify-center text-xs font-bold text-white">
                                                    {log.user?.name?.charAt(0) || 'S'}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {log.user?.name || 'Système'}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 font-mono">
                                                        {log.user?.role || 'SYSTEM'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${getActionColor(log.action)}`}>
                                                {formatAction(log.action)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[250px]" title={log.details || '-'}>
                                                {log.details || '-'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs text-gray-500 font-mono">
                                                {log.ipAddress || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {log.details && log.details.startsWith('{') && (
                                                <button
                                                    onClick={() => setSelectedLog(log)}
                                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
                                                    title="Voir les détails JSON"
                                                >
                                                    <Eye size={14} className="text-gray-400" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-white/10">
                        <span className="text-sm text-gray-500">
                            Page {page} sur {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg disabled:opacity-50"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg disabled:opacity-50"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white dark:bg-[#0E0E11] rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10">
                            <h3 className="font-bold text-gray-900 dark:text-white">Détails JSON</h3>
                            <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
                                ✕
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto max-h-[60vh]">
                            <pre className="bg-gray-50 dark:bg-white/5 p-4 rounded-lg text-xs font-mono overflow-x-auto text-gray-800 dark:text-gray-200">
                                {(() => {
                                    try {
                                        return JSON.stringify(JSON.parse(selectedLog.details || '{}'), null, 2);
                                    } catch {
                                        return selectedLog.details;
                                    }
                                })()}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditLogs;
