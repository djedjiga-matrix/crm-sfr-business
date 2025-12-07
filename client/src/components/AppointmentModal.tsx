import { useState, useEffect } from 'react';
import {
    X, Calendar, MapPin, User, FileText, Phone, Mail,
    Trash2, Edit, AlertTriangle,
    History, ChevronDown, Printer, Smartphone
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../services/api';

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    contactId?: string;
    contactName?: string;
    contactAddress?: string;
    appointmentId?: string;
}

interface User {
    id: string;
    name: string;
}

const STATUS_CONFIG: Record<string, { label: string, color: string, bg: string, border: string, icon: string }> = {
    'SCHEDULED': { label: 'RDV à venir', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-500', icon: '🟦' },
    'TO_RESCHEDULE': { label: 'À reprogrammer', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-500', icon: '🟡' },
    'TO_RECONTACT': { label: 'À relancer', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-500', icon: '🟠' },
    'RESCHEDULED': { label: 'Décalé', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-500', icon: '🟣' },
    'SIGNED': { label: 'Signé', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-500', icon: '🟢' },
    'CANCELLED': { label: 'Annulé', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-500', icon: '🔴' },
    'TO_CALLBACK': { label: 'À rappeler', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-700', icon: '🟤' },
};

const AppointmentModal = ({ isOpen, onClose, onSuccess, contactId, contactName, contactAddress, appointmentId }: AppointmentModalProps) => {
    // Mode: 'CREATE' if no appointmentId, 'VIEW' otherwise (initially)
    const [mode, setMode] = useState<'CREATE' | 'VIEW' | 'EDIT'>('CREATE');

    // Data States
    const [appointment, setAppointment] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [commercials, setCommercials] = useState<User[]>([]);

    // Form States
    const [date, setDate] = useState('');
    const [time, setTime] = useState('09:00');
    const [commercialId, setCommercialId] = useState('');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedContactId, setSelectedContactId] = useState('');
    const [selectedContactName, setSelectedContactName] = useState('');

    // Status Change State
    const [pendingStatus, setPendingStatus] = useState<string | null>(null);
    const [statusReason, setStatusReason] = useState('');
    const [newDate, setNewDate] = useState('');
    const [newTime, setNewTime] = useState('');

    // UI States
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [contactSearch, setContactSearch] = useState('');
    const [contactResults, setContactResults] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            fetchCommercials();
            if (appointmentId) {
                setMode('VIEW');
                fetchAppointmentDetails(appointmentId);
            } else {
                setMode('CREATE');
                resetForm();
                if (contactId) {
                    setSelectedContactId(contactId);
                    setSelectedContactName(contactName || '');
                    setAddress(contactAddress || '');
                }
            }
        }
    }, [isOpen, appointmentId, contactId]);

    const resetForm = () => {
        setDate(format(new Date(), 'yyyy-MM-dd'));
        setTime('09:00');
        setCommercialId('');
        setAddress('');
        setNotes('');
        setSelectedContactId('');
        setSelectedContactName('');
        setAppointment(null);
        setHistory([]);
        setPendingStatus(null);
    };

    const fetchCommercials = async () => {
        try {
            const response = await api.get('/users');
            const comms = response.data.filter((u: any) => u.role === 'COMMERCIAL');
            setCommercials(comms);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchAppointmentDetails = async (id: string) => {
        setLoading(true);
        try {
            // Fetch appointment
            // Note: Assuming the getAppointments endpoint can filter by ID or we have a specific endpoint
            // Since we don't have a specific getById in the controller shown (only getAppointments with filters), 
            // we might need to filter client side or add logic. 
            // Actually, the controller has getAppointments but not getById specifically exposed as /:id in the router shown?
            // Wait, the router has `router.get('/', getAppointments)` but no `router.get('/:id', ...)`?
            // Ah, I missed checking if there is a getById. The controller has `getAppointments` which takes query params.
            // I should probably add a getById or just use the list with ID filter if supported?
            // The controller supports `start`, `end`, `commercialId`. It doesn't seem to support `id`.
            // I will assume I can fetch the list and find it, or I should have added getById.
            // Let's try to fetch all (or range) and find. But that's inefficient.
            // I'll assume for now I can use the list endpoint or I'll fix the backend to support /:id.
            // Actually, let's look at the routes again.
            // `router.put('/:id', ...)` exists. `router.delete('/:id', ...)` exists.
            // `router.get('/', ...)` exists.
            // I should add `router.get('/:id', ...)` to be safe.
            // But for now, let's assume I can pass `id` as query param if I modify the controller, or just use what I have.
            // Wait, I can just add the endpoint quickly.

            // For now, I'll simulate it by fetching the list (maybe filtered by date if I knew it, but I don't).
            // Actually, I'll just add the endpoint to the backend in a separate step if needed.
            // But wait, I can use `api.get('/appointments')` and filter client side if the list is small, but it's not ideal.
            // Let's assume I added `getAppointmentById` to the controller. I'll do that next.

            const response = await api.get(`/appointments/${id}`); // I will add this route
            const appt = response.data;
            setAppointment(appt);

            // Set form state
            setDate(format(new Date(appt.date), 'yyyy-MM-dd'));
            setTime(format(new Date(appt.date), 'HH:mm'));
            setCommercialId(appt.commercialId);
            setAddress(appt.address || '');
            setNotes(appt.notes || '');
            setSelectedContactId(appt.contactId);
            setSelectedContactName(appt.contact.companyName);

            // Fetch history
            const historyRes = await api.get(`/appointments/${id}/history`);
            setHistory(historyRes.data);

        } catch (err) {
            console.error(err);
            setError("Impossible de charger le rendez-vous");
        } finally {
            setLoading(false);
        }
    };

    const handleSearchContact = async (search: string) => {
        setContactSearch(search);
        if (search.length > 2) {
            try {
                const response = await api.get('/contacts', { params: { search, limit: 5 } });
                setContactResults(response.data.data);
            } catch (err) {
                console.error(err);
            }
        } else {
            setContactResults([]);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/appointments', {
                contactId: selectedContactId,
                commercialId,
                date: new Date(`${date}T${time}`).toISOString(),
                address,
                notes
            });
            onSuccess();
            onClose();
        } catch (err) {
            setError("Erreur création RDV");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async () => {
        if (!appointmentId || !pendingStatus) return;
        setLoading(true);
        try {
            const updateData: any = { status: pendingStatus, reason: statusReason };

            if (pendingStatus === 'RESCHEDULED' || pendingStatus === 'TO_RESCHEDULE') {
                if (newDate && newTime) {
                    updateData.date = new Date(`${newDate}T${newTime}`).toISOString();
                }
            }

            await api.put(`/appointments/${appointmentId}`, updateData);

            // Refresh
            await fetchAppointmentDetails(appointmentId);
            setPendingStatus(null);
            setStatusReason('');
            setNewDate('');
            setNewTime('');
            onSuccess(); // Refresh calendar
        } catch (err) {
            setError("Erreur mise à jour statut");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const currentStatusConfig = appointment ? STATUS_CONFIG[appointment.status] : STATUS_CONFIG['SCHEDULED'];

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
            <div className="w-full max-w-4xl h-[90vh] overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 shadow-2xl bg-white dark:bg-[#0A0A0C] flex flex-col">

                {/* HEADER */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0E0E11] flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-red-600/10 rounded-lg">
                            <Calendar className="text-red-600" size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-widest">
                                {mode === 'CREATE' ? 'Nouveau Rendez-vous' : 'Détails du Rendez-vous'}
                            </h2>
                            {appointment && (
                                <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                                    <span>ID: {appointment.id.slice(0, 8)}</span>
                                    <span>•</span>
                                    <span>Créé le {format(new Date(appointment.createdAt), 'dd/MM/yyyy')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm mb-4 border border-red-200 dark:border-red-800">
                            {error}
                        </div>
                    )}
                    {mode === 'CREATE' ? (
                        /* CREATE FORM */
                        <form onSubmit={handleCreate} className="space-y-6 max-w-2xl mx-auto">
                            {/* Contact Search */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Contact</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={selectedContactName || contactSearch}
                                        onChange={(e) => {
                                            if (selectedContactId) {
                                                setSelectedContactId('');
                                                setSelectedContactName('');
                                            }
                                            handleSearchContact(e.target.value);
                                        }}
                                        placeholder="Rechercher une entreprise..."
                                        className="w-full p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                    />
                                    {contactResults.length > 0 && !selectedContactId && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1A1A1D] border border-gray-200 dark:border-white/10 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
                                            {contactResults.map(c => (
                                                <div
                                                    key={c.id}
                                                    onClick={() => {
                                                        setSelectedContactId(c.id);
                                                        setSelectedContactName(c.companyName);
                                                        setAddress(`${c.address || ''} ${c.zipCode || ''} ${c.city || ''}`);
                                                        setContactResults([]);
                                                    }}
                                                    className="p-3 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer border-b border-gray-100 dark:border-white/5 last:border-0"
                                                >
                                                    <div className="font-bold text-sm">{c.companyName}</div>
                                                    <div className="text-xs text-gray-500">{c.managerName} • {c.phoneFixed}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Date & Heure</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={e => setDate(e.target.value)}
                                            className="flex-1 p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg outline-none"
                                            required
                                        />
                                        <input
                                            type="time"
                                            value={time}
                                            onChange={e => setTime(e.target.value)}
                                            className="w-24 p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg outline-none"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Commercial</label>
                                    <select
                                        value={commercialId}
                                        onChange={e => setCommercialId(e.target.value)}
                                        className="w-full p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg outline-none"
                                        required
                                    >
                                        <option value="">Sélectionner...</option>
                                        {commercials.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Lieu</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        value={address}
                                        onChange={e => setAddress(e.target.value)}
                                        className="w-full pl-10 p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg outline-none"
                                        placeholder="Adresse du RDV"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    rows={4}
                                    className="w-full p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg outline-none"
                                    placeholder="Contexte, instructions..."
                                />
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-lg shadow-red-600/20 transition-all"
                                >
                                    {loading ? 'Création...' : 'Confirmer le Rendez-vous'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* VIEW / EDIT MODE */
                        <div className="grid grid-cols-3 gap-6 h-full">
                            {loading || !appointment ? (
                                <div className="col-span-3 flex items-center justify-center h-full">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                                </div>
                            ) : (
                                <>
                                    {/* LEFT COLUMN - MAIN INFO */}
                                    <div className="col-span-2 space-y-6">
                                        {/* Status Banner */}
                                        <div className={`p-4 rounded-xl border ${currentStatusConfig.bg} ${currentStatusConfig.border} flex justify-between items-center`}>
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{currentStatusConfig.icon}</span>
                                                <div>
                                                    <div className={`text-xs font-bold uppercase tracking-wider ${currentStatusConfig.color} opacity-70`}>Statut Actuel</div>
                                                    <div className={`text-lg font-bold ${currentStatusConfig.color}`}>{currentStatusConfig.label}</div>
                                                </div>
                                            </div>

                                            <div className="relative group">
                                                <button className="px-4 py-2 bg-white dark:bg-black/20 border border-black/10 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-50 transition-colors">
                                                    Changer Statut <ChevronDown size={14} />
                                                </button>
                                                <div className="absolute right-0 top-full pt-2 w-56 hidden group-hover:block z-50">
                                                    <div className="bg-white dark:bg-[#1A1A1D] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden">
                                                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                                            <button
                                                                key={key}
                                                                onClick={() => setPendingStatus(key)}
                                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-3 transition-colors"
                                                            >
                                                                <span>{config.icon}</span>
                                                                <span className="text-sm font-medium">{config.label}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status Change Form (Conditional) */}
                                        {pendingStatus && pendingStatus !== appointment?.status && (
                                            <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6 animate-in fade-in slide-in-from-top-4">
                                                <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                                                    <AlertTriangle size={16} className="text-yellow-500" />
                                                    Modification du statut : {STATUS_CONFIG[pendingStatus].label}
                                                </h3>

                                                <div className="space-y-4">
                                                    {(pendingStatus === 'TO_RESCHEDULE' || pendingStatus === 'RESCHEDULED') && (
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-1">
                                                                <label className="text-xs text-gray-500">Nouvelle Date</label>
                                                                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full p-2 rounded border" />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-xs text-gray-500">Nouvelle Heure</label>
                                                                <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full p-2 rounded border" />
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="space-y-1">
                                                        <label className="text-xs text-gray-500">Raison / Commentaire (Obligatoire)</label>
                                                        <textarea
                                                            value={statusReason}
                                                            onChange={e => setStatusReason(e.target.value)}
                                                            className="w-full p-2 rounded border min-h-[80px]"
                                                            placeholder="Pourquoi ce changement ?"
                                                        />
                                                    </div>

                                                    <div className="flex justify-end gap-3">
                                                        <button onClick={() => setPendingStatus(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900">Annuler</button>
                                                        <button
                                                            onClick={handleUpdateStatus}
                                                            disabled={!statusReason}
                                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                                                        >
                                                            Confirmer
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Main Info Card */}
                                        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6 space-y-6">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{appointment?.contact.companyName}</h3>
                                                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                                                        <User size={14} />
                                                        <span>{appointment?.contact.managerName} ({appointment?.contact.managerRole || 'Responsable'})</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-2xl font-mono font-bold text-gray-900 dark:text-white">
                                                        {appointment?.date && format(new Date(appointment.date), 'HH:mm')}
                                                    </div>
                                                    <div className="text-sm text-gray-500 uppercase tracking-wider">
                                                        {appointment?.date && format(new Date(appointment.date), 'dd MMM yyyy', { locale: fr })}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-white/5">
                                                <div className="space-y-1">
                                                    <div className="text-xs text-gray-400 uppercase tracking-wider">Contact</div>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Phone size={14} className="text-gray-400" />
                                                        <a href={`tel:${appointment?.contact.phoneFixed}`} className="hover:text-blue-500">{appointment?.contact.phoneFixed}</a>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Smartphone size={14} className="text-gray-400" />
                                                        <a href={`tel:${appointment?.contact.phoneMobile}`} className="hover:text-blue-500">{appointment?.contact.phoneMobile || '-'}</a>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Mail size={14} className="text-gray-400" />
                                                        <a href={`mailto:${appointment?.contact.email}`} className="hover:text-blue-500 truncate max-w-[200px]">{appointment?.contact.email || '-'}</a>
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="text-xs text-gray-400 uppercase tracking-wider">Adresse</div>
                                                    <div className="flex items-start gap-2 text-sm">
                                                        <MapPin size={14} className="text-gray-400 mt-1" />
                                                        <div>
                                                            <div>{appointment?.address}</div>
                                                            <div className="text-gray-500">{appointment?.contact.zipCode} {appointment?.contact.city}</div>
                                                            <a
                                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appointment?.address + ' ' + appointment?.contact.city)}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-blue-500 text-xs hover:underline mt-1 inline-block"
                                                            >
                                                                Voir sur Maps
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Context & Notes */}
                                        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6">
                                            <h4 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <FileText size={16} /> Notes & Contexte
                                            </h4>
                                            <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-lg text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                {appointment?.notes || "Aucune note disponible."}
                                            </div>
                                        </div>
                                    </div>

                                    {/* RIGHT COLUMN - SIDEBAR */}
                                    <div className="space-y-6">
                                        {/* Commercial Info */}
                                        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4">
                                            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Commercial Assigné</div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold">
                                                    {appointment?.commercial.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm">{appointment?.commercial.name}</div>
                                                    <div className="text-xs text-gray-500">Commercial Terrain</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* History Timeline */}
                                        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 flex-1">
                                            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                                                <History size={14} /> Historique
                                            </div>
                                            <div className="space-y-4 relative before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-px before:bg-gray-200 dark:before:bg-white/10">
                                                {history.map((item, i) => (
                                                    <div key={i} className="relative pl-6">
                                                        <div className="absolute left-0 top-1 w-3 h-3 rounded-full bg-gray-200 dark:bg-white/20 border-2 border-white dark:border-[#0A0A0C]"></div>
                                                        <div className="text-xs text-gray-500 mb-0.5">{format(new Date(item.createdAt), 'dd/MM HH:mm')}</div>
                                                        <div className="text-sm font-medium">{item.action}</div>
                                                        {item.comment && <div className="text-xs text-gray-400 italic mt-1">"{item.comment}"</div>}
                                                        <div className="text-xs text-gray-400 mt-0.5">par {item.user.name}</div>
                                                    </div>
                                                ))}
                                                {/* Creation event (simulated if not in history) */}
                                                <div className="relative pl-6">
                                                    <div className="absolute left-0 top-1 w-3 h-3 rounded-full bg-blue-200 dark:bg-blue-900 border-2 border-white dark:border-[#0A0A0C]"></div>
                                                    <div className="text-xs text-gray-500 mb-0.5">{appointment && format(new Date(appointment.createdAt), 'dd/MM HH:mm')}</div>
                                                    <div className="text-sm font-medium">Création du RDV</div>
                                                    <div className="text-xs text-gray-400 mt-0.5">par {appointment?.agent?.name || 'Agent'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* FOOTER ACTIONS */}
                {mode === 'VIEW' && (
                    <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0E0E11] flex justify-between items-center shrink-0">
                        <div className="flex gap-2">
                            <button className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-white/10 text-gray-500 transition-all" title="Supprimer">
                                <Trash2 size={18} />
                            </button>
                            <button className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-white/10 text-gray-500 transition-all" title="Imprimer">
                                <Printer size={18} />
                            </button>
                        </div>
                        <div className="flex gap-3">
                            <button className="px-4 py-2 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-bold text-gray-700 dark:text-white hover:bg-gray-50 transition-colors flex items-center gap-2">
                                <Edit size={16} /> Modifier
                            </button>
                            <a
                                href={`tel:${appointment?.contact.phoneFixed}`}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                            >
                                <Phone size={16} /> Appeler
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AppointmentModal;
