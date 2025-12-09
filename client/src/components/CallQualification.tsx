
import React, { useState, useEffect } from 'react';
import { Save, FileAudio, AlertTriangle, ShieldAlert } from 'lucide-react';
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

// Sous-qualifications pour OUT_OF_TARGET
const OUT_OF_TARGET_REASONS = [
    { value: 'PARTICULIER', label: 'Particulier (pas une entreprise)' },
    { value: 'RETRAITE', label: 'À la retraite' },
    { value: 'LIQUIDATION', label: 'En liquidation' },
    { value: 'ARRET_ACTIVITE', label: 'Arrêt de l\'activité' },
    { value: 'GERE_PAR_SIEGE', label: 'Géré par un siège' },
    { value: 'DEJA_DEMARCHEE', label: 'Déjà démarchée récemment' },
    { value: 'AUTRES', label: 'Autres' },
];

const CallQualification: React.FC<Props> = ({ contact, latestCall, onQualifySuccess }) => {
    const [outcome, setOutcome] = useState('');
    const [subStatus, setSubStatus] = useState('');
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

    // Reset subStatus when outcome changes
    useEffect(() => {
        if (outcome !== 'OUT_OF_TARGET') {
            setSubStatus('');
        }
    }, [outcome]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation pour OUT_OF_TARGET
        if (outcome === 'OUT_OF_TARGET' && !subStatus) {
            setError('Veuillez sélectionner une raison pour "Hors cible"');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const contactStatus = outcome;

            const shouldHaveDate = outcome === 'CALLBACK_LATER' || outcome === 'FOLLOW_UP';
            const dateToSend = (shouldHaveDate && nextCallDate) ? new Date(nextCallDate).toISOString() : null;

            console.log('[CallQualification] ====== QUALIFICATION DEBUG ======');
            console.log('[CallQualification] Contact:', { id: contact.id, name: contact.companyName });
            console.log('[CallQualification] Outcome:', outcome, 'SubStatus:', subStatus);

            const payload = {
                outcome,
                notes,
                contactStatus,
                nextCallDate: dateToSend,
                subStatus: outcome === 'OUT_OF_TARGET' ? subStatus : null
            };

            if (latestCall) {
                await api.post(`/calls/${latestCall.id}/qualify`, payload);
            } else {
                await api.post(`/contacts/${contact.id}/qualify`, payload);
            }

            onQualifySuccess(outcome);
            setOutcome('');
            setSubStatus('');
            setNotes('');
            setNextCallDate('');
        } catch (err: any) {
            console.error('[CallQualification] Error:', err);
            setError(err.response?.data?.message || 'Erreur lors de la qualification');
        } finally {
            setLoading(false);
        }
    };

    const isRgpdStatus = outcome === 'BLACKLISTED' || outcome === 'REFUS_ARGU';

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
                        <optgroup label="✅ Positif">
                            <option value="APPOINTMENT_TAKEN">🎯 RDV Pris</option>
                        </optgroup>
                        <optgroup label="📞 À recontacter">
                            <option value="CALLBACK_LATER">📅 À rappeler</option>
                            <option value="FOLLOW_UP">🔄 Relance</option>
                        </optgroup>
                        <optgroup label="📵 Non joignable">
                            <option value="NRP">📵 NRP (Ne Répond Pas)</option>
                            <option value="UNREACHABLE">❌ Injoignable</option>
                            <option value="ANSWERING_MACHINE">📼 Répondeur</option>
                            <option value="ABSENT">🚫 Absent</option>
                        </optgroup>
                        <optgroup label="🚫 Négatif">
                            <option value="NOT_INTERESTED">👎 Pas intéressé</option>
                            <option value="WRONG_NUMBER">📞 Faux numéro</option>
                            <option value="OUT_OF_TARGET">🎯 Hors cible</option>
                            <option value="ALREADY_CLIENT">✅ Déjà client</option>
                        </optgroup>
                        <optgroup label="⚠️ RGPD - Ne plus contacter">
                            <option value="BLACKLISTED">🚫 Blacklisté (RGPD)</option>
                            <option value="REFUS_ARGU">❌ Refus argumenté</option>
                        </optgroup>
                    </select>
                </div>

                {/* Avertissement RGPD */}
                {isRgpdStatus && (
                    <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg flex items-start gap-3">
                        <ShieldAlert className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                        <div>
                            <p className="text-sm font-bold text-red-700 dark:text-red-400">
                                {outcome === 'BLACKLISTED' ? 'Contact Blacklisté' : 'Refus Argumenté'}
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400/80 mt-1">
                                {outcome === 'BLACKLISTED'
                                    ? 'Ce contact ne souhaite plus être démarché. Il sera exclu de toutes les campagnes (RGPD).'
                                    : 'Ce contact a refusé l\'offre de manière argumentée. Il sera marqué comme définitivement non intéressé.'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Sous-qualification pour Hors cible */}
                {outcome === 'OUT_OF_TARGET' && (
                    <div className="p-3 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="text-orange-500" size={16} />
                            <label className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wider">
                                Raison hors cible <span className="text-red-500">*</span>
                            </label>
                        </div>
                        <select
                            value={subStatus}
                            onChange={(e) => setSubStatus(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-[#0A0A0C] border border-orange-300 dark:border-orange-500/30 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                            required
                        >
                            <option value="">Sélectionner la raison...</option>
                            {OUT_OF_TARGET_REASONS.map(reason => (
                                <option key={reason.value} value={reason.value}>{reason.label}</option>
                            ))}
                        </select>
                    </div>
                )}

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
                    disabled={loading || !outcome || (outcome === 'OUT_OF_TARGET' && !subStatus)}
                    className={`w-full py-2 rounded-lg font-bold text-sm uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${isRgpdStatus
                            ? 'bg-red-700 hover:bg-red-800 text-white'
                            : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                >
                    {loading ? 'Enregistrement...' : (
                        <>
                            <Save size={16} />
                            {isRgpdStatus ? 'Confirmer le blocage RGPD' : 'Valider et Enregistrer'}
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

export default CallQualification;
