import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
    Phone,
    Mail,
    MapPin,
    Clock,
    ArrowRight,
    Search,
    Lock as LockIcon,
    User,
    Briefcase,
    Copy,
    RefreshCw,
    CheckCircle,
    FileText,
    ChevronRight
} from 'lucide-react';
import AppointmentModal from '../components/AppointmentModal';
import CallQualification from '../components/CallQualification';
import CallScriptPanel from '../components/CallScriptPanel';

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
    nextCallDate?: string;
    notes?: string;
    campaign?: {
        name: string;
        code?: string;
    };
    calls?: any[];
}

const PreviewMode = () => {
    const [contact, setContact] = useState<Contact | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchId, setSearchId] = useState('');
    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
    const [stats, setStats] = useState({ treated: 0, rdv: 0, calls: 0 });
    const [showScriptPanel, setShowScriptPanel] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchNextContact();
    }, []);

    const fetchNextContact = async () => {
        setLoading(true);
        try {
            const response = await api.get('/contacts/preview/next');
            if (response.status === 204) {
                setContact(null); // No more contacts
            } else {
                setContact(response.data);
            }
        } catch (error) {
            console.error('Error fetching next contact:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchId.trim()) return;

        setLoading(true);
        try {
            const response = await api.get(`/contacts/search/${searchId.trim()}`);
            setContact(response.data);
        } catch (error) {
            console.error('Error searching contact:', error);
            alert('Contact non trouvé');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could add a toast here
    };

    const handleQualifySuccess = (outcome: string) => {
        if (outcome === 'APPOINTMENT_TAKEN') {
            setIsAppointmentModalOpen(true);
        } else {
            setStats(prev => ({ ...prev, treated: prev.treated + 1 }));
            fetchNextContact();
        }
    };

    if (loading && !contact) {
        return (
            <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-[#050507] text-gray-900 dark:text-white transition-colors">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="animate-spin text-red-600 dark:text-red-500" size={48} />
                    <p className="font-mono text-sm tracking-widest">CHARGEMENT_FILE_ATTENTE...</p>
                </div>
            </div>
        );
    }

    if (!contact && !loading) {
        return (
            <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-[#050507] text-gray-900 dark:text-white transition-colors">
                <div className="text-center max-w-md p-8 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-[#0A0A0C] shadow-lg dark:shadow-none">
                    <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
                    <h2 className="text-2xl font-bold mb-2">File d'attente vide !</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">Vous avez traité tous vos contacts prioritaires. Bon travail !</p>
                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={() => fetchNextContact()}
                            className="px-6 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded text-sm font-mono uppercase transition-colors"
                        >
                            Rafraîchir
                        </button>
                        <button
                            onClick={() => navigate('/contacts')}
                            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-mono uppercase transition-colors"
                        >
                            Retour Liste
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-[#050507] text-gray-900 dark:text-white overflow-hidden relative transition-colors">
            {/* Top Bar */}
            <div className="h-16 border-b border-gray-200 dark:border-white/10 flex items-center justify-between px-6 bg-white dark:bg-[#0A0A0C] z-10 transition-colors">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <h1 className="text-lg font-bold tracking-widest uppercase flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            Mode Preview
                        </h1>
                        <span className="text-[10px] font-mono text-gray-500">AGENT: {stats.treated} TRAITÉS // {stats.rdv} RDV</span>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="flex items-center gap-2 bg-gray-100 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-full px-4 py-1.5 focus-within:border-red-500/50 transition-colors w-96">
                    <Search size={14} className="text-gray-500" />
                    <input
                        type="text"
                        placeholder="RECHERCHER ID (ex: QC-2025-001234)..."
                        className="bg-transparent border-none outline-none text-xs font-mono w-full uppercase placeholder-gray-400 dark:placeholder-gray-600 text-gray-900 dark:text-white"
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                    />
                </form>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowScriptPanel(!showScriptPanel)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${showScriptPanel
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                            }`}
                        title="Afficher/Masquer le script d'appel"
                    >
                        <FileText size={16} />
                        Script
                        <ChevronRight size={14} className={`transition-transform ${showScriptPanel ? 'rotate-180' : ''}`} />
                    </button>
                    <button onClick={() => fetchNextContact()} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors" title="Rafraîchir">
                        <RefreshCw size={18} className="text-gray-400 dark:text-gray-400" />
                    </button>
                </div>
            </div>

            {/* Main Content - Card */}
            <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/5 dark:from-red-900/10 via-gray-50 dark:via-[#050507] to-gray-50 dark:to-[#050507] pointer-events-none"></div>

                {contact && (
                    <div className="w-full max-w-4xl bg-white dark:bg-[#0E0E11] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden relative z-10 animate-in fade-in zoom-in duration-300 transition-colors">

                        {/* Card Header */}
                        <div className="p-6 border-b border-gray-200 dark:border-white/5 bg-gradient-to-r from-white to-gray-50 dark:from-[#0E0E11] dark:to-[#15151A]">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 px-3 py-1 rounded text-xs font-mono font-bold flex items-center gap-2">
                                        <LockIcon size={12} />
                                        ID: {contact.uniqueId || 'N/A'}
                                    </div>
                                    <button onClick={() => copyToClipboard(contact.uniqueId || '')} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                                        <Copy size={14} />
                                    </button>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-mono text-gray-500 uppercase mb-1">Campagne</div>
                                    <div className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                                        {contact.campaign?.name || 'Campagne Inconnue'}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-end">
                                <div>
                                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{contact.companyName}</h2>
                                    <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                                        <div className="flex items-center gap-2 w-full">
                                            <User size={16} className="text-gray-400 dark:text-gray-500" />
                                            <input
                                                type="text"
                                                value={contact.managerName || ''}
                                                onChange={(e) => setContact({ ...contact, managerName: e.target.value })}
                                                onBlur={() => api.put(`/contacts/${contact.id}`, { managerName: contact.managerName })}
                                                className="bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-white/20 focus:border-red-500 outline-none text-gray-900 dark:text-white font-medium transition-colors placeholder-gray-400 dark:placeholder-gray-600"
                                                placeholder="Nom du responsable"
                                            />
                                            <input
                                                type="text"
                                                value={contact.managerRole || ''}
                                                onChange={(e) => setContact({ ...contact, managerRole: e.target.value })}
                                                onBlur={() => api.put(`/contacts/${contact.id}`, { managerRole: contact.managerRole })}
                                                className="bg-gray-100 dark:bg-white/5 border-b border-transparent hover:border-gray-300 dark:hover:border-white/20 focus:border-red-500 outline-none text-xs px-2 py-0.5 rounded transition-colors placeholder-gray-400 dark:placeholder-gray-600 w-32 text-gray-700 dark:text-gray-300"
                                                placeholder="Fonction"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider border ${contact.status === 'NEW' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' :
                                        contact.status === 'CALLBACK_LATER' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' :
                                            'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700'
                                        }`}>
                                        {contact.status}
                                    </div>
                                    {contact.nextCallDate && !isNaN(new Date(contact.nextCallDate).getTime()) && (
                                        <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 font-mono animate-pulse">
                                            <Clock size={12} />
                                            Rappel: {new Date(contact.nextCallDate).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Card Body */}
                        <div className="flex-1 grid grid-cols-12 divide-x divide-gray-200 dark:divide-white/5">
                            {/* Left Column: Contact Info */}
                            <div className="col-span-4 p-6 space-y-6 bg-gray-50 dark:bg-[#0A0A0C]/50">
                                <div>
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Phone size={14} /> Coordonnées
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="group">
                                            <label className="text-[10px] text-gray-500 dark:text-gray-600 font-mono block mb-1">TÉLÉPHONE FIXE</label>
                                            <div className="flex items-center justify-between">
                                                <input
                                                    type="text"
                                                    value={contact.phoneFixed || ''}
                                                    onChange={(e) => setContact({ ...contact, phoneFixed: e.target.value })}
                                                    onBlur={() => api.put(`/contacts/${contact.id}`, { phoneFixed: contact.phoneFixed })}
                                                    className="bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-white/20 focus:border-red-500 outline-none text-lg font-mono text-gray-900 dark:text-white w-full mr-2 transition-colors"
                                                />
                                                {contact.phoneFixed && (
                                                    <a href={`tel:${contact.phoneFixed}`} className="p-2 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-500 rounded hover:bg-green-500 hover:text-white transition-all">
                                                        <Phone size={16} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        <div className="group">
                                            <label className="text-[10px] text-gray-500 dark:text-gray-600 font-mono block mb-1">MOBILE</label>
                                            <div className="flex items-center justify-between">
                                                <input
                                                    type="text"
                                                    value={contact.phoneMobile || ''}
                                                    onChange={(e) => setContact({ ...contact, phoneMobile: e.target.value })}
                                                    onBlur={() => api.put(`/contacts/${contact.id}`, { phoneMobile: contact.phoneMobile })}
                                                    className="bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-white/20 focus:border-red-500 outline-none text-lg font-mono text-gray-900 dark:text-white w-full mr-2 transition-colors"
                                                />
                                                {contact.phoneMobile && (
                                                    <a href={`tel:${contact.phoneMobile}`} className="p-2 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-500 rounded hover:bg-green-500 hover:text-white transition-all">
                                                        <Phone size={16} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        <div className="group">
                                            <label className="text-[10px] text-gray-500 dark:text-gray-600 font-mono block mb-1">EMAIL</label>
                                            <div className="flex items-center justify-between">
                                                <input
                                                    type="email"
                                                    value={contact.email || ''}
                                                    onChange={(e) => setContact({ ...contact, email: e.target.value })}
                                                    onBlur={() => api.put(`/contacts/${contact.id}`, { email: contact.email })}
                                                    className="bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-white/20 focus:border-red-500 outline-none text-sm text-gray-900 dark:text-white w-full mr-2 transition-colors"
                                                />
                                                {contact.email && (
                                                    <a href={`mailto:${contact.email}`} className="p-2 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-500 rounded hover:bg-blue-500 hover:text-white transition-all">
                                                        <Mail size={16} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <MapPin size={14} /> Adresse
                                    </h3>
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={contact.address || ''}
                                            onChange={(e) => setContact({ ...contact, address: e.target.value })}
                                            onBlur={() => api.put(`/contacts/${contact.id}`, { address: contact.address })}
                                            className="bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-white/20 focus:border-red-500 outline-none text-sm text-gray-900 dark:text-white w-full transition-colors"
                                            placeholder="Adresse"
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                            <input
                                                type="text"
                                                value={contact.zipCode || ''}
                                                onChange={(e) => setContact({ ...contact, zipCode: e.target.value })}
                                                onBlur={() => api.put(`/contacts/${contact.id}`, { zipCode: contact.zipCode })}
                                                className="bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-white/20 focus:border-red-500 outline-none text-sm text-gray-900 dark:text-white w-full transition-colors"
                                                placeholder="Code Postal"
                                            />
                                            <input
                                                type="text"
                                                value={contact.city || ''}
                                                onChange={(e) => setContact({ ...contact, city: e.target.value })}
                                                onBlur={() => api.put(`/contacts/${contact.id}`, { city: contact.city })}
                                                className="bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-white/20 focus:border-red-500 outline-none text-sm text-gray-900 dark:text-white w-full transition-colors"
                                                placeholder="Ville"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Middle Column: Script & Notes */}
                            <div className="col-span-5 p-6 flex flex-col h-full">
                                <div className="flex-1 flex flex-col">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Briefcase size={14} /> Notes & Historique
                                    </h3>

                                    <div className="flex-1 mb-4 flex flex-col">
                                        <textarea
                                            value={contact.notes || ''}
                                            onChange={(e) => setContact({ ...contact, notes: e.target.value })}
                                            onBlur={() => api.put(`/contacts/${contact.id}`, { notes: contact.notes })}
                                            className="flex-1 w-full bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-4 text-sm text-gray-800 dark:text-yellow-100 resize-none focus:ring-2 focus:ring-yellow-500/50 outline-none transition-all placeholder-yellow-800/30 dark:placeholder-yellow-100/30"
                                            placeholder="Notes sur l'appel..."
                                        />
                                    </div>

                                    <div className="h-48 overflow-y-auto pr-2 space-y-3">
                                        {contact.calls && contact.calls.length > 0 ? (
                                            contact.calls.map((call: any, idx: number) => (
                                                <div key={idx} className="bg-gray-50 dark:bg-white/5 p-3 rounded border border-gray-100 dark:border-white/5 text-xs">
                                                    <div className="flex justify-between mb-1">
                                                        <span className="font-bold text-gray-700 dark:text-gray-300">{call.calledAt && !isNaN(new Date(call.calledAt).getTime()) ? new Date(call.calledAt).toLocaleDateString() : 'Date inconnue'}</span>
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${(call.outcome || call.status) === 'APPOINTMENT_TAKEN' ? 'bg-green-100 text-green-700' :
                                                            (call.outcome || call.status) === 'CALLBACK_LATER' ? 'bg-purple-100 text-purple-700' :
                                                                'bg-gray-100 text-gray-600'
                                                            }`}>{call.outcome || call.status || 'N/A'}</span>
                                                    </div>
                                                    <p className="text-gray-600 dark:text-gray-400">{call.notes}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center text-gray-400 py-4 italic text-xs">Aucun historique d'appel</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Actions */}
                            <div className="col-span-3 p-6 bg-gray-50 dark:bg-[#0A0A0C]/50">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <ArrowRight size={14} /> Actions
                                </h3>

                                <CallQualification
                                    contact={contact}
                                    latestCall={
                                        // Prioriser l'appel le plus récent AVEC enregistrement
                                        contact.calls?.find((c: any) => c.recordingPath) ||
                                        (contact.calls && contact.calls.length > 0 ? contact.calls[0] : null)
                                    }
                                    onQualifySuccess={handleQualifySuccess}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {contact && (
                    <AppointmentModal
                        isOpen={isAppointmentModalOpen}
                        onClose={() => {
                            setIsAppointmentModalOpen(false);
                            setStats(prev => ({ ...prev, rdv: prev.rdv + 1, treated: prev.treated + 1 }));
                            fetchNextContact();
                        }}
                        contactId={contact.id}
                        contactName={contact.companyName}
                        onSuccess={() => {
                            setIsAppointmentModalOpen(false);
                            setStats(prev => ({ ...prev, rdv: prev.rdv + 1, treated: prev.treated + 1 }));
                            fetchNextContact();
                        }}
                    />
                )}
            </div>

            {/* Script Panel - Sliding from right */}
            {showScriptPanel && contact && (
                <div className="fixed inset-y-0 right-0 w-96 z-50 transform transition-transform duration-300 ease-in-out">
                    <CallScriptPanel
                        contactStatus={contact.status}
                        companyName={contact.companyName}
                        campaignName={contact.campaign?.name}
                        onClose={() => setShowScriptPanel(false)}
                        className="h-full"
                    />
                </div>
            )}

            {/* Overlay when script panel is open */}
            {showScriptPanel && (
                <div
                    className="fixed inset-0 bg-black/20 z-40 lg:hidden"
                    onClick={() => setShowScriptPanel(false)}
                />
            )}
        </div>
    );
};

export default PreviewMode;
