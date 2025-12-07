import { useState, useEffect } from 'react';
import { X, User, Mail, Lock as LockIcon, Phone, Shield, MapPin, Database, Users, Briefcase, CheckSquare, Square } from 'lucide-react';
import api from '../services/api';

interface UserData {
    id?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    name?: string; // Legacy support
    email: string;
    password?: string;
    role: 'ADMIN' | 'AGENT' | 'COMMERCIAL' | 'SUPERVISEUR';
    phone?: string;
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    forcePasswordChange?: boolean;
    quotaDaily?: number;
    assignmentMode?: 'AUTO' | 'MANUAL';
    zones?: { departmentCode: string }[];
    assignments?: { campaignId: string; databaseId?: string }[];
    supervisedTeams?: { memberId: string }[];
}

interface UserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userToEdit?: UserData;
}

const DEPARTMENTS = [
    { code: '75', name: 'Paris' },
    { code: '92', name: 'Hauts-de-Seine' },
    { code: '93', name: 'Seine-Saint-Denis' },
    { code: '94', name: 'Val-de-Marne' },
    { code: '77', name: 'Seine-et-Marne' },
    { code: '78', name: 'Yvelines' },
    { code: '91', name: 'Essonne' },
    { code: '95', name: 'Val-d\'Oise' },
];

const UserModal = ({ isOpen, onClose, onSuccess, userToEdit }: UserModalProps) => {
    const [formData, setFormData] = useState<UserData>({
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        password: '',
        role: 'AGENT',
        phone: '',
        status: 'ACTIVE',
        forcePasswordChange: true,
        quotaDaily: 50,
        assignmentMode: 'AUTO',
        zones: [],
        assignments: [],
        supervisedTeams: []
    });

    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [databases, setDatabases] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'info' | 'auth' | 'role' | 'assign'>('info');

    // Helper to split name if needed
    const splitName = (fullName: string) => {
        const parts = fullName.split(' ');
        return {
            firstName: parts[0] || '',
            lastName: parts.slice(1).join(' ') || ''
        };
    };

    useEffect(() => {
        if (isOpen) {
            fetchDependencies();
            if (userToEdit) {
                const { firstName, lastName } = userToEdit.firstName ? userToEdit : splitName(userToEdit.name || '');
                setFormData({
                    ...userToEdit,
                    firstName,
                    lastName,
                    password: '', // Don't show password
                    zones: userToEdit.zones || [],
                    assignments: userToEdit.assignments || [],
                    supervisedTeams: userToEdit.supervisedTeams || []
                });
            } else {
                setFormData({
                    firstName: '',
                    lastName: '',
                    username: '',
                    email: '',
                    password: '',
                    role: 'AGENT',
                    phone: '',
                    status: 'ACTIVE',
                    forcePasswordChange: true,
                    quotaDaily: 50,
                    assignmentMode: 'AUTO',
                    zones: [],
                    assignments: [],
                    supervisedTeams: []
                });
            }
            setError('');
            setActiveTab('info');
        }
    }, [userToEdit, isOpen]);

    const fetchDependencies = async () => {
        try {
            const [campaignsRes, databasesRes, usersRes] = await Promise.all([
                api.get('/campaigns'),
                api.get('/databases'), // Assuming this endpoint exists
                api.get('/users')
            ]);
            setCampaigns(campaignsRes.data);
            setDatabases(databasesRes.data);
            setUsers(usersRes.data);
        } catch (err) {
            console.error('Error fetching dependencies:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Prepare payload
            const payload = {
                ...formData,
                zones: formData.zones?.map(z => z.departmentCode || z), // Handle both object and string if needed
                assignments: formData.assignments,
                supervisedUserIds: formData.supervisedTeams?.map(t => t.memberId || t)
            };

            if (!payload.password) delete payload.password;

            if (userToEdit?.id) {
                await api.put(`/users/${userToEdit.id}`, payload);
            } else {
                await api.post('/users', payload);
            }
            onSuccess();
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || "Une erreur est survenue");
        } finally {
            setLoading(false);
        }
    };

    const handleZoneToggle = (code: string) => {
        const currentZones = formData.zones || [];
        const exists = currentZones.some((z: any) => (z.departmentCode || z) === code);
        let newZones;
        if (exists) {
            newZones = currentZones.filter((z: any) => (z.departmentCode || z) !== code);
        } else {
            newZones = [...currentZones, { departmentCode: code }];
        }
        setFormData({ ...formData, zones: newZones });
    };

    const handleAssignmentChange = (campaignId: string, databaseId: string | undefined, checked: boolean) => {
        let newAssignments = [...(formData.assignments || [])];

        if (checked) {
            // Add or update
            const existingIndex = newAssignments.findIndex(a => a.campaignId === campaignId);
            if (existingIndex >= 0) {
                newAssignments[existingIndex] = { campaignId, databaseId };
            } else {
                newAssignments.push({ campaignId, databaseId });
            }
        } else {
            // Remove
            newAssignments = newAssignments.filter(a => a.campaignId !== campaignId);
        }
        setFormData({ ...formData, assignments: newAssignments });
    };

    const handleSupervisionToggle = (userId: string) => {
        const currentTeam = formData.supervisedTeams || [];
        const exists = currentTeam.some((m: any) => (m.memberId || m) === userId);
        let newTeam;
        if (exists) {
            newTeam = currentTeam.filter((m: any) => (m.memberId || m) !== userId);
        } else {
            newTeam = [...currentTeam, { memberId: userId }];
        }
        setFormData({ ...formData, supervisedTeams: newTeam });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-4xl h-[90vh] overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-white dark:bg-[#0A0A0C] transition-colors flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex justify-between items-center shrink-0">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        {userToEdit ? <><User size={20} /> Modifier Utilisateur</> : <><User size={20} /> Nouvel Utilisateur</>}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-white/10 shrink-0 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'info' ? 'text-red-600 border-b-2 border-red-600 bg-red-50/50 dark:bg-red-900/10' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                    >
                        1. Informations
                    </button>
                    <button
                        onClick={() => setActiveTab('auth')}
                        className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'auth' ? 'text-red-600 border-b-2 border-red-600 bg-red-50/50 dark:bg-red-900/10' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                    >
                        2. Authentification
                    </button>
                    <button
                        onClick={() => setActiveTab('role')}
                        className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'role' ? 'text-red-600 border-b-2 border-red-600 bg-red-50/50 dark:bg-red-900/10' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                    >
                        3. Rôle & Permissions
                    </button>
                    <button
                        onClick={() => setActiveTab('assign')}
                        className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'assign' ? 'text-red-600 border-b-2 border-red-600 bg-red-50/50 dark:bg-red-900/10' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                    >
                        4. Assignations
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <form id="userForm" onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-mono flex items-center gap-3">
                                <Shield size={16} />
                                {error}
                            </div>
                        )}

                        {/* STEP 1: INFO */}
                        {activeTab === 'info' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Prénom *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.firstName}
                                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                                            placeholder="Ex: Jean"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Nom *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.lastName}
                                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                                            placeholder="Ex: Dupont"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Email *</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-3.5 text-gray-400" size={18} />
                                        <input
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                                            placeholder="jean.dupont@entreprise.com"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Téléphone</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-3.5 text-gray-400" size={18} />
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                                            placeholder="06 12 34 56 78"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: AUTH */}
                        {activeTab === 'auth' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Nom d'utilisateur *</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-3.5 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            required
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                                            placeholder="jdupont"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                        {userToEdit ? 'Nouveau Mot de passe (Laisser vide pour conserver)' : 'Mot de passe *'}
                                    </label>
                                    <div className="relative">
                                        <LockIcon className="absolute left-4 top-3.5 text-gray-400" size={18} />
                                        <input
                                            type="password"
                                            required={!userToEdit}
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                                    <input
                                        type="checkbox"
                                        id="forceChange"
                                        checked={formData.forcePasswordChange}
                                        onChange={(e) => setFormData({ ...formData, forcePasswordChange: e.target.checked })}
                                        className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                    />
                                    <label htmlFor="forceChange" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                                        Forcer le changement de mot de passe à la prochaine connexion
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: ROLE */}
                        {activeTab === 'role' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { id: 'AGENT', label: 'Agent', icon: <Phone size={24} />, desc: 'Téléprospecteur, accès limité aux contacts assignés.' },
                                        { id: 'COMMERCIAL', label: 'Commercial', icon: <Briefcase size={24} />, desc: 'Accès uniquement à l\'agenda et ses RDV.' },
                                        { id: 'SUPERVISEUR', label: 'Superviseur', icon: <Users size={24} />, desc: 'Gestion d\'équipe et reporting.' },
                                        { id: 'ADMIN', label: 'Administrateur', icon: <Shield size={24} />, desc: 'Accès complet au système.' },
                                    ].map((roleOption) => (
                                        <div
                                            key={roleOption.id}
                                            onClick={() => setFormData({ ...formData, role: roleOption.id as any })}
                                            className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${formData.role === roleOption.id
                                                ? 'border-red-600 bg-red-50 dark:bg-red-900/20'
                                                : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className={formData.role === roleOption.id ? 'text-red-600' : 'text-gray-400'}>
                                                    {roleOption.icon}
                                                </div>
                                                <div className={`font-bold ${formData.role === roleOption.id ? 'text-red-900 dark:text-red-100' : 'text-gray-900 dark:text-white'}`}>
                                                    {roleOption.label}
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                                {roleOption.desc}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Statut du compte</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                                    >
                                        <option value="ACTIVE">Actif</option>
                                        <option value="INACTIVE">Inactif</option>
                                        <option value="SUSPENDED">Suspendu</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* STEP 4: ASSIGNMENTS */}
                        {activeTab === 'assign' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                {formData.role === 'ADMIN' && (
                                    <div className="p-6 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/20 rounded-xl flex items-center gap-4">
                                        <Shield className="text-green-600" size={32} />
                                        <div>
                                            <div className="font-bold text-green-900 dark:text-green-100">Accès Complet</div>
                                            <div className="text-sm text-green-700 dark:text-green-300">Les administrateurs ont accès à toutes les campagnes, bases de données et utilisateurs par défaut.</div>
                                        </div>
                                    </div>
                                )}

                                {(formData.role === 'AGENT' || formData.role === 'COMMERCIAL') && (
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 border-b border-gray-200 dark:border-white/10 pb-2">
                                            <Database size={16} /> Campagnes & Bases
                                        </h3>
                                        <div className="grid gap-4">
                                            {campaigns.map(campaign => (
                                                <div key={campaign.id} className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="font-bold">{campaign.name}</div>
                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only peer"
                                                                checked={formData.assignments?.some(a => a.campaignId === campaign.id)}
                                                                onChange={(e) => handleAssignmentChange(campaign.id, undefined, e.target.checked)}
                                                            />
                                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
                                                        </label>
                                                    </div>

                                                    {formData.role === 'AGENT' && formData.assignments?.some(a => a.campaignId === campaign.id) && (
                                                        <div className="mt-3 pl-4 border-l-2 border-gray-200 dark:border-white/10">
                                                            <label className="block text-xs font-bold text-gray-500 mb-1">Base de données assignée</label>
                                                            <select
                                                                className="w-full p-2 rounded border border-gray-200 dark:border-white/10 bg-white dark:bg-black text-sm"
                                                                value={formData.assignments?.find(a => a.campaignId === campaign.id)?.databaseId || ''}
                                                                onChange={(e) => handleAssignmentChange(campaign.id, e.target.value, true)}
                                                            >
                                                                <option value="">Sélectionner une base...</option>
                                                                {databases.filter(db => db.isActive).map(db => (
                                                                    <option key={db.id} value={db.id}>{db.name || db.filename}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {formData.role === 'COMMERCIAL' && (
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 border-b border-gray-200 dark:border-white/10 pb-2">
                                            <MapPin size={16} /> Zones Géographiques
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {DEPARTMENTS.map(dept => (
                                                <div
                                                    key={dept.code}
                                                    onClick={() => handleZoneToggle(dept.code)}
                                                    className={`cursor-pointer p-3 rounded-lg border text-sm flex items-center gap-2 transition-all ${formData.zones?.some((z: any) => (z.departmentCode || z) === dept.code)
                                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                                                        : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-gray-300'
                                                        }`}
                                                >
                                                    {formData.zones?.some((z: any) => (z.departmentCode || z) === dept.code)
                                                        ? <CheckSquare size={16} />
                                                        : <Square size={16} />}
                                                    <span className="font-mono font-bold">{dept.code}</span>
                                                    <span className="truncate">{dept.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {formData.role === 'SUPERVISEUR' && (
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 border-b border-gray-200 dark:border-white/10 pb-2">
                                            <Users size={16} /> Équipe Supervisée
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
                                            {users.filter(u => u.role !== 'ADMIN' && u.id !== userToEdit?.id).map(user => (
                                                <div
                                                    key={user.id}
                                                    onClick={() => handleSupervisionToggle(user.id)}
                                                    className={`cursor-pointer p-3 rounded-lg border text-sm flex items-center gap-3 transition-all ${formData.supervisedTeams?.some((m: any) => (m.memberId || m) === user.id)
                                                        ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300'
                                                        : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-gray-300'
                                                        }`}
                                                >
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${formData.supervisedTeams?.some((m: any) => (m.memberId || m) === user.id)
                                                        ? 'bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-100'
                                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                                        }`}>
                                                        {user.name?.charAt(0) || user.email.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold">{user.name || user.email}</div>
                                                        <div className="text-xs opacity-70">{user.role}</div>
                                                    </div>
                                                    {formData.supervisedTeams?.some((m: any) => (m.memberId || m) === user.id) && (
                                                        <CheckSquare size={16} className="ml-auto" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex justify-between items-center shrink-0">
                    <div className="text-xs text-gray-400">
                        {activeTab === 'info' && 'Étape 1/4'}
                        {activeTab === 'auth' && 'Étape 2/4'}
                        {activeTab === 'role' && 'Étape 3/4'}
                        {activeTab === 'assign' && 'Étape 4/4'}
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors text-sm font-bold uppercase tracking-wider"
                        >
                            Annuler
                        </button>
                        {activeTab !== 'assign' ? (
                            <button
                                type="button"
                                onClick={() => {
                                    if (activeTab === 'info') setActiveTab('auth');
                                    else if (activeTab === 'auth') setActiveTab('role');
                                    else if (activeTab === 'role') setActiveTab('assign');
                                }}
                                className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                            >
                                Suivant
                            </button>
                        ) : (
                            <button
                                type="submit"
                                form="userForm"
                                disabled={loading}
                                className="btn-primary px-8 py-2.5 rounded-xl"
                            >
                                {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserModal;
