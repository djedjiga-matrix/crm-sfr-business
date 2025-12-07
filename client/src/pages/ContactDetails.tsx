import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Building, User, Calendar, Mail, MapPin, Hash, Clock } from 'lucide-react';
import api from '../services/api';
import ContactModal from '../components/ContactModal';
import AppointmentModal from '../components/AppointmentModal';
import CallQualification from '../components/CallQualification';

interface Contact {
    id: string;
    companyName: string;
    siret?: string;
    email?: string;
    phoneFixed?: string;
    phoneMobile?: string;
    address?: string;
    city?: string;
    zipCode?: string;
    status: string;
    notes?: string;
    assignedTo?: {
        name: string;
    };
    campaign?: {
        name: string;
    };
    calls?: Array<{
        id: string;
        calledAt: string;
        duration: number;
        outcome: string;
        notes?: string;
        recordingPath?: string;
        recordingStatus?: string;
        user?: { name: string };
        phoneNumber?: string;
    }>;
    createdAt: string;
    updatedAt: string;
}

const ContactDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [contact, setContact] = useState<Contact | null>(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);

    const fetchContact = async () => {
        try {
            const response = await api.get(`/contacts/${id}`);
            setContact(response.data);
        } catch (error) {
            console.error('Error fetching contact:', error);
            // Rediriger si non trouvé ?
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchContact();
        }
    }, [id]);

    const handleEditSuccess = () => {
        fetchContact();
    };

    const handleCall = async (phoneNumber: string) => {
        if (!phoneNumber) return;

        // 1. Tenter d'initier l'appel via l'API (pour logging et potentiellement auto-dial)
        try {
            await api.post('/aircall/dial', { phoneNumber });
            console.log('Call initiated via API');
        } catch (error) {
            console.error('Error initiating call via API', error);
        }

        // 2. Ouvrir le lien tel: pour que l'app Aircall (ou autre) prenne le relais
        window.location.href = `tel:${phoneNumber}`;
    };

    if (loading) return <div className="p-8 text-center text-gray-500 font-mono animate-pulse">CHARGEMENT...</div>;
    if (!contact) return <div className="p-8 text-center text-gray-500 font-mono">CONTACT_NON_TROUVÉ</div>;

    return (
        <div>
            <button
                onClick={() => navigate('/contacts')}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors uppercase tracking-wider text-xs font-bold"
            >
                <ArrowLeft size={16} />
                Retour à la liste
            </button>

            <div className="bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-xl overflow-hidden transition-colors">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-start bg-gray-50 dark:bg-white/5">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-tight">{contact.companyName}</h1>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className={`px-2 py-1 rounded border text-[10px] font-bold uppercase tracking-wider
                                ${contact.status === 'NEW' ? 'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10' :
                                    contact.status === 'APPOINTMENT_TAKEN' ? 'text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 shadow-none dark:shadow-[0_0_10px_rgba(34,197,94,0.2)]' :
                                        'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600/30 bg-gray-100 dark:bg-gray-500/10'}`}>
                                {contact.status}
                            </span>
                            <span className="font-mono text-xs flex items-center gap-2">
                                <Clock size={12} />
                                AJOUTÉ LE : {new Date(contact.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-all font-bold text-xs uppercase tracking-wider"
                        >
                            Modifier
                        </button>
                        <button
                            onClick={() => setIsAppointmentModalOpen(true)}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Calendar size={16} />
                            Prendre RDV
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
                    {/* Colonne Gauche : Infos */}
                    <div className="md:col-span-1 space-y-6">
                        <div className="bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 p-4 rounded-xl transition-colors">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 text-xs uppercase tracking-wider">
                                <Building size={14} className="text-red-600 dark:text-red-500" />
                                Informations Société
                            </h3>
                            <div className="space-y-4 text-sm">
                                {contact.siret && (
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">SIRET</span>
                                        <span className="font-mono text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            <Hash size={12} className="text-gray-400 dark:text-gray-600" />
                                            {contact.siret}
                                        </span>
                                    </div>
                                )}
                                {(contact.address || contact.city) && (
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Adresse</span>
                                        <div className="font-mono text-gray-700 dark:text-gray-300 flex items-start gap-2">
                                            <MapPin size={12} className="text-gray-400 dark:text-gray-600 mt-1" />
                                            <div>
                                                {contact.address}<br />
                                                {contact.zipCode} {contact.city}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 p-4 rounded-xl transition-colors">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 text-xs uppercase tracking-wider">
                                <Phone size={14} className="text-red-600 dark:text-red-500" />
                                Coordonnées
                            </h3>
                            <div className="space-y-4 text-sm">
                                {contact.phoneFixed && (
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Téléphone Fixe</span>
                                        <div className="flex items-center gap-2">
                                            <a href={`tel:${contact.phoneFixed}`} className="font-mono text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 transition-colors">
                                                {contact.phoneFixed}
                                            </a>
                                            <button
                                                onClick={() => handleCall(contact.phoneFixed!)}
                                                className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/10 rounded-full transition-colors border border-transparent hover:border-green-300 dark:hover:border-green-500/30"
                                                title="Appeler avec Aircall"
                                            >
                                                <Phone size={12} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {contact.phoneMobile && (
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Téléphone Mobile</span>
                                        <div className="flex items-center gap-2">
                                            <a href={`tel:${contact.phoneMobile}`} className="font-mono text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 transition-colors">
                                                {contact.phoneMobile}
                                            </a>
                                            <button
                                                onClick={() => handleCall(contact.phoneMobile!)}
                                                className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/10 rounded-full transition-colors border border-transparent hover:border-green-300 dark:hover:border-green-500/30"
                                                title="Appeler avec Aircall"
                                            >
                                                <Phone size={12} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {contact.email && (
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Email</span>
                                        <div className="flex items-center gap-2">
                                            <Mail size={12} className="text-gray-400 dark:text-gray-600" />
                                            <a href={`mailto:${contact.email}`} className="font-mono text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors text-xs">
                                                {contact.email}
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {contact.assignedTo && (
                            <div className="bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 p-4 rounded-xl transition-colors">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 text-xs uppercase tracking-wider">
                                    <User size={14} className="text-red-600 dark:text-red-500" />
                                    Suivi
                                </h3>
                                <div className="space-y-3 text-sm">
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Assigné à</span>
                                        <span className="font-mono text-gray-700 dark:text-gray-300">{contact.assignedTo.name}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Colonne Droite : Qualification & Historique */}
                    <div className="md:col-span-2 space-y-6">
                        <CallQualification
                            contact={contact}
                            latestCall={contact.calls && contact.calls.length > 0 ? contact.calls[0] : null}
                            onQualifySuccess={() => handleEditSuccess()}
                        />

                        <div className="bg-gray-50 dark:bg-[#050507]/30 border border-gray-200 dark:border-white/10 rounded-xl p-6 transition-colors">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-xs uppercase tracking-wider">Historique & Notes</h3>
                            <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-600 border-2 border-dashed border-gray-200 dark:border-white/5 rounded-lg">
                                <Clock size={32} className="mb-2 opacity-50" />
                                <p className="text-xs font-mono uppercase tracking-widest">Journal d'activité bientôt disponible</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ContactModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleEditSuccess}
                contactToEdit={contact}
            />

            <AppointmentModal
                isOpen={isAppointmentModalOpen}
                onClose={() => setIsAppointmentModalOpen(false)}
                onSuccess={() => {
                    handleEditSuccess();
                    // Optionnel : rediriger vers le calendrier ou afficher une notif
                }}
                contactId={contact.id}
                contactName={contact.companyName}
                contactAddress={`${contact.address || ''} ${contact.zipCode || ''} ${contact.city || ''}`}
            />
        </div >
    );
};

export default ContactDetails;

