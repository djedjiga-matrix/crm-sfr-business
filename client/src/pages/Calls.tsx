import { useState, useEffect } from 'react';
import { Phone, Calendar, Clock } from 'lucide-react';
import api from '../services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Call {
    id: string;
    outcome: string;
    notes: string;
    duration: number;
    calledAt: string;
    contact: {
        id: string;
        companyName: string;
        phoneFixed: string;
        phoneMobile: string;
    };
    user: {
        name: string;
    };
}

const Calls = () => {
    const [calls, setCalls] = useState<Call[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchCalls = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/calls?page=${page}&limit=20`);
            setCalls(response.data.data);
            setTotalPages(response.data.meta.totalPages);
        } catch (error) {
            console.error('Error fetching calls:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCalls();
    }, [page]);

    const getOutcomeLabel = (outcome: string) => {
        const labels: any = {
            APPOINTMENT_TAKEN: { label: 'RDV Pris', color: 'text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/30 shadow-none dark:shadow-[0_0_10px_rgba(34,197,94,0.2)]' },
            UNREACHABLE: { label: 'Injoignable', color: 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30' },
            ANSWERING_MACHINE: { label: 'Répondeur', color: 'text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/30' },
            CALLBACK_LATER: { label: 'Rappeler', color: 'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30' },
            NOT_INTERESTED: { label: 'Pas intéressé', color: 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600/30' },
            BUSY: { label: 'Occupé', color: 'text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30' },
            REFUSAL: { label: 'Refus', color: 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30' },
            WRONG_CONTACT: { label: 'Mauvais num', color: 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600/30' },
            OTHER: { label: 'Autre', color: 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600/30' },
        };
        return labels[outcome] || { label: outcome, color: 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600/30' };
    };

    const formatDuration = (seconds: number) => {
        if (!seconds) return '-';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight uppercase">Historique des Appels <span className="text-red-600">.</span></h1>
                    <p className="text-gray-500 text-sm font-mono mt-1">SUIVI_COMMUNICATIONS</p>
                </div>
            </div>

            <div className="bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-xl overflow-hidden transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest">Date & Heure</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest">Contact</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest">Agent</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest">Résultat</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest">Durée</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 font-mono animate-pulse">
                                        CHARGEMENT_DONNÉES...
                                    </td>
                                </tr>
                            ) : calls.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 font-mono">
                                        AUCUN_HISTORIQUE_TROUVÉ
                                    </td>
                                </tr>
                            ) : (
                                calls.map((call) => {
                                    const outcomeInfo = getOutcomeLabel(call.outcome);
                                    return (
                                        <tr key={call.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 text-gray-900 dark:text-white font-mono text-xs">
                                                        <Calendar size={12} className="text-red-600/70 dark:text-red-500/70" />
                                                        <span>{format(new Date(call.calledAt), 'dd MMM yyyy', { locale: fr })}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-gray-500 font-mono text-[10px] ml-5">
                                                        <span>{format(new Date(call.calledAt), 'HH:mm')}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">{call.contact.companyName}</div>
                                                <div className="text-xs text-gray-500 font-mono flex items-center gap-2 mt-1">
                                                    <Phone size={12} className="text-gray-400 dark:text-gray-600" />
                                                    {call.contact.phoneMobile || call.contact.phoneFixed}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-[10px] font-bold text-gray-700 dark:text-gray-300">
                                                        {call.user.name.charAt(0)}
                                                    </div>
                                                    <span className="text-xs text-gray-700 dark:text-gray-300 font-mono uppercase tracking-wide">{call.user.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-1 rounded border text-[10px] font-bold uppercase tracking-wider bg-white dark:bg-[#050507] ${outcomeInfo.color}`}>
                                                    {outcomeInfo.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                    <Clock size={12} className="text-gray-400 dark:text-gray-600" />
                                                    {formatDuration(call.duration)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 max-w-xs truncate text-gray-500 text-xs italic">
                                                {call.notes || '-'}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination simple */}

                <div className="px-6 py-4 border-t border-gray-200 dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-white/5">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider transition-colors"
                    >
                        Précédent
                    </button>
                    <span className="text-xs font-mono text-gray-500">PAGE {page} / {totalPages}</span>
                    <button
                        disabled={page === totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider transition-colors"
                    >
                        Suivant
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Calls;

