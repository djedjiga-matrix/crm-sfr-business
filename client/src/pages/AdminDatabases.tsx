import { useState, useEffect } from 'react';
import {
    Database, ChevronDown, ChevronRight, Eye, EyeOff, Users, Target,
    Settings, RefreshCw, Search, Filter, Folder, FolderOpen,
    CheckCircle, XCircle, User, Building, Clock, Trash2, Plus, X
} from 'lucide-react';
import api from '../services/api';

interface Database {
    id: string;
    name: string;
    filename: string;
    date: string;
    isActive: boolean;
    importerName: string;
    totalContacts: number;
    campaignId?: string;
    campaignName?: string;
    assignedUsers?: { id: string; name: string; role: string }[];
    stats: {
        exploitable: number;
        argumented: number;
        positive: number;
        counts: {
            exploitable: number;
            argumented: number;
            positive: number;
        };
    };
}

interface Campaign {
    id: string;
    name: string;
    status: string;
    databases: Database[];
}

interface UserType {
    id: string;
    name: string;
    role: string;
}

const AdminDatabases = () => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [allDatabases, setAllDatabases] = useState<Database[]>([]);
    const [users, setUsers] = useState<UserType[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInactive, setShowInactive] = useState(false);
    const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');

    // Modal states
    const [selectedDatabase, setSelectedDatabase] = useState<Database | null>(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [dbRes, campRes, usersRes] = await Promise.all([
                api.get('/databases'),
                api.get('/campaigns'),
                api.get('/users')
            ]);

            const databases: Database[] = dbRes.data;
            const campaignsData: any[] = campRes.data;
            setAllDatabases(databases);
            setUsers(usersRes.data);

            // Group databases by campaign
            const campaignsWithDatabases: Campaign[] = campaignsData.map((c: any) => ({
                id: c.id,
                name: c.name,
                status: c.status,
                databases: databases.filter(db => db.campaignId === c.id)
            }));

            // Add "Unassigned" virtual campaign for databases without campaignId
            const unassignedDbs = databases.filter(db => !db.campaignId);
            if (unassignedDbs.length > 0) {
                campaignsWithDatabases.push({
                    id: '__unassigned__',
                    name: 'Non assignées',
                    status: 'ACTIVE',
                    databases: unassignedDbs
                });
            }

            setCampaigns(campaignsWithDatabases);

            // Auto-expand all campaigns initially
            setExpandedCampaigns(new Set(campaignsWithDatabases.map(c => c.id)));

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleCampaign = (campaignId: string) => {
        setExpandedCampaigns(prev => {
            const next = new Set(prev);
            if (next.has(campaignId)) {
                next.delete(campaignId);
            } else {
                next.add(campaignId);
            }
            return next;
        });
    };

    const toggleDatabaseStatus = async (db: Database) => {
        try {
            await api.put(`/databases/${db.id}/status`, { isActive: !db.isActive });
            fetchData(); // Refresh
        } catch (error) {
            console.error('Error toggling status:', error);
        }
    };

    const openAssignModal = (db: Database) => {
        setSelectedDatabase(db);
        setSelectedUserIds(db.assignedUsers?.map(u => u.id) || []);
        setIsAssignModalOpen(true);
    };

    const toggleUserSelection = (userId: string) => {
        setSelectedUserIds(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const saveAssignments = async () => {
        if (!selectedDatabase) return;
        setSaving(true);
        try {
            await api.put(`/databases/${selectedDatabase.id}/assign`, {
                userIds: selectedUserIds
            });
            setIsAssignModalOpen(false);
            fetchData(); // Refresh
        } catch (error) {
            console.error('Error saving assignments:', error);
        } finally {
            setSaving(false);
        }
    };

    // Filter databases based on search and visibility
    const filterDatabases = (databases: Database[]): Database[] => {
        return databases.filter(db => {
            // Filter by active/inactive
            if (!showInactive && !db.isActive) return false;

            // Filter by search query
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return (
                    db.name.toLowerCase().includes(query) ||
                    db.filename.toLowerCase().includes(query) ||
                    db.importerName.toLowerCase().includes(query)
                );
            }

            return true;
        });
    };

    const filteredCampaigns = campaigns.map(c => ({
        ...c,
        databases: filterDatabases(c.databases)
    })).filter(c => c.databases.length > 0 || searchQuery === '');

    const totalDatabases = allDatabases.length;
    const activeDatabases = allDatabases.filter(db => db.isActive).length;
    const inactiveDatabases = totalDatabases - activeDatabases;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight uppercase flex items-center gap-3">
                        <Database className="text-red-500" size={28} />
                        Bases de données <span className="text-red-600">.</span>
                    </h1>
                    <p className="text-gray-500 text-sm font-mono mt-1">
                        GESTION_HIERARCHIQUE_CAMPAGNES_BASES
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Stats */}
                    <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                        <div className="text-center">
                            <div className="text-lg font-bold text-gray-900 dark:text-white">{totalDatabases}</div>
                            <div className="text-[10px] text-gray-500 uppercase">Total</div>
                        </div>
                        <div className="h-8 w-px bg-gray-200 dark:bg-white/10"></div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-green-600">{activeDatabases}</div>
                            <div className="text-[10px] text-gray-500 uppercase">Actives</div>
                        </div>
                        <div className="h-8 w-px bg-gray-200 dark:bg-white/10"></div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-gray-400">{inactiveDatabases}</div>
                            <div className="text-[10px] text-gray-500 uppercase">Masquées</div>
                        </div>
                    </div>

                    <button
                        onClick={fetchData}
                        className="p-2 bg-gray-100 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                    >
                        <RefreshCw size={18} className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 flex-1 w-full md:w-auto">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Rechercher une base..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500/50"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowInactive(!showInactive)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all text-sm font-medium ${showInactive
                                ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-500/30'
                                : 'bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10'
                            }`}
                    >
                        {showInactive ? <Eye size={16} /> : <EyeOff size={16} />}
                        {showInactive ? 'Toutes les bases' : 'Bases actives uniquement'}
                    </button>

                    <button
                        onClick={() => {
                            if (expandedCampaigns.size === campaigns.length) {
                                setExpandedCampaigns(new Set());
                            } else {
                                setExpandedCampaigns(new Set(campaigns.map(c => c.id)));
                            }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    >
                        {expandedCampaigns.size === campaigns.length ? (
                            <>
                                <ChevronDown size={16} />
                                Réduire tout
                            </>
                        ) : (
                            <>
                                <ChevronRight size={16} />
                                Tout déplier
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Campaigns & Databases List */}
            {loading ? (
                <div className="text-center py-12">
                    <RefreshCw size={32} className="animate-spin text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 font-mono">CHARGEMENT_BASES...</p>
                </div>
            ) : filteredCampaigns.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-[#0A0A0C] rounded-xl border border-gray-200 dark:border-white/10">
                    <Database size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500">Aucune base de données trouvée</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredCampaigns.map(campaign => (
                        <div
                            key={campaign.id}
                            className="bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden"
                        >
                            {/* Campaign Header */}
                            <div
                                onClick={() => toggleCampaign(campaign.id)}
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {expandedCampaigns.has(campaign.id) ? (
                                        <FolderOpen className="text-red-500" size={20} />
                                    ) : (
                                        <Folder className="text-gray-400" size={20} />
                                    )}
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                                            {campaign.name}
                                        </h3>
                                        <p className="text-xs text-gray-500 font-mono">
                                            {campaign.databases.length} base{campaign.databases.length > 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    {campaign.status === 'ACTIVE' && (
                                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase text-green-600 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded">
                                            Active
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right hidden md:block">
                                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                                            {campaign.databases.reduce((sum, db) => sum + db.totalContacts, 0).toLocaleString()}
                                        </div>
                                        <div className="text-[10px] text-gray-500 uppercase">Contacts</div>
                                    </div>
                                    {expandedCampaigns.has(campaign.id) ? (
                                        <ChevronDown className="text-gray-400" size={20} />
                                    ) : (
                                        <ChevronRight className="text-gray-400" size={20} />
                                    )}
                                </div>
                            </div>

                            {/* Databases List */}
                            {expandedCampaigns.has(campaign.id) && campaign.databases.length > 0 && (
                                <div className="border-t border-gray-100 dark:border-white/5">
                                    {campaign.databases.map((db, index) => (
                                        <div
                                            key={db.id}
                                            className={`flex items-center justify-between p-4 pl-12 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${index < campaign.databases.length - 1 ? 'border-b border-gray-100 dark:border-white/5' : ''
                                                } ${!db.isActive ? 'opacity-50' : ''}`}
                                        >
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                {/* Status indicator */}
                                                <div className={`w-2 h-2 rounded-full ${db.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />

                                                {/* Info */}
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-gray-900 dark:text-white truncate">
                                                            {db.name || db.filename}
                                                        </h4>
                                                        {!db.isActive && (
                                                            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase text-gray-500 bg-gray-100 dark:bg-white/10 rounded">
                                                                Masquée
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                                        <span className="flex items-center gap-1">
                                                            <Target size={12} />
                                                            {db.totalContacts.toLocaleString()} contacts
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock size={12} />
                                                            {new Date(db.date).toLocaleDateString('fr-FR')}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <User size={12} />
                                                            {db.importerName}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Stats bars */}
                                                <div className="hidden lg:flex items-center gap-4 text-xs">
                                                    <div className="w-24">
                                                        <div className="flex justify-between text-gray-500 mb-1">
                                                            <span>Exploit.</span>
                                                            <span>{db.stats.exploitable}%</span>
                                                        </div>
                                                        <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-blue-500 rounded-full"
                                                                style={{ width: `${db.stats.exploitable}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="w-24">
                                                        <div className="flex justify-between text-gray-500 mb-1">
                                                            <span>Argum.</span>
                                                            <span>{db.stats.argumented}%</span>
                                                        </div>
                                                        <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-purple-500 rounded-full"
                                                                style={{ width: `${db.stats.argumented}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="w-24">
                                                        <div className="flex justify-between text-gray-500 mb-1">
                                                            <span>Positif</span>
                                                            <span>{db.stats.positive}%</span>
                                                        </div>
                                                        <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-green-500 rounded-full"
                                                                style={{ width: `${db.stats.positive}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Assigned users */}
                                                <div className="hidden md:flex items-center gap-1">
                                                    {db.assignedUsers && db.assignedUsers.length > 0 ? (
                                                        <div className="flex -space-x-2">
                                                            {db.assignedUsers.slice(0, 3).map(user => (
                                                                <div
                                                                    key={user.id}
                                                                    className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white dark:border-[#0A0A0C]"
                                                                    title={user.name}
                                                                >
                                                                    {user.name.charAt(0)}
                                                                </div>
                                                            ))}
                                                            {db.assignedUsers.length > 3 && (
                                                                <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-400 border-2 border-white dark:border-[#0A0A0C]">
                                                                    +{db.assignedUsers.length - 3}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">Non assignée</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 ml-4">
                                                <button
                                                    onClick={() => openAssignModal(db)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                                                    title="Assigner des agents"
                                                >
                                                    <Users size={16} />
                                                </button>
                                                <button
                                                    onClick={() => toggleDatabaseStatus(db)}
                                                    className={`p-2 rounded-lg transition-colors ${db.isActive
                                                            ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10'
                                                            : 'text-orange-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10'
                                                        }`}
                                                    title={db.isActive ? 'Masquer la base' : 'Activer la base'}
                                                >
                                                    {db.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                                <button
                                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                                    title="Paramètres de recyclage"
                                                >
                                                    <Settings size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Empty state for campaign */}
                            {expandedCampaigns.has(campaign.id) && campaign.databases.length === 0 && (
                                <div className="border-t border-gray-100 dark:border-white/5 p-8 text-center">
                                    <Database size={32} className="text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-400 text-sm">Aucune base dans cette campagne</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Assignment Modal */}
            {isAssignModalOpen && selectedDatabase && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-lg bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-widest">
                                    Assigner des utilisateurs
                                </h2>
                                <p className="text-xs text-gray-500 font-mono mt-1">
                                    {selectedDatabase.name || selectedDatabase.filename}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsAssignModalOpen(false)}
                                className="text-gray-500 hover:text-red-500 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Sélectionnez les agents et commerciaux qui auront accès à cette base de données.
                            </p>

                            {/* User Groups */}
                            <div className="space-y-4">
                                {/* Agents */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                        Agents
                                    </label>
                                    <div className="max-h-40 overflow-y-auto custom-scrollbar border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 p-2 space-y-1">
                                        {users.filter(u => u.role === 'AGENT').map(user => (
                                            <div
                                                key={user.id}
                                                onClick={() => toggleUserSelection(user.id)}
                                                className={`flex items-center p-2 rounded cursor-pointer transition-colors ${selectedUserIds.includes(user.id)
                                                        ? 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30'
                                                        : 'hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'
                                                    }`}
                                            >
                                                <div className={`w-4 h-4 rounded border mr-3 flex items-center justify-center ${selectedUserIds.includes(user.id)
                                                        ? 'bg-blue-600 border-blue-600'
                                                        : 'border-gray-300 dark:border-gray-600'
                                                    }`}>
                                                    {selectedUserIds.includes(user.id) && (
                                                        <CheckCircle size={12} className="text-white" />
                                                    )}
                                                </div>
                                                <span className="text-sm font-medium">{user.name}</span>
                                            </div>
                                        ))}
                                        {users.filter(u => u.role === 'AGENT').length === 0 && (
                                            <p className="text-xs text-gray-400 p-2">Aucun agent disponible</p>
                                        )}
                                    </div>
                                </div>

                                {/* Commerciaux */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                        Commerciaux
                                    </label>
                                    <div className="max-h-40 overflow-y-auto custom-scrollbar border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 p-2 space-y-1">
                                        {users.filter(u => u.role === 'COMMERCIAL').map(user => (
                                            <div
                                                key={user.id}
                                                onClick={() => toggleUserSelection(user.id)}
                                                className={`flex items-center p-2 rounded cursor-pointer transition-colors ${selectedUserIds.includes(user.id)
                                                        ? 'bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30'
                                                        : 'hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'
                                                    }`}
                                            >
                                                <div className={`w-4 h-4 rounded border mr-3 flex items-center justify-center ${selectedUserIds.includes(user.id)
                                                        ? 'bg-green-600 border-green-600'
                                                        : 'border-gray-300 dark:border-gray-600'
                                                    }`}>
                                                    {selectedUserIds.includes(user.id) && (
                                                        <CheckCircle size={12} className="text-white" />
                                                    )}
                                                </div>
                                                <span className="text-sm font-medium">{user.name}</span>
                                            </div>
                                        ))}
                                        {users.filter(u => u.role === 'COMMERCIAL').length === 0 && (
                                            <p className="text-xs text-gray-400 p-2">Aucun commercial disponible</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="mt-4 p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                                <p className="text-xs text-gray-500">
                                    <strong className="text-gray-700 dark:text-gray-300">{selectedUserIds.length}</strong> utilisateur{selectedUserIds.length > 1 ? 's' : ''} sélectionné{selectedUserIds.length > 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex justify-end gap-3">
                            <button
                                onClick={() => setIsAssignModalOpen(false)}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-sm font-bold transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={saveAssignments}
                                disabled={saving}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                Sauvegarder
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDatabases;
