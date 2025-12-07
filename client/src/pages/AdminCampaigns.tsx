import { useState, useEffect } from 'react';
import { Plus, Edit, Trash, Target, Users, X } from 'lucide-react';
import api from '../services/api';

interface Campaign {
    id: string;
    name: string;
    description?: string;
    status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
    users?: { id: string, name: string }[];
    _count?: {
        contacts: number;
        users: number;
    };
}

interface User {
    id: string;
    name: string;
    role: string;
}

const AdminCampaigns = () => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState<{ id?: string, name: string, description: string, status: string, userIds: string[] }>({
        name: '',
        description: '',
        status: 'ACTIVE',
        userIds: []
    });

    useEffect(() => {
        fetchCampaigns();
        fetchUsers();
    }, []);

    const fetchCampaigns = async () => {
        try {
            const response = await api.get('/campaigns');
            setCampaigns(response.data);
        } catch (error) {
            console.error('Error fetching campaigns:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cette campagne ?')) {
            try {
                await api.delete(`/campaigns/${id}`);
                fetchCampaigns();
            } catch (error) {
                console.error('Error deleting campaign:', error);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (formData.id) {
                await api.put(`/campaigns/${formData.id}`, formData);
            } else {
                await api.post('/campaigns', formData);
            }
            setIsModalOpen(false);
            fetchCampaigns();
        } catch (error) {
            console.error('Error saving campaign:', error);
        }
    };

    const openModal = (campaign?: Campaign) => {
        if (campaign) {
            setFormData({
                id: campaign.id,
                name: campaign.name,
                description: campaign.description || '',
                status: campaign.status,
                userIds: campaign.users ? campaign.users.map(u => u.id) : []
            });
        } else {
            setFormData({
                name: '',
                description: '',
                status: 'ACTIVE',
                userIds: []
            });
        }
        setIsModalOpen(true);
    };

    const toggleUserSelection = (userId: string) => {
        setFormData(prev => {
            const userIds = prev.userIds.includes(userId)
                ? prev.userIds.filter(id => id !== userId)
                : [...prev.userIds, userId];
            return { ...prev, userIds };
        });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight uppercase">Campagnes <span className="text-red-600">.</span></h1>
                    <p className="text-gray-500 text-sm font-mono mt-1">SYSTÈME_GESTION_CAMPAGNES</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus size={16} />
                    <span>Créer Campagne</span>
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="text-gray-500 font-mono animate-pulse">CHARGEMENT_CAMPAGNES...</div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {campaigns.map(campaign => (
                        <div key={campaign.id} className="bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] p-6 rounded-xl flex flex-col h-full group transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors uppercase tracking-wide">{campaign.name}</h3>
                                    <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border mt-2
                                        ${campaign.status === 'ACTIVE' ? 'text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/30 shadow-none dark:shadow-[0_0_10px_rgba(34,197,94,0.2)]' :
                                            campaign.status === 'PAUSED' ? 'text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30' :
                                                'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600/30'
                                        } `}>
                                        {campaign.status === 'ACTIVE' ? 'ACTIVE' : campaign.status === 'PAUSED' ? 'EN PAUSE' : 'TERMINÉE'}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => openModal(campaign)} className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded">
                                        <Edit size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(campaign.id)} className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-500 transition-colors p-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded">
                                        <Trash size={16} />
                                    </button>
                                </div>
                            </div>

                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 line-clamp-2 min-h-[2.5rem] font-mono">
                                {campaign.description || "AUCUNE_DESCRIPTION_DISPONIBLE"}
                            </p>

                            <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/5">
                                <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                                    <Target size={14} className="text-red-600/70 dark:text-red-500/70" />
                                    <span>{campaign._count?.contacts || 0} CIBLES</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                                    <Users size={14} className="text-red-600/70 dark:text-red-500/70" />
                                    <span>{campaign._count?.users || 0} AGENTS</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-lg overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-white dark:bg-[#0A0A0C] transition-colors">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-widest">
                                {formData.id ? 'Modifier Campagne' : 'Nouvelle Campagne'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Nom de la campagne</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 outline-none text-gray-900 dark:text-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-700 text-sm font-mono transition-colors"
                                    placeholder="EX: CAMPAGNE_Q1_2024"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 outline-none text-gray-900 dark:text-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-700 text-sm font-mono min-h-[80px] transition-colors"
                                    placeholder="Objectifs et détails..."
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Statut</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 outline-none text-gray-900 dark:text-gray-300 text-sm font-mono transition-colors"
                                >
                                    <option value="ACTIVE">ACTIVE</option>
                                    <option value="PAUSED">EN PAUSE</option>
                                    <option value="COMPLETED">TERMINÉE</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Agents Assignés</label>
                                <div className="max-h-40 overflow-y-auto custom-scrollbar border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-[#050507]/50 p-2 space-y-1">
                                    {users.map(user => (
                                        <div
                                            key={user.id}
                                            onClick={() => toggleUserSelection(user.id)}
                                            className={`flex items-center p-2 rounded cursor-pointer transition-colors border border-transparent ${formData.userIds.includes(user.id)
                                                ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-gray-900 dark:text-white'
                                                : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400'
                                                } `}
                                        >
                                            <div className={`w-3 h-3 rounded-full mr-3 border ${formData.userIds.includes(user.id) ? 'bg-red-600 dark:bg-red-500 border-red-600 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'} `} />
                                            <span className="text-xs font-mono">{user.name}</span>
                                            <span className="ml-auto text-[10px] opacity-50 uppercase">{user.role}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                >
                                    {formData.id ? 'Sauvegarder' : 'Créer Campagne'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCampaigns;
