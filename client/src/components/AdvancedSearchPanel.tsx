import { useState, useEffect } from 'react';
import { Search, Calendar, User, Phone, X, Check, RefreshCw, Filter, Lock as LockIcon } from 'lucide-react';
import api from '../services/api';

interface AdvancedSearchPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onApplyFilters: (filters: any) => void;
    onResetFilters: () => void;
    activeFiltersCount: number;
    initialFilters?: any;
}

interface Agent {
    id: string;
    name: string;
    role: string;
}

const AdvancedSearchPanel = ({ isOpen, onClose, onApplyFilters, onResetFilters, initialFilters }: AdvancedSearchPanelProps) => {
    const [filters, setFilters] = useState({
        id: '',
        dateType: 'exact', // 'exact' | 'period'
        dateExact: '',
        dateStart: '',
        dateEnd: '',
        agentIds: [] as string[],
        phone: '',
    });

    const [agents, setAgents] = useState<Agent[]>([]);
    const [loadingAgents, setLoadingAgents] = useState(false);
    const [agentSearch, setAgentSearch] = useState('');

    useEffect(() => {
        if (initialFilters) {
            setFilters(prev => ({ ...prev, ...initialFilters }));
        }
    }, [initialFilters]);

    useEffect(() => {
        if (isOpen) {
            fetchAgents();
        }
    }, [isOpen]);

    const fetchAgents = async () => {
        setLoadingAgents(true);
        try {
            const response = await api.get('/users');
            setAgents(response.data);
        } catch (error) {
            console.error('Error fetching agents:', error);
        } finally {
            setLoadingAgents(false);
        }
    };

    const handleAgentToggle = (agentId: string) => {
        setFilters(prev => {
            const currentIds = prev.agentIds || [];
            if (currentIds.includes(agentId)) {
                return { ...prev, agentIds: currentIds.filter(id => id !== agentId) };
            } else {
                return { ...prev, agentIds: [...currentIds, agentId] };
            }
        });
    };

    const handleQuickDate = (type: 'today' | 'week' | 'month' | 'last7' | 'last30') => {
        const today = new Date();
        let start = new Date();
        let end = new Date();

        switch (type) {
            case 'today':
                // start and end are today
                break;
            case 'week':
                const day = today.getDay() || 7; // Get current day number, converting Sun. to 7
                if (day !== 1) start.setHours(-24 * (day - 1)); // set to Monday
                end.setDate(start.getDate() + 6); // set to Sunday
                break;
            case 'month':
                start.setDate(1);
                end.setMonth(start.getMonth() + 1);
                end.setDate(0);
                break;
            case 'last7':
                start.setDate(today.getDate() - 7);
                break;
            case 'last30':
                start.setDate(today.getDate() - 30);
                break;
        }

        setFilters(prev => ({
            ...prev,
            dateType: 'period',
            dateStart: start.toISOString().split('T')[0],
            dateEnd: end.toISOString().split('T')[0]
        }));
    };

    const handleApply = () => {
        onApplyFilters(filters);
        // onClose(); // Optional: close on apply or keep open? User flow suggests "Apply" then see results.
    };

    const handleReset = () => {
        setFilters({
            id: '',
            dateType: 'exact',
            dateExact: '',
            dateStart: '',
            dateEnd: '',
            agentIds: [],
            phone: '',
        });
        onResetFilters();
    };

    if (!isOpen) return null;

    const filteredAgents = agents.filter(a => a.name.toLowerCase().includes(agentSearch.toLowerCase()));

    return (
        <div className="bg-white dark:bg-[#0E0E11] border-b border-gray-200 dark:border-white/10 shadow-2xl animate-in slide-in-from-top-4 duration-300 transition-colors duration-300">
            <div className="max-w-7xl mx-auto p-6">
                <div className="flex items-center justify-between mb-6 border-b border-gray-200 dark:border-white/5 pb-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Filter className="text-red-600 dark:text-red-500" size={20} />
                        Filtres Avancés
                    </h2>
                    <div className="flex items-center gap-4">
                        <button onClick={handleReset} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 transition-colors">
                            <RefreshCw size={12} /> Réinitialiser
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {/* ID Search */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <LockIcon size={12} /> ID de la fiche
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={filters.id}
                                onChange={(e) => setFilters({ ...filters, id: e.target.value })}
                                placeholder="QC-2025-XXXXXX"
                                className="w-full bg-gray-50 dark:bg-[#050507] border border-gray-200 dark:border-white/10 rounded p-2 pl-8 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:border-red-500/50 outline-none transition-colors font-mono uppercase"
                            />
                            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400 dark:text-gray-500" />
                        </div>
                        <p className="text-[10px] text-gray-500">Recherche partielle acceptée (ex: 123)</p>
                    </div>

                    {/* Date Filter */}
                    <div className="space-y-3 lg:col-span-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <Calendar size={12} /> Date de traitement
                        </label>

                        <div className="flex gap-2 mb-2">
                            <button
                                onClick={() => setFilters({ ...filters, dateType: 'exact' })}
                                className={`flex-1 py-1 text-[10px] uppercase font-bold rounded border ${filters.dateType === 'exact' ? 'bg-red-500/10 dark:bg-red-500/20 border-red-500 text-red-600 dark:text-red-400' : 'bg-transparent border-gray-200 dark:border-white/10 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                            >
                                Exacte
                            </button>
                            <button
                                onClick={() => setFilters({ ...filters, dateType: 'period' })}
                                className={`flex-1 py-1 text-[10px] uppercase font-bold rounded border ${filters.dateType === 'period' ? 'bg-red-500/10 dark:bg-red-500/20 border-red-500 text-red-600 dark:text-red-400' : 'bg-transparent border-gray-200 dark:border-white/10 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                            >
                                Période
                            </button>
                        </div>

                        {filters.dateType === 'exact' ? (
                            <input
                                type="date"
                                value={filters.dateExact}
                                onChange={(e) => setFilters({ ...filters, dateExact: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-[#050507] border border-gray-200 dark:border-white/10 rounded p-2 text-sm text-gray-900 dark:text-white focus:border-red-500/50 outline-none"
                            />
                        ) : (
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={filters.dateStart}
                                    onChange={(e) => setFilters({ ...filters, dateStart: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-[#050507] border border-gray-200 dark:border-white/10 rounded p-2 text-xs text-gray-900 dark:text-white focus:border-red-500/50 outline-none"
                                />
                                <span className="text-gray-500">→</span>
                                <input
                                    type="date"
                                    value={filters.dateEnd}
                                    onChange={(e) => setFilters({ ...filters, dateEnd: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-[#050507] border border-gray-200 dark:border-white/10 rounded p-2 text-xs text-gray-900 dark:text-white focus:border-red-500/50 outline-none"
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-1 mt-2">
                            <button onClick={() => handleQuickDate('today')} className="text-[9px] bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 py-1 rounded transition-colors">Auj.</button>
                            <button onClick={() => handleQuickDate('week')} className="text-[9px] bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 py-1 rounded transition-colors">Sem.</button>
                            <button onClick={() => handleQuickDate('month')} className="text-[9px] bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 py-1 rounded transition-colors">Mois</button>
                        </div>
                    </div>

                    {/* Agent Filter */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <User size={12} /> Agent assigné
                        </label>
                        <div className="bg-gray-50 dark:bg-[#050507] border border-gray-200 dark:border-white/10 rounded p-2 h-32 flex flex-col">
                            <input
                                type="text"
                                placeholder="Rechercher agent..."
                                value={agentSearch}
                                onChange={(e) => setAgentSearch(e.target.value)}
                                className="bg-transparent border-b border-gray-200 dark:border-white/10 pb-1 mb-2 text-xs text-gray-900 dark:text-white outline-none placeholder-gray-400 dark:placeholder-gray-600"
                            />
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                                {loadingAgents ? (
                                    <p className="text-xs text-gray-500 text-center py-2">Chargement...</p>
                                ) : (
                                    filteredAgents.map(agent => (
                                        <label key={agent.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 p-1 rounded">
                                            <input
                                                type="checkbox"
                                                checked={filters.agentIds.includes(agent.id)}
                                                onChange={() => handleAgentToggle(agent.id)}
                                                className="rounded border-gray-300 dark:border-gray-600 bg-transparent text-red-600 focus:ring-red-500"
                                            />
                                            <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{agent.name}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-500">
                            {filters.agentIds.length === 0 ? 'Tous les agents' : `${filters.agentIds.length} agent(s) sélectionné(s)`}
                        </p>
                    </div>

                    {/* Phone Filter */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <Phone size={12} /> Téléphone
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={filters.phone}
                                onChange={(e) => {
                                    // Auto-format logic could go here, for now just simple input
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    setFilters({ ...filters, phone: val });
                                }}
                                placeholder="01 23 45 67 89"
                                className="w-full bg-gray-50 dark:bg-[#050507] border border-gray-200 dark:border-white/10 rounded p-2 pl-8 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:border-red-500/50 outline-none transition-colors font-mono"
                            />
                            <Phone size={14} className="absolute left-2.5 top-2.5 text-gray-400 dark:text-gray-500" />
                        </div>
                        <p className="text-[10px] text-gray-500">Recherche partielle (min 4 chiffres)</p>
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-4 border-t border-gray-200 dark:border-white/5 pt-4">
                    <button
                        onClick={handleApply}
                        className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-sm text-xs font-bold tracking-widest uppercase flex items-center gap-2 shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] transition-all"
                    >
                        <Check size={14} />
                        Appliquer les filtres
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdvancedSearchPanel;
