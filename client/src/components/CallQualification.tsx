
import React, { useState, useEffect } from 'react';
import { Save, FileAudio } from 'lucide-react';
import api from '../services/api';

interface Call {
    id: string;
    calledAt: string;
    duration: number;
    outcome: string;
    notes?: string;
    recordingPath?: string;
    recordingStatus?: string;
    user?: { name: string };
    phoneNumber?: string;
}

interface Contact {
    id: string;
    companyName: string;
    phoneFixed?: string;
    campaign?: { name: string };
}

interface Props {
    contact: Contact;
    latestCall: Call | null;
    onQualifySuccess: (outcome: string) => void;
}

const CallQualification: React.FC<Props> = ({ contact, latestCall, onQualifySuccess }) => {
    const [outcome, setOutcome] = useState('');
    const [notes, setNotes] = useState('');
    const [nextCallDate, setNextCallDate] = useState('');
    const [previewName, setPreviewName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Generate preview whenever relevant fields change
    useEffect(() => {
        const sanitize = (str: string) => str?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').substring(0, 50) || '';

        const company = contact.companyName ? sanitize(contact.companyName) : 'Entreprise_Inconnue';
        const phone = contact.phoneFixed ? sanitize(contact.phoneFixed) : (latestCall?.phoneNumber ? sanitize(latestCall.phoneNumber) : 'Tel_Inconnu');
        const statusStr = outcome ? sanitize(outcome) : 'Non_Qualifie';
        const campaignName = contact.campaign?.name ? sanitize(contact.campaign.name).toUpperCase() : 'CAMPAGNE_INCONNUE';
        const agentName = latestCall?.user?.name ? sanitize(latestCall.user.name).toUpperCase() : 'AGENT';

        setPreviewName(`${company}_${phone}_${statusStr}_${campaignName}_${agentName}.mp3`);
    }, [outcome, contact, latestCall]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setLoading(true);
        setError('');

        try {
            // Map outcome to contact status - Le statut du contact correspond au outcome
            const contactStatus = outcome;

            // Only include nextCallDate if it matches a callback outcome
            const shouldHaveDate = outcome === 'CALLBACK_LATER' || outcome === 'FOLLOW_UP';
            const dateToSend = (shouldHaveDate && nextCallDate) ? new Date(nextCallDate).toISOString() : null;

            // LOG DÉTAILLÉ pour debug
            console.log('[CallQualification] ====== QUALIFICATION DEBUG ======');
            console.log('[CallQualification] Contact:', { id: contact.id, name: contact.companyName });
            console.log('[CallQualification] latestCall:', latestCall ? {
                id: latestCall.id,
                calledAt: latestCall.calledAt,
                recordingPath: latestCall.recordingPath || 'AUCUN',
                currentOutcome: latestCall.outcome
            } : 'NULL - Pas d\'appel lié');
            console.log('[CallQualification] New outcome:', outcome);

            if (latestCall) {
                console.log('[CallQualification] ✅ Using call endpoint for call:', latestCall.id);
                console.log('[CallQualification] Has recording:', !!latestCall.recordingPath);
                await api.post(`/calls/${latestCall.id}/qualify`, {
                    outcome,
                    notes,
                    contactStatus,
                    nextCallDate: dateToSend
                });
            } else {
                console.log('[CallQualification] Using contact endpoint for contact:', contact.id);
                // Manual qualification without a call record
                await api.post(`/contacts/${contact.id}/qualify`, {
                    outcome,
                    notes,
                    contactStatus,
                    nextCallDate: dateToSend
                });
            }

            console.log('[CallQualification] API call successful, calling onQualifySuccess with:', outcome);
            onQualifySuccess(outcome);
            setOutcome('');
            setNotes('');
            setNextCallDate('');
        } catch (err: any) {
            console.error('[CallQualification] Error:', err);
            console.error('[CallQualification] Error response:', err.response?.data);
            setError(err.response?.data?.message || 'Erreur lors de la qualification');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-[#0E0E11] border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                <FileAudio size={16} className="text-red-500" />
                {latestCall && latestCall.calledAt && !isNaN(new Date(latestCall.calledAt).getTime())
                    ? `Qualification de l'appel du ${new Date(latestCall.calledAt).toLocaleString()}`
                    : 'Qualification Manuelle'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Résultat de l'appel</label>
                    <select
                        value={outcome}
                        onChange={(e) => setOutcome(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-red-500/50"
                        required
                    >
                        <option value="">Sélectionner...</option>
                        <option value="APPOINTMENT_TAKEN">RDV Pris</option>
                        <option value="CALLBACK_LATER">À rappeler</option>
                        <option value="FOLLOW_UP">Relance</option>
                        <option value="NOT_INTERESTED">Pas intéressé</option>
                        <option value="UNREACHABLE">Injoignable</option>
                        <option value="ANSWERING_MACHINE">Répondeur</option>
                        <option value="ABSENT">Absent</option>
                        <option value="NRP">NRP (Ne Répond Pas)</option>
                        <option value="WRONG_NUMBER">Faux numéro</option>
                        <option value="OUT_OF_TARGET">Hors cible</option>
                        <option value="ALREADY_CLIENT">Déjà client</option>
                    </select>
                </div>

                {(outcome === 'CALLBACK_LATER' || outcome === 'FOLLOW_UP') && (
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Date de rappel</label>
                        <input
                            type="datetime-local"
                            value={nextCallDate}
                            onChange={(e) => setNextCallDate(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-red-500/50"
                            required
                        />
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Notes</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-red-500/50 min-h-[80px]"
                        placeholder="Commentaires sur l'appel..."
                    />
                </div>

                {/* Preview Nomenclature */}
                <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-lg border border-gray-200 dark:border-white/10">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Aperçu du nom de fichier</p>
                    <p className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all">
                        {previewName}
                    </p>
                </div>

                {error && <p className="text-red-500 text-xs">{error}</p>}

                <button
                    type="submit"
                    disabled={loading || !outcome}
                    className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? 'Enregistrement...' : (
                        <>
                            <Save size={16} />
                            Valider et Enregistrer
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

export default CallQualification;
