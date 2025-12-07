import { useState, useEffect } from 'react';
import { Plus, Edit, Trash, User, Search, Shield, Database, MapPin, Users } from 'lucide-react';
import api from '../services/api';
import UserModal from '../components/UserModal';

interface User {
    id: string;
    username?: string;
    name: string;
    firstName?: string;
    lastName?: string;
    email: string;
    role: 'ADMIN' | 'AGENT' | 'COMMERCIAL' | 'SUPERVISEUR';
    phone?: string;
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    lastLogin?: string;
    zones?: { departmentCode: string }[];
    assignments?: { campaign: { name: string } }[];
    supervisedTeams?: { member: { name: string } }[];
}

const AdminUsers = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('ALL');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
            try {
                await api.delete(`/users/${id}`);
                fetchUsers();
            } catch (error) {
                console.error('Error deleting user:', error);
            }
        }
    };

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setSelectedUser(undefined);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedUser(undefined);
    };

    const handleModalSuccess = () => {
        fetchUsers();
        handleModalClose();
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;

        return matchesSearch && matchesRole;
    });

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight uppercase">Utilisateurs <span className="text-red-600">.</span></h1>
                    <p className="text-gray-500 text-sm font-mono mt-1">GESTION_ACCÈS_SYSTÈME</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto flex-wrap">
                    <div className="relative flex-1 md:w-48">
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="w-full pl-3 pr-8 py-2 bg-white dark:bg-[#0E0E11]/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 outline-none text-gray-900 dark:text-gray-300 text-sm font-mono appearance-none cursor-pointer"
                        >
                            <option value="ALL">Tous les rôles</option>
                            <option value="AGENT">Agents</option>
                            <option value="COMMERCIAL">Commerciaux</option>
                            <option value="SUPERVISEUR">Superviseurs</option>
                            <option value="ADMIN">Admins</option>
                        </select>
                    </div>

                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" size={16} />
                        <input
                            type="text"
                            placeholder="RECHERCHER..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#0E0E11]/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 outline-none text-gray-900 dark:text-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-700 text-sm font-mono transition-colors"
                        />
                    </div>
                    <button
                        onClick={handleCreate}
                        className="btn-primary flex items-center gap-2 whitespace-nowrap"
                    >
                        <Plus size={16} />
                        <span>Nouvel Utilisateur</span>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="text-gray-500 font-mono animate-pulse">CHARGEMENT_UTILISATEURS...</div>
                </div>
            ) : (
                <div className="bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-xl overflow-hidden transition-colors">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest">Utilisateur</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest">Rôle</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest">Assignations</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest text-center">Statut</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest text-right">Actions</th>
                                </tr >
                            </thead >
                            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-white border border-gray-200 dark:border-white/10">
                                                    {user.firstName ? user.firstName.charAt(0) : user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">{user.name}</div>
                                                    <div className="text-[10px] text-gray-500 font-mono flex items-center gap-2">
                                                        <span>ID: {user.id.substring(0, 8)}</span>
                                                        {user.username && <span className="bg-gray-100 dark:bg-white/10 px-1 rounded">@{user.username}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Shield size={12} className={
                                                    user.role === 'ADMIN' ? 'text-red-600' :
                                                        user.role === 'SUPERVISEUR' ? 'text-purple-600' :
                                                            user.role === 'COMMERCIAL' ? 'text-blue-600' : 'text-gray-600'
                                                } />
                                                <span className={`text-xs font-mono font-bold ${user.role === 'ADMIN' ? 'text-red-600' :
                                                    user.role === 'SUPERVISEUR' ? 'text-purple-600' :
                                                        user.role === 'COMMERCIAL' ? 'text-blue-600' : 'text-gray-600'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                {user.role === 'ADMIN' && <span className="text-xs text-gray-400 italic">Accès complet</span>}

                                                {user.assignments && user.assignments.length > 0 && (
                                                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                                        <Database size={12} />
                                                        <span className="truncate max-w-[150px]">{user.assignments.map(a => a.campaign.name).join(', ')}</span>
                                                    </div>
                                                )}

                                                {user.zones && user.zones.length > 0 && (
                                                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                                        <MapPin size={12} />
                                                        <span className="truncate max-w-[150px]">{user.zones.map(z => z.departmentCode).join(', ')}</span>
                                                    </div>
                                                )}

                                                {user.supervisedTeams && user.supervisedTeams.length > 0 && (
                                                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                                        <Users size={12} />
                                                        <span>{user.supervisedTeams.length} membres</span>
                                                    </div>
                                                )}

                                                {!user.assignments?.length && !user.zones?.length && !user.supervisedTeams?.length && user.role !== 'ADMIN' && (
                                                    <span className="text-xs text-gray-400">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${user.status === 'ACTIVE'
                                                ? 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/20'
                                                : user.status === 'SUSPENDED'
                                                    ? 'bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20'
                                                    : 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'
                                                }`}>
                                                {user.status === 'ACTIVE' ? 'ACTIF' : user.status === 'SUSPENDED' ? 'SUSPENDU' : 'INACTIF'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
                                                >
                                                    <Trash size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table >
                    </div >
                </div >
            )}

            <UserModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onSuccess={handleModalSuccess}
                userToEdit={selectedUser as any} // Cast needed because of interface mismatch with Modal props if strict
            />
        </div >
    );
};

export default AdminUsers;
