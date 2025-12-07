import { useState, useEffect } from 'react';
import { X, Building, Phone, Mail, MapPin, Hash } from 'lucide-react';
import api from '../services/api';

interface Contact {
    id?: string;
    companyName: string;
    siret?: string;
    email?: string;
    phoneFixed?: string;
    phoneMobile?: string;
    address?: string;
    city?: string;
    zipCode?: string;
    status: string;
    managerName?: string;
    managerRole?: string;
    notes?: string;
    nextCallDate?: string;
}

interface ContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    contactToEdit?: Contact | null;
}

const ContactModal = ({ isOpen, onClose, onSuccess, contactToEdit }: ContactModalProps) => {
    const [formData, setFormData] = useState<Contact>({
        companyName: '',
        siret: '',
        email: '',
        phoneFixed: '',
        phoneMobile: '',
        address: '',
        city: '',
        zipCode: '',
        status: 'NEW',
        managerName: '',
        managerRole: '',
        notes: '',
        nextCallDate: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (contactToEdit) {
            setFormData(contactToEdit);
        } else {
            setFormData({
                companyName: '',
                siret: '',
                email: '',
                phoneFixed: '',
                phoneMobile: '',
                address: '',
                city: '',
                zipCode: '',
                status: 'NEW',
                managerName: '',
                managerRole: '',
                notes: '',
                nextCallDate: ''
            });
        }
        setError('');
    }, [contactToEdit, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (contactToEdit?.id) {
                await api.put(`/contacts/${contactToEdit.id}`, formData);
            } else {
                await api.post('/contacts', formData);
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || "Une erreur est survenue");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <form onSubmit={handleSubmit} className="w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-white dark:bg-[#0A0A0C] transition-colors">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex justify-between items-center shrink-0">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-widest">
                        {contactToEdit ? 'Modifier Contact' : 'Nouveau Contact'}
                    </h2>
                    <button type="button" onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 p-3 rounded-md text-xs font-mono">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Company Info */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-red-600 dark:text-red-500 uppercase tracking-widest mb-2 border-b border-red-200 dark:border-red-500/20 pb-1">Informations Société</h3>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Nom de l'entreprise</label>
                                <div className="relative">
                                    <Building className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" size={16} />
                                    <input
                                        type="text"
                                        required
                                        value={formData.companyName}
                                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                        className="pl-10 w-full px-3 py-2 bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 outline-none text-gray-900 dark:text-gray-300 text-sm placeholder-gray-400 dark:placeholder-gray-600 transition-colors"
                                        placeholder="SFR Business"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">SIRET</label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" size={16} />
                                    <input
                                        type="text"
                                        value={formData.siret || ''}
                                        onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                                        className="pl-10 w-full px-3 py-2 bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 outline-none text-gray-900 dark:text-gray-300 text-sm placeholder-gray-400 dark:placeholder-gray-600 transition-colors"
                                        placeholder="123 456 789 00012"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Statut</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 outline-none text-gray-900 dark:text-gray-300 text-sm transition-colors"
                                >
                                    <option value="NEW">Nouveau</option>
                                    <option value="FOLLOW_UP">Relance</option>
                                    <option value="CALLBACK_LATER">Rappeler</option>
                                    <option value="APPOINTMENT_TAKEN">RDV Pris</option>
                                    <option value="ALREADY_CLIENT">Client</option>
                                    <option value="NOT_INTERESTED">Pas intéressé</option>
                                    <option value="NRP">NRP</option>
                                </select>
                            </div>

                            {(formData.status === 'FOLLOW_UP' || formData.status === 'CALLBACK_LATER') && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label className="block text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">
                                        {formData.status === 'FOLLOW_UP' ? 'Date de Relance' : 'Date de Rappel'}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="datetime-local"
                                            required
                                            value={formData.nextCallDate ? new Date(formData.nextCallDate).toISOString().slice(0, 16) : ''}
                                            onChange={(e) => setFormData({ ...formData, nextCallDate: new Date(e.target.value).toISOString() })}
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-[#050507]/50 border border-red-500/30 rounded-lg focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 outline-none text-gray-900 dark:text-white text-sm [color-scheme:light] dark:[color-scheme:dark] transition-colors"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-red-600 dark:text-red-500 uppercase tracking-widest mb-2 border-b border-red-200 dark:border-red-500/20 pb-1">Coordonnées</h3>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" size={16} />
                                    <input
                                        type="email"
                                        value={formData.email || ''}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="pl-10 w-full px-3 py-2 bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 outline-none text-gray-900 dark:text-gray-300 text-sm placeholder-gray-400 dark:placeholder-gray-600 transition-colors"
                                        placeholder="contact@entreprise.com"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Tél. Fixe</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" size={16} />
                                        <input
                                            type="text"
                                            value={formData.phoneFixed || ''}
                                            onChange={(e) => setFormData({ ...formData, phoneFixed: e.target.value })}
                                            className="pl-10 w-full px-3 py-2 bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 outline-none text-gray-900 dark:text-gray-300 text-sm placeholder-gray-400 dark:placeholder-gray-600 transition-colors"
                                            placeholder="01 23 45 67 89"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Mobile</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" size={16} />
                                        <input
                                            type="text"
                                            value={formData.phoneMobile || ''}
                                            onChange={(e) => setFormData({ ...formData, phoneMobile: e.target.value })}
                                            className="pl-10 w-full px-3 py-2 bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 outline-none text-gray-900 dark:text-gray-300 text-sm placeholder-gray-400 dark:placeholder-gray-600 transition-colors"
                                            placeholder="06 12 34 56 78"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Manager Info */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-red-600 dark:text-red-500 uppercase tracking-widest mb-2 border-b border-red-200 dark:border-red-500/20 pb-1">Responsable</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Nom du Responsable</label>
                                <input
                                    type="text"
                                    value={formData.managerName || ''}
                                    onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 outline-none text-gray-900 dark:text-gray-300 text-sm placeholder-gray-400 dark:placeholder-gray-600 transition-colors"
                                    placeholder="Jean Dupont"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Fonction</label>
                                <input
                                    type="text"
                                    value={formData.managerRole || ''}
                                    onChange={(e) => setFormData({ ...formData, managerRole: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 outline-none text-gray-900 dark:text-gray-300 text-sm placeholder-gray-400 dark:placeholder-gray-600 transition-colors"
                                    placeholder="Directeur Général"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-4 pt-2">
                        <h3 className="text-xs font-bold text-red-600 dark:text-red-500 uppercase tracking-widest mb-2 border-b border-red-200 dark:border-red-500/20 pb-1">Commentaires</h3>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Notes / Historique</label>
                            <textarea
                                value={formData.notes || ''}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 outline-none text-gray-900 dark:text-gray-300 text-sm min-h-[100px] placeholder-gray-400 dark:placeholder-gray-600 transition-colors"
                                placeholder="Détails de la conversation..."
                            />
                        </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-4 pt-2">
                        <h3 className="text-xs font-bold text-red-600 dark:text-red-500 uppercase tracking-widest mb-2 border-b border-red-200 dark:border-red-500/20 pb-1">Adresse</h3>

                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Adresse</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" size={16} />
                                <input
                                    type="text"
                                    value={formData.address || ''}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="pl-10 w-full px-3 py-2 bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 outline-none text-gray-900 dark:text-gray-300 text-sm placeholder-gray-400 dark:placeholder-gray-600 transition-colors"
                                    placeholder="123 Avenue des Champs-Élysées"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Code Postal</label>
                                <input
                                    type="text"
                                    value={formData.zipCode || ''}
                                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 outline-none text-gray-900 dark:text-gray-300 text-sm placeholder-gray-400 dark:placeholder-gray-600 transition-colors"
                                    placeholder="75008"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Ville</label>
                                <input
                                    type="text"
                                    value={formData.city || ''}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 outline-none text-gray-900 dark:text-gray-300 text-sm placeholder-gray-400 dark:placeholder-gray-600 transition-colors"
                                    placeholder="Paris"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider"
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary"
                    >
                        {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ContactModal;
