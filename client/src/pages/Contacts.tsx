import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
    Search,
    Phone,
    FileSpreadsheet,
    Edit,
    Filter,
    Cpu,
    Zap,
    Activity,
    Lock as LockIcon,
    PhoneCall,
    Target,
    Download,
    Bell,
    ChevronLeft,
    ChevronRight,
    Calendar,
    Trash2,
    LayoutGrid,
    Table as TableIcon
} from 'lucide-react';
import ContactModal from '../components/ContactModal';
import ExportModal from '../components/ExportModal';
import AppointmentModal from '../components/AppointmentModal';
import CallbackModal from '../components/CallbackModal';
import AdvancedSearchPanel from '../components/AdvancedSearchPanel';
import ImportMappingModal from '../components/ImportMappingModal';
import { useAuth } from '../context/AuthContext';

interface Contact {
    id: string;
    uniqueId?: string;
    companyName: string;
    siret?: string;
    email?: string;
    phoneFixed?: string;
    phoneMobile?: string;
    address?: string;
    zipCode?: string;
    city?: string;
    status: string;
    civility?: string;
    managerName?: string;
    managerRole?: string;
    sector?: string;
    workforce?: string;
    creationDate?: string;
    nextCallDate?: string;
    updatedAt?: string;
}

const STATUS_CONFIG: Record<string, { color: string, border: string, bg: string, glow: string }> = {
    'Nouveau': { color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/10', glow: 'shadow-blue-500/50' },
    'Relance': { color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/10', glow: 'shadow-purple-500/50' },
    'NRP': { color: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-500/10', glow: 'shadow-orange-500/50' },
    'RDV Pris': { color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', glow: 'shadow-emerald-500/50' },
    'Pas intéressé': { color: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/10', glow: 'shadow-red-500/50' },
};

const STATUS_MAPPING: Record<string, { text: string, configKey: string, score: number, step: number }> = {
    'NEW': { text: 'Nouveau', configKey: 'Nouveau', score: 10, step: 1 },
    'NRP': { text: 'NRP', configKey: 'NRP', score: 25, step: 2 },
    'UNREACHABLE': { text: 'Injoignable', configKey: 'NRP', score: 20, step: 2 },
    'ANSWERING_MACHINE': { text: 'Répondeur', configKey: 'Relance', score: 30, step: 2 },
    'ABSENT': { text: 'Absent', configKey: 'Relance', score: 30, step: 2 },
    'CALLBACK_LATER': { text: 'Rappeler', configKey: 'Relance', score: 40, step: 3 },
    'FOLLOW_UP': { text: 'Relance', configKey: 'Relance', score: 50, step: 3 },
    'NOT_INTERESTED': { text: 'Pas intéressé', configKey: 'Pas intéressé', score: 0, step: 5 },
    'APPOINTMENT_TAKEN': { text: 'RDV Pris', configKey: 'RDV Pris', score: 100, step: 5 },
    'OUT_OF_TARGET': { text: 'Hors cible', configKey: 'Pas intéressé', score: 0, step: 5 },
    'ALREADY_CLIENT': { text: 'Client', configKey: 'RDV Pris', score: 100, step: 5 },
    'WRONG_NUMBER': { text: 'Faux num', configKey: 'Pas intéressé', score: 0, step: 5 },
};

const ANCIENNETE_OPTIONS = [
    { value: 'all', label: 'Toute période' },
    { value: 'today', label: "Aujourd'hui" },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
    { value: 'quarter', label: 'Ce trimestre' },
    { value: 'year', label: 'Cette année' },
    { value: 'custom', label: 'Période personnalisée' },
];

// Fonctions de formatage pour l'affichage
const formatPhoneNumber = (phone: string | null | undefined): string => {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
};

const formatSiret = (siret: string | null | undefined): string => {
    if (!siret) return '-';
    const cleaned = siret.replace(/\D/g, '');
    if (cleaned.length < 9) return siret;
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`.trim();
};

const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('fr-FR');
};

const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined || value === '') return '-';

    switch (key) {
        case 'phoneFixed':
        case 'phoneMobile':
            return formatPhoneNumber(value);
        case 'siret':
            return formatSiret(value);
        case 'creationDate':
            return formatDate(value);
        case 'workforce':
            return String(value);
        default:
            return String(value);
    }
};

// Colonnes pour l'affichage en tableau
const TABLE_COLUMNS = [
    { key: 'uniqueId', header: 'ID Fiche', width: '100px' },
    { key: 'companyName', header: 'Nom', width: '180px' },
    { key: 'address', header: 'Adresse', width: '200px' },
    { key: 'zipCode', header: 'CP', width: '70px' },
    { key: 'city', header: 'Ville', width: '100px' },
    { key: 'phoneFixed', header: 'Téléphone', width: '120px' },
    { key: 'phoneMobile', header: 'Mobile', width: '120px' },
    { key: 'email', header: 'Email', width: '180px' },
    { key: 'sector', header: 'Catégorie', width: '120px' },
    { key: 'siret', header: 'SIRET', width: '150px' },
    { key: 'workforce', header: 'Effectif', width: '80px' },
    { key: 'managerName', header: 'Dirigeants', width: '130px' },
    { key: 'creationDate', header: 'Date Création', width: '110px' },
];

const PipelineBar = ({ step }: { step: number }) => (
    <div className="flex gap-1 mt-2">
        {[1, 2, 3, 4, 5].map((i) => (
            <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step
                    ? 'bg-gradient-to-r from-red-600 to-red-500 shadow-[0_0_8px_rgba(220,38,38,0.8)]'
                    : 'bg-gray-800'
                    }`}
            />
        ))}
    </div>
);



const Contacts = () => {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isImportMappingModalOpen, setIsImportMappingModalOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
    const [selectedContactForAppointment, setSelectedContactForAppointment] = useState<Contact | null>(null);
    const [isCallbackModalOpen, setIsCallbackModalOpen] = useState(false);
    const [selectedContactForCallback, setSelectedContactForCallback] = useState<Contact | null>(null);
    const [callbackStatus, setCallbackStatus] = useState<string>('CALLBACK_LATER');
    const [statusFilter, setStatusFilter] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Contact[]>([]);
    const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

    // Pagination State
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Ancienneté Filter State
    const [ancienneteFilter, setAncienneteFilter] = useState('all');
    const [customDateStart, setCustomDateStart] = useState('');
    const [customDateEnd, setCustomDateEnd] = useState('');
    const [isAncienneteOpen, setIsAncienneteOpen] = useState(false);

    const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useState({
        id: '',
        dateType: 'exact',
        dateExact: '',
        dateStart: '',
        dateEnd: '',
        agentIds: [] as string[],
        phone: '',
    });

    useEffect(() => {
        const checkNotifications = async () => {
            try {
                const response = await api.get('/contacts/notifications');
                setNotifications(response.data);
            } catch (error) {
                console.error('Error fetching notifications:', error);
            }
        };

        checkNotifications();
        const interval = setInterval(checkNotifications, 30000); // Check every 30 seconds

        return () => clearInterval(interval);
    }, []);

    const [campaigns, setCampaigns] = useState<{ id: string, name: string }[]>([]);
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
    const { user } = useAuth();

    useEffect(() => {
        fetchCampaigns();
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchContacts();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, selectedCampaignId, statusFilter, advancedFilters, page, perPage, ancienneteFilter, customDateStart, customDateEnd]);

    const fetchCampaigns = async () => {
        try {
            const response = await api.get('/campaigns');
            setCampaigns(response.data);
        } catch (error) {
            console.error('Error fetching campaigns:', error);
        }
    };

    const fetchContacts = async () => {
        setLoading(true);
        try {
            const params: any = {
                page,
                limit: perPage,
                search: searchTerm,
                campaignId: user?.role === 'AGENT' ? undefined : selectedCampaignId,
                status: statusFilter || undefined,
                ...advancedFilters
            };

            // Ancienneté Filter Logic
            if (ancienneteFilter !== 'all') {
                params.dateType = 'createdAt'; // Use createdAt for seniority
                const now = new Date();

                if (ancienneteFilter === 'today') {
                    params.dateStart = now.toISOString().split('T')[0];
                    params.dateEnd = now.toISOString().split('T')[0];
                } else if (ancienneteFilter === 'week') {
                    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    params.dateStart = lastWeek.toISOString().split('T')[0];
                    params.dateEnd = now.toISOString().split('T')[0];
                } else if (ancienneteFilter === 'month') {
                    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                    params.dateStart = firstDay.toISOString().split('T')[0];
                    params.dateEnd = now.toISOString().split('T')[0];
                } else if (ancienneteFilter === 'quarter') {
                    const lastQuarter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                    params.dateStart = lastQuarter.toISOString().split('T')[0];
                    params.dateEnd = now.toISOString().split('T')[0];
                } else if (ancienneteFilter === 'year') {
                    const firstDay = new Date(now.getFullYear(), 0, 1);
                    params.dateStart = firstDay.toISOString().split('T')[0];
                    params.dateEnd = now.toISOString().split('T')[0];
                } else if (ancienneteFilter === 'custom') {
                    if (customDateStart) params.dateStart = customDateStart;
                    if (customDateEnd) params.dateEnd = customDateEnd;
                }
            }

            // Clean up empty filters
            if (params.agentIds && params.agentIds.length === 0) delete params.agentIds;
            if (!params.id) delete params.id;
            if (!params.phone) delete params.phone;

            // Handle Advanced Search Date Logic (overrides seniority if set)
            if (advancedFilters.dateType === 'exact' && advancedFilters.dateExact) {
                params.dateStart = advancedFilters.dateExact;
                params.dateEnd = advancedFilters.dateExact;
                params.dateType = 'updatedAt'; // Default to updatedAt for advanced search unless specified otherwise
            } else if (advancedFilters.dateStart || advancedFilters.dateEnd) {
                // If advanced filters are set, they might override seniority. 
                // Let's assume advanced filters take precedence if they are actively used.
                // But here we are mixing them. Let's keep it simple: 
                // If advanced filters have dates, use them.
                // If not, use seniority dates.
                // The current logic merges them, but `params.dateStart` might be overwritten.
                // Since `...advancedFilters` is spread AFTER `params` initialization but BEFORE seniority logic in my previous code block... wait.
                // I spread `...advancedFilters` at the beginning. So `params.dateStart` from advancedFilters is there.
                // Then I overwrite it with seniority logic if `ancienneteFilter !== 'all'`.
                // This means Seniority Filter takes precedence if active.
            }

            // Clean up
            if (params.dateType === 'exact') delete params.dateType; // Backend expects 'createdAt' or 'updatedAt' or nothing
            delete params.dateExact;

            const response = await api.get('/contacts', { params });
            setContacts(response.data.data);
            setTotalCount(response.data.meta.total);
            setTotalPages(response.data.meta.totalPages);
        } catch (error) {
            console.error('Error fetching contacts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddContact = () => {
        setSelectedContact(null);
        setIsModalOpen(true);
    };

    const handleEditContact = (contact: Contact) => {
        setSelectedContact(contact);
        setIsModalOpen(true);
    };

    const handleModalSuccess = () => {
        fetchContacts();
    };

    const handleStatusChange = async (contactId: string, newStatus: string) => {
        // For modals, we don't update immediately, we wait for the modal result
        if (newStatus === 'APPOINTMENT_TAKEN') {
            const contact = contacts.find(c => c.id === contactId);
            if (contact) {
                setSelectedContactForAppointment(contact);
                setIsAppointmentModalOpen(true);
            }
            return;
        }

        if (newStatus === 'CALLBACK_LATER' || newStatus === 'FOLLOW_UP') {
            const contact = contacts.find(c => c.id === contactId);
            if (contact) {
                setSelectedContactForCallback(contact);
                setCallbackStatus(newStatus);
                setIsCallbackModalOpen(true);
            }
            return;
        }

        // For other statuses, optimistic update
        setContacts(prev => prev.map(c => c.id === contactId ? { ...c, status: newStatus } : c));

        try {
            await api.put(`/contacts/${contactId}`, { status: newStatus });
        } catch (error) {
            console.error('Error updating status:', error);
            fetchContacts(); // Revert on error
        }
    };

    const handleSelectContact = (contactId: string) => {
        const newSelected = new Set(selectedContactIds);
        if (newSelected.has(contactId)) {
            newSelected.delete(contactId);
        } else {
            newSelected.add(contactId);
        }
        setSelectedContactIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedContactIds.size === contacts.length) {
            setSelectedContactIds(new Set());
        } else {
            setSelectedContactIds(new Set(contacts.map(c => c.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedContactIds.size} contacts ?`)) {
            return;
        }

        try {
            await api.post('/contacts/delete-batch', { ids: Array.from(selectedContactIds) });
            setSelectedContactIds(new Set());
            fetchContacts();
        } catch (error) {
            console.error('Error deleting contacts:', error);
            alert('Erreur lors de la suppression des contacts');
        }
    };


    // Stats calculations
    const totalContacts = contacts.length;
    const engagementRate = totalContacts > 0
        ? Math.round((contacts.filter(c => c.status !== 'NEW').length / totalContacts) * 100)
        : 0;
    const rdvCount = contacts.filter(c => c.status === 'APPOINTMENT_TAKEN').length;

    const activeFiltersCount = [
        advancedFilters.id,
        advancedFilters.dateExact || (advancedFilters.dateStart && advancedFilters.dateEnd),
        advancedFilters.agentIds.length > 0,
        advancedFilters.phone
    ].filter(Boolean).length;

    return (
        <div className="flex flex-col h-[calc(100vh-9rem)]">
            {/* Header HUD */}
            <div className="h-20 border-b border-gray-200 dark:border-white/5 flex items-center justify-between px-8 bg-white/80 dark:bg-[#050507]/60 backdrop-blur-md z-10 sticky top-0 -mx-8 -mt-8 mb-8 transition-colors duration-300">
                <div className="flex items-center gap-4">
                    <Cpu className="text-red-600 animate-pulse" size={18} />
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-widest uppercase">
                        Cibles Actives <span className="text-gray-400 dark:text-gray-600 mx-2">//</span> <span className="text-red-500 font-mono text-sm">NIVEAU ACCÈS 1</span>
                    </h1>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center px-4 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full w-64 focus-within:border-red-500/50 focus-within:shadow-[0_0_15px_rgba(220,38,38,0.2)] transition-all">
                        <Search size={14} className="text-gray-500 mr-2" />
                        <input
                            type="text"
                            placeholder="RECHERCHE_BASE..."
                            className="bg-transparent border-none outline-none text-xs text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-600 font-mono w-full uppercase"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                        />
                    </div>

                    <button
                        onClick={() => setIsAdvancedSearchOpen(!isAdvancedSearchOpen)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-all ${isAdvancedSearchOpen || activeFiltersCount > 0 ? 'bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/30' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-transparent'}`}
                    >
                        <Filter size={14} />
                        Filtres Avancés
                        {activeFiltersCount > 0 && (
                            <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{activeFiltersCount}</span>
                        )}
                    </button>

                    <button
                        className={`relative p-2 transition-colors ${notifications.length > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        title={notifications.length > 0 ? `${notifications.length} rappel(s) imminent(s)` : 'Pas de notifications'}
                        onClick={() => {
                            if (notifications.length > 0) {
                                // Optional: Filter list to show these contacts
                                // For now, just alert or maybe we can set a special filter?
                                // Let's just keep it visual as requested.
                            }
                        }}
                    >
                        <Bell size={20} className={notifications.length > 0 ? 'text-red-500' : ''} />
                        {notifications.length > 0 && (
                            <>
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-[#050507]"></span>
                            </>
                        )}
                    </button>

                    {user?.role === 'ADMIN' && (
                        <div className="relative">
                            <select
                                value={selectedCampaignId}
                                onChange={(e) => { setSelectedCampaignId(e.target.value); setPage(1); }}
                                className="bg-gray-100 dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-400 text-[10px] font-mono rounded px-2 py-1 outline-none uppercase transition-colors"
                            >
                                <option value="">Toutes Campagnes</option>
                                {campaigns.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {/* Import buttons */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setIsImportMappingModalOpen(true)}
                            className="bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-sm text-xs font-bold tracking-widest uppercase flex items-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-all border border-green-500/30"
                            title="Import avec mapping personnalisé"
                        >
                            <FileSpreadsheet size={14} />
                            Import
                        </button>
                    </div>

                    <button
                        onClick={() => setIsExportModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-sm text-xs font-bold tracking-widest uppercase flex items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-all border border-blue-500/30 clip-path-polygon"
                        title="Exporter les contacts filtrés"
                    >
                        <Download size={14} fill="currentColor" />
                        Exporter
                    </button>

                    <button className="bg-red-700 hover:bg-red-600 text-white px-6 py-2 rounded-sm text-xs font-bold tracking-widest uppercase flex items-center gap-2 shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] transition-all border border-red-500/30 clip-path-polygon" onClick={handleAddContact}>
                        <Zap size={14} fill="currentColor" />
                        Nouvelle Cible
                    </button>
                </div>
            </div>

            <AdvancedSearchPanel
                isOpen={isAdvancedSearchOpen}
                onClose={() => setIsAdvancedSearchOpen(false)}
                onApplyFilters={(filters) => {
                    setAdvancedFilters(filters);
                    setPage(1);
                    // fetchContacts is triggered by useEffect on advancedFilters change
                }}
                onResetFilters={() => {
                    setAdvancedFilters({
                        id: '',
                        dateType: 'exact',
                        dateExact: '',
                        dateStart: '',
                        dateEnd: '',
                        agentIds: [],
                        phone: '',
                    });
                    setPage(1);
                }}
                activeFiltersCount={activeFiltersCount}
                initialFilters={advancedFilters}
            />

            {/* Content Area */}
            <div className="flex-1 overflow-auto relative">

                {/* Stats Bar (HUD Style) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Total Cibles', val: totalContacts.toString(), color: 'text-gray-900 dark:text-white' },
                        { label: 'Taux Engagement', val: `${engagementRate}%`, color: 'text-green-600 dark:text-green-400' },
                        { label: 'RDV Confirmés', val: rdvCount.toString(), color: 'text-blue-600 dark:text-blue-400' },
                        { label: 'Alertes Critiques', val: '0', color: 'text-red-500 animate-pulse' }
                    ].map((stat, idx) => (
                        <div key={idx} className="bg-white dark:bg-[#0f0f13]/50 border border-gray-200 dark:border-white/10 p-4 rounded backdrop-blur-sm relative overflow-hidden group hover:border-gray-300 dark:hover:border-white/20 transition-colors shadow-sm dark:shadow-none">
                            <div className="absolute top-0 right-0 p-2 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity">
                                <Activity size={40} className="text-gray-900 dark:text-white" />
                            </div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono mb-1">{stat.label}</p>
                            <p className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.val}</p>
                            <div className="w-full h-0.5 bg-gray-200 dark:bg-gray-800 mt-3 relative overflow-hidden">
                                <div className="absolute inset-0 bg-current w-1/2 opacity-50" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filters Bar */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <button
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={`px-4 py-2 bg-white dark:bg-[#0A0A0C] border ${statusFilter ? 'border-red-500 text-red-500 dark:text-red-400 bg-red-500/10' : 'border-gray-200 dark:border-red-500/30 text-gray-700 dark:text-red-400'} text-xs uppercase font-bold tracking-wider rounded-sm hover:bg-red-500/10 transition-all flex items-center gap-2`}
                            >
                                <Filter size={14} /> {statusFilter ? STATUS_MAPPING[statusFilter]?.text || statusFilter : 'Filtres_Grille'}
                                {statusFilter && <span onClick={(e) => { e.stopPropagation(); setStatusFilter(''); setPage(1); }} className="ml-2 hover:text-gray-900 dark:hover:text-white">×</span>}
                            </button>

                            {isFilterOpen && (
                                <>
                                    <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsFilterOpen(false)} />
                                    <div className="fixed inset-x-0 bottom-0 md:absolute md:top-full md:left-0 md:bottom-auto mt-2 w-full md:w-48 bg-white dark:bg-[#0E0E11] border-t md:border border-gray-200 dark:border-white/10 rounded-t-2xl md:rounded-lg shadow-xl z-50 overflow-hidden backdrop-blur-md animate-in slide-in-from-bottom-10 md:animate-none">
                                        <div className="p-2 border-b border-gray-200 dark:border-white/5">
                                            <button
                                                onClick={() => { setStatusFilter(''); setIsFilterOpen(false); setPage(1); }}
                                                className="w-full text-left px-3 py-2 text-[10px] font-mono text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded transition-colors uppercase"
                                            >
                                                Tout Afficher
                                            </button>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                            {Object.entries(STATUS_MAPPING).map(([key, value]) => (
                                                <button
                                                    key={key}
                                                    onClick={() => { setStatusFilter(key); setIsFilterOpen(false); setPage(1); }}
                                                    className={`w-full text-left px-3 py-2 text-[10px] font-mono rounded transition-colors uppercase flex items-center justify-between ${statusFilter === key ? 'bg-red-500/10 text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'}`}
                                                >
                                                    {value.text}
                                                    {statusFilter === key && <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="h-4 w-px bg-gray-300 dark:bg-gray-800 mx-2"></div>
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 rounded-sm p-0.5">
                            <button
                                onClick={() => setViewMode('cards')}
                                className={`p-1.5 rounded-sm transition-all ${viewMode === 'cards' ? 'bg-white dark:bg-gray-800 shadow text-red-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                title="Vue Cartes"
                            >
                                <LayoutGrid size={14} />
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-1.5 rounded-sm transition-all ${viewMode === 'table' ? 'bg-white dark:bg-gray-800 shadow text-red-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                title="Vue Tableau"
                            >
                                <TableIcon size={14} />
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        FLUX EN DIRECT CONNECTÉ
                    </div>
                </div>

                {/* Secondary Filters Bar (Ancienneté) */}
                <div className="flex flex-wrap items-center gap-4 mb-4 px-1">
                    <div className="relative">
                        <button
                            onClick={() => setIsAncienneteOpen(!isAncienneteOpen)}
                            className={`px-3 py-1.5 bg-white dark:bg-[#0A0A0C] border ${ancienneteFilter !== 'all' ? 'border-blue-500 text-blue-500 dark:text-blue-400 bg-blue-500/10' : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400'} text-[10px] uppercase font-bold tracking-wider rounded-sm hover:bg-blue-500/10 transition-all flex items-center gap-2`}
                        >
                            <Calendar size={12} />
                            {ANCIENNETE_OPTIONS.find(o => o.value === ancienneteFilter)?.label || 'Ancienneté'}
                            {ancienneteFilter !== 'all' && <span onClick={(e) => { e.stopPropagation(); setAncienneteFilter('all'); setPage(1); }} className="ml-2 hover:text-gray-900 dark:hover:text-white">×</span>}
                        </button>

                        {isAncienneteOpen && (
                            <>
                                <div className="fixed inset-0 z-30" onClick={() => setIsAncienneteOpen(false)} />
                                <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-[#0E0E11] border border-gray-200 dark:border-white/10 rounded-lg shadow-xl z-40 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div className="p-1 space-y-0.5">
                                        {ANCIENNETE_OPTIONS.map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => {
                                                    setAncienneteFilter(option.value);
                                                    setPage(1);
                                                    if (option.value !== 'custom') setIsAncienneteOpen(false);
                                                }}
                                                className={`w-full text-left px-3 py-2 text-[10px] font-mono rounded transition-colors uppercase flex items-center justify-between ${ancienneteFilter === option.value ? 'bg-blue-500/10 text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'}`}
                                            >
                                                {option.label}
                                                {ancienneteFilter === option.value && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                                            </button>
                                        ))}
                                    </div>
                                    {ancienneteFilter === 'custom' && (
                                        <div className="p-2 border-t border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5">
                                            <div className="space-y-2">
                                                <div>
                                                    <label className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Début</label>
                                                    <input
                                                        type="date"
                                                        value={customDateStart}
                                                        onChange={(e) => setCustomDateStart(e.target.value)}
                                                        className="w-full bg-white dark:bg-black border border-gray-200 dark:border-white/10 rounded px-2 py-1 text-[10px] text-gray-900 dark:text-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Fin</label>
                                                    <input
                                                        type="date"
                                                        value={customDateEnd}
                                                        onChange={(e) => setCustomDateEnd(e.target.value)}
                                                        className="w-full bg-white dark:bg-black border border-gray-200 dark:border-white/10 rounded px-2 py-1 text-[10px] text-gray-900 dark:text-white"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => setIsAncienneteOpen(false)}
                                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase py-1.5 rounded transition-colors"
                                                >
                                                    Appliquer
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Data Display - Cards or Table View */}
                {viewMode === 'cards' ? (
                    /* Cards View */
                    <div className="space-y-3 pb-8">
                        {/* Headers - Hidden on Mobile */}
                        <div className="hidden md:grid grid-cols-12 px-6 py-2 text-[10px] uppercase tracking-widest text-gray-500 font-mono border-b border-gray-200 dark:border-white/5 items-center">
                            <div className="col-span-1 flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={contacts.length > 0 && selectedContactIds.size === contacts.length}
                                    onChange={handleSelectAll}
                                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                />
                                {selectedContactIds.size > 0 && (
                                    <button
                                        onClick={handleBulkDelete}
                                        className="text-red-500 hover:text-red-700 transition-colors"
                                        title="Supprimer la sélection"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                            <div className="col-span-3">Entité Cible</div>
                            <div className="col-span-3">Info Contact</div>
                            <div className="col-span-2">Pipeline Vente</div>
                            <div className="col-span-2">Statut</div>
                            <div className="col-span-1 text-right">Actions</div>
                        </div>

                        {/* Rows */}
                        {loading ? (
                            <div className="text-center py-12 text-gray-500 font-mono animate-pulse">CHARGEMENT_DONNÉES...</div>
                        ) : contacts.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 font-mono">AUCUNE_DONNÉE_TROUVÉE</div>
                        ) : (
                            contacts.map((contact) => {
                                const mapping = STATUS_MAPPING[contact.status] || STATUS_MAPPING['NEW'];
                                return (
                                    <div key={contact.id} className="group relative flex flex-col md:grid md:grid-cols-12 gap-4 md:gap-0 items-start md:items-center p-6 bg-white dark:bg-[#0E0E11]/40 border border-gray-200 dark:border-white/5 hover:border-red-500/30 rounded transition-all hover:bg-gray-50 dark:hover:bg-[#15151A]/80 hover:shadow-[0_0_30px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-sm">

                                        {/* Decoration Line on Left */}
                                        <div className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-700 to-transparent group-hover:via-red-600 transition-all"></div>

                                        {/* Checkbox */}
                                        <div className="w-full md:col-span-1 pl-2 md:pl-0 mb-2 md:mb-0">
                                            <input
                                                type="checkbox"
                                                checked={selectedContactIds.has(contact.id)}
                                                onChange={() => handleSelectContact(contact.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                            />
                                        </div>

                                        {/* Entity */}
                                        <div className="w-full md:col-span-3 md:pr-4">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 dark:text-white text-sm tracking-wide">{contact.companyName}</h3>
                                                    <p className="font-mono text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                                                        <LockIcon size={10} /> ID: {contact.siret ? contact.siret.substring(0, 14) : 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contact */}
                                        <div className="w-full md:col-span-3 md:pr-4 border-t md:border-t-0 border-gray-100 dark:border-white/5 pt-3 md:pt-0 mt-2 md:mt-0">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10 group-hover:border-gray-300 dark:group-hover:border-white/30 group-hover:text-gray-900 dark:group-hover:text-white transition-all">
                                                    {contact.managerName ? contact.managerName.substring(0, 2).toUpperCase() : '?'}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors">{contact.managerName || 'Non Assigné'}</p>
                                                    <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-gray-500">
                                                        <span className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white cursor-pointer">
                                                            <Phone size={10} /> {contact.phoneFixed || contact.phoneMobile || 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Pipeline Visual */}
                                        <div className="w-full md:col-span-2 md:pr-6 border-t md:border-t-0 border-gray-100 dark:border-white/5 pt-3 md:pt-0 mt-2 md:mt-0">
                                            <div className="flex justify-between text-[9px] font-mono text-gray-500 mb-1 uppercase">
                                                <span>Progression</span>
                                                <span className="text-gray-900 dark:text-white">{mapping.score}%</span>
                                            </div>
                                            <PipelineBar step={mapping.step} />
                                        </div>

                                        {/* Status */}
                                        <div className="w-full md:col-span-2 border-t md:border-t-0 border-gray-100 dark:border-white/5 pt-3 md:pt-0 mt-2 md:mt-0">
                                            <select
                                                value={contact.status}
                                                onChange={(e) => handleStatusChange(contact.id, e.target.value)}
                                                className={`
                                                    px-2 py-1 rounded border backdrop-blur-md font-mono text-[10px] uppercase tracking-wider w-full outline-none cursor-pointer appearance-none
                                                    ${STATUS_CONFIG[STATUS_MAPPING[contact.status]?.configKey || 'Nouveau'].bg}
                                                    ${STATUS_CONFIG[STATUS_MAPPING[contact.status]?.configKey || 'Nouveau'].border}
                                                    ${STATUS_CONFIG[STATUS_MAPPING[contact.status]?.configKey || 'Nouveau'].color}
                                                    shadow-sm dark:shadow-[0_0_10px_rgba(0,0,0,0.5)]
                                                `}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <option value="NEW" className="bg-white dark:bg-[#0E0E11] text-blue-600 dark:text-blue-400">Nouveau</option>
                                                <option value="NRP" className="bg-white dark:bg-[#0E0E11] text-orange-600 dark:text-orange-400">NRP</option>
                                                <option value="UNREACHABLE" className="bg-white dark:bg-[#0E0E11] text-orange-600 dark:text-orange-400">Injoignable</option>
                                                <option value="ANSWERING_MACHINE" className="bg-white dark:bg-[#0E0E11] text-purple-600 dark:text-purple-400">Répondeur</option>
                                                <option value="ABSENT" className="bg-white dark:bg-[#0E0E11] text-purple-600 dark:text-purple-400">Absent</option>
                                                <option value="CALLBACK_LATER" className="bg-white dark:bg-[#0E0E11] text-purple-600 dark:text-purple-400">Rappeler</option>
                                                <option value="FOLLOW_UP" className="bg-white dark:bg-[#0E0E11] text-purple-600 dark:text-purple-400">Relance</option>
                                                <option value="APPOINTMENT_TAKEN" className="bg-white dark:bg-[#0E0E11] text-emerald-600 dark:text-emerald-400">RDV Pris</option>
                                                <option value="NOT_INTERESTED" className="bg-white dark:bg-[#0E0E11] text-red-600 dark:text-red-400">Pas intéressé</option>
                                                <option value="OUT_OF_TARGET" className="bg-white dark:bg-[#0E0E11] text-red-600 dark:text-red-400">Hors cible</option>
                                                <option value="ALREADY_CLIENT" className="bg-white dark:bg-[#0E0E11] text-emerald-600 dark:text-emerald-400">Client</option>
                                                <option value="WRONG_NUMBER" className="bg-white dark:bg-[#0E0E11] text-red-600 dark:text-red-400">Faux num</option>
                                            </select>
                                            <p className="mt-2 text-[9px] font-mono text-gray-600">
                                                {['APPOINTMENT_TAKEN', 'CALLBACK_LATER', 'FOLLOW_UP'].includes(contact.status) && contact.nextCallDate && !isNaN(new Date(contact.nextCallDate).getTime()) ? (
                                                    <span className="text-blue-500 dark:text-blue-400 font-bold">
                                                        PRÉVU: {new Date(contact.nextCallDate).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                ) : (
                                                    `MAJ: ${contact.updatedAt && !isNaN(new Date(contact.updatedAt).getTime()) ? new Date(contact.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'PENDING'}`
                                                )}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <div className="w-full md:col-span-1 flex justify-start md:justify-end gap-2 opacity-100 md:opacity-60 group-hover:opacity-100 transition-opacity border-t md:border-t-0 border-gray-100 dark:border-white/5 pt-3 md:pt-0 mt-2 md:mt-0">
                                            {(contact.phoneFixed || contact.phoneMobile) && (
                                                <a
                                                    href={`tel:${contact.phoneFixed || contact.phoneMobile}`}
                                                    className="p-2 bg-gray-100 dark:bg-black border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:border-green-500/50 rounded hover:shadow-[0_0_10px_rgba(34,197,94,0.2)] transition-all flex-1 md:flex-none flex justify-center"
                                                    title="Appeler"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <PhoneCall size={16} />
                                                </a>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); navigate(`/contacts/${contact.id}`); }}
                                                className="p-2 bg-gray-100 dark:bg-black border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500/50 rounded hover:shadow-[0_0_10px_rgba(59,130,246,0.2)] transition-all flex-1 md:flex-none flex justify-center"
                                                title="Détails"
                                            >
                                                <Target size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEditContact(contact); }}
                                                className="p-2 bg-gray-100 dark:bg-black border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-white/50 rounded transition-all flex-1 md:flex-none flex justify-center"
                                                title="Modifier"
                                            >
                                                <Edit size={16} />
                                            </button>
                                        </div>

                                    </div>
                                );
                            })
                        )}
                    </div>
                ) : (
                    /* Table View - Detailed columns */
                    <div className="pb-8 overflow-hidden">
                        <div className="border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-max">
                                    <thead className="bg-gray-50 dark:bg-white/5 sticky top-0">
                                        <tr>
                                            <th className="px-2 py-3 text-left w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={contacts.length > 0 && selectedContactIds.size === contacts.length}
                                                    onChange={handleSelectAll}
                                                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                                />
                                            </th>
                                            {TABLE_COLUMNS.map((col) => (
                                                <th
                                                    key={col.key}
                                                    className="px-2 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                                                    style={{ minWidth: col.width }}
                                                >
                                                    {col.header}
                                                </th>
                                            ))}
                                            <th className="px-2 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider w-20">
                                                Statut
                                            </th>
                                            <th className="px-2 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider w-24">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={TABLE_COLUMNS.length + 3} className="text-center py-12 text-gray-500 font-mono animate-pulse">
                                                    CHARGEMENT_DONNÉES...
                                                </td>
                                            </tr>
                                        ) : contacts.length === 0 ? (
                                            <tr>
                                                <td colSpan={TABLE_COLUMNS.length + 3} className="text-center py-12 text-gray-500 font-mono">
                                                    AUCUNE_DONNÉE_TROUVÉE
                                                </td>
                                            </tr>
                                        ) : (
                                            contacts.map((contact) => (
                                                <tr
                                                    key={contact.id}
                                                    className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                                                    onClick={() => navigate(`/contacts/${contact.id}`)}
                                                >
                                                    <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedContactIds.has(contact.id)}
                                                            onChange={() => handleSelectContact(contact.id)}
                                                            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                                        />
                                                    </td>
                                                    {TABLE_COLUMNS.map((col) => (
                                                        <td
                                                            key={col.key}
                                                            className="px-2 py-2 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap overflow-hidden text-ellipsis"
                                                            style={{ maxWidth: col.width }}
                                                            title={formatValue(col.key, (contact as any)[col.key])}
                                                        >
                                                            {formatValue(col.key, (contact as any)[col.key])}
                                                        </td>
                                                    ))}
                                                    <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                                                        <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase ${STATUS_CONFIG[STATUS_MAPPING[contact.status]?.configKey || 'Nouveau'].bg} ${STATUS_CONFIG[STATUS_MAPPING[contact.status]?.configKey || 'Nouveau'].color}`}>
                                                            {STATUS_MAPPING[contact.status]?.text || contact.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center justify-end gap-1">
                                                            {(contact.phoneFixed || contact.phoneMobile) && (
                                                                <a
                                                                    href={`tel:${contact.phoneFixed || contact.phoneMobile}`}
                                                                    className="p-1.5 text-gray-400 hover:text-green-500 transition-colors"
                                                                    title="Appeler"
                                                                >
                                                                    <PhoneCall size={14} />
                                                                </a>
                                                            )}
                                                            <button
                                                                onClick={() => handleEditContact(contact)}
                                                                className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                                                                title="Modifier"
                                                            >
                                                                <Edit size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        {selectedContactIds.size > 0 && (
                            <div className="mt-3 flex items-center gap-3 px-4 py-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
                                <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                                    {selectedContactIds.size} contact(s) sélectionné(s)
                                </span>
                                <button
                                    onClick={handleBulkDelete}
                                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded flex items-center gap-1"
                                >
                                    <Trash2 size={12} />
                                    Supprimer
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Pagination Controls */}
                {totalCount > 0 && (
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-6 py-4 border-t border-gray-200 dark:border-white/5 bg-white/50 dark:bg-[#0E0E11]/30 backdrop-blur-sm rounded-b-lg">
                        <div className="text-xs text-gray-500 font-mono">
                            Affichage de <span className="font-bold text-gray-900 dark:text-white">{(page - 1) * perPage + 1}</span> à <span className="font-bold text-gray-900 dark:text-white">{Math.min(page * perPage, totalCount)}</span> sur <span className="font-bold text-gray-900 dark:text-white">{totalCount}</span> contacts
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 mr-4">
                                <span className="text-[10px] uppercase text-gray-500 font-bold">Par page:</span>
                                <select
                                    value={perPage}
                                    onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                                    className="bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs rounded px-2 py-1 outline-none focus:border-blue-500 transition-colors"
                                >
                                    <option value="10">10</option>
                                    <option value="25">25</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>

                                {/* Page Numbers */}
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        // Logic to show pages around current page
                                        let pNum = i + 1;
                                        if (totalPages > 5) {
                                            if (page > 3) {
                                                pNum = page - 2 + i;
                                            }
                                            if (pNum > totalPages) {
                                                pNum = totalPages - (4 - i);
                                            }
                                        }

                                        return (
                                            <button
                                                key={pNum}
                                                onClick={() => setPage(pNum)}
                                                className={`w-7 h-7 flex items-center justify-center rounded text-xs font-mono transition-all ${page === pNum
                                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                                                    }`}
                                            >
                                                {pNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <ContactModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleModalSuccess}
                contactToEdit={selectedContact}
            />

            <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                filters={{
                    search: searchTerm,
                    campaignId: selectedCampaignId,
                    status: statusFilter ? [statusFilter] : undefined,
                    ...advancedFilters,
                    ...(ancienneteFilter !== 'all' ? (() => {
                        const params: any = { dateType: 'createdAt' };
                        const now = new Date();
                        if (ancienneteFilter === 'today') {
                            params.dateStart = now.toISOString().split('T')[0];
                            params.dateEnd = now.toISOString().split('T')[0];
                        } else if (ancienneteFilter === 'week') {
                            const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                            params.dateStart = lastWeek.toISOString().split('T')[0];
                            params.dateEnd = now.toISOString().split('T')[0];
                        } else if (ancienneteFilter === 'month') {
                            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                            params.dateStart = firstDay.toISOString().split('T')[0];
                            params.dateEnd = now.toISOString().split('T')[0];
                        } else if (ancienneteFilter === 'quarter') {
                            const lastQuarter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                            params.dateStart = lastQuarter.toISOString().split('T')[0];
                            params.dateEnd = now.toISOString().split('T')[0];
                        } else if (ancienneteFilter === 'year') {
                            const firstDay = new Date(now.getFullYear(), 0, 1);
                            params.dateStart = firstDay.toISOString().split('T')[0];
                            params.dateEnd = now.toISOString().split('T')[0];
                        } else if (ancienneteFilter === 'custom') {
                            if (customDateStart) params.dateStart = customDateStart;
                            if (customDateEnd) params.dateEnd = customDateEnd;
                        }
                        return params;
                    })() : {})
                }}
                totalContacts={totalCount}
                filteredCount={totalCount}
            />

            <AppointmentModal
                isOpen={isAppointmentModalOpen}
                onClose={() => setIsAppointmentModalOpen(false)}
                onSuccess={() => {
                    fetchContacts();
                    setIsAppointmentModalOpen(false);
                }}
                contactId={selectedContactForAppointment?.id}
                contactName={selectedContactForAppointment?.companyName}
                contactAddress={`${selectedContactForAppointment?.address || ''} ${selectedContactForAppointment?.city || ''}`}
            />

            <CallbackModal
                isOpen={isCallbackModalOpen}
                onClose={() => setIsCallbackModalOpen(false)}
                onSuccess={() => {
                    fetchContacts();
                    setIsCallbackModalOpen(false);
                }}
                contactId={selectedContactForCallback?.id}
                contactName={selectedContactForCallback?.companyName}
                newStatus={callbackStatus}
            />

            <ImportMappingModal
                isOpen={isImportMappingModalOpen}
                onClose={() => setIsImportMappingModalOpen(false)}
                onSuccess={() => {
                    fetchContacts();
                    setIsImportMappingModalOpen(false);
                }}
                campaignId={selectedCampaignId}
            />
        </div >
    );
};

export default Contacts;
