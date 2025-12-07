
import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Download, Search, Calendar, CheckSquare, Square, RefreshCw } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import api from '../services/api';

interface Recording {
    id: string;
    calledAt: string;
    duration: number;
    phoneNumber: string;
    recordingStatus: string;
    outcome: string;
    user: {
        id: string;
        name: string;
    };
    recordingUrl?: string;
    recordingPath?: string;
    contact: {
        id: string;
        companyName: string;
    } | null;
}

const Recordings = () => {
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        search: '',
        status: '',
        dateStart: '',
        dateEnd: '',
        agentId: '',
        outcome: ''
    });

    // Période prédéfinie
    const [periodFilter, setPeriodFilter] = useState<'all' | 'day' | 'week' | 'month' | 'custom'>('all');
    const [customStartDate, setCustomStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [customEndDate, setCustomEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    // Sélection multiple
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectAll, setSelectAll] = useState(false);

    const [currentAudio, setCurrentAudio] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [downloadingMultiple, setDownloadingMultiple] = useState(false);

    // Appliquer les filtres de période
    useEffect(() => {
        const now = new Date();
        let startDate = '';
        let endDate = '';

        switch (periodFilter) {
            case 'day':
                startDate = startOfDay(now).toISOString();
                endDate = endOfDay(now).toISOString();
                break;
            case 'week':
                startDate = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
                endDate = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
                break;
            case 'month':
                startDate = startOfMonth(now).toISOString();
                endDate = endOfMonth(now).toISOString();
                break;
            case 'custom':
                if (customStartDate && customEndDate) {
                    startDate = new Date(customStartDate).toISOString();
                    const end = new Date(customEndDate);
                    end.setHours(23, 59, 59, 999);
                    endDate = end.toISOString();
                }
                break;
            case 'all':
            default:
                startDate = '';
                endDate = '';
                break;
        }

        setFilters(prev => ({
            ...prev,
            dateStart: startDate,
            dateEnd: endDate
        }));
    }, [periodFilter, customStartDate, customEndDate]);

    useEffect(() => {
        fetchRecordings();
        // Reset selection when page or filters change
        setSelectedIds(new Set());
        setSelectAll(false);
    }, [page, filters]);

    const fetchRecordings = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20'
            });

            if (filters.search) params.append('search', filters.search);
            if (filters.status) params.append('status', filters.status);
            if (filters.dateStart) params.append('dateStart', filters.dateStart);
            if (filters.dateEnd) params.append('dateEnd', filters.dateEnd);
            if (filters.agentId) params.append('agentId', filters.agentId);
            if (filters.outcome) params.append('outcome', filters.outcome);

            const response = await api.get(`/recordings?${params}`);
            setRecordings(response.data.data);
            setTotalPages(response.data.meta.totalPages);
        } catch (error) {
            console.error('Error fetching recordings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePlay = (id: string) => {
        if (currentAudio === id) {
            if (isPlaying) {
                audioRef.current?.pause();
                setIsPlaying(false);
            } else {
                audioRef.current?.play();
                setIsPlaying(true);
            }
        } else {
            setCurrentAudio(id);
            setIsPlaying(true);
            if (audioRef.current) {
                const token = localStorage.getItem('token');
                audioRef.current.src = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/recordings/${id}/stream?token=${token}`;
                audioRef.current.play();
            }
        }
    };

    const handleDownload = async (id: string, filename: string) => {
        try {
            const token = localStorage.getItem('token');
            const link = document.createElement('a');
            link.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/recordings/${id}/stream?token=${token}`;
            link.download = `${filename}.mp3`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error downloading:', error);
        }
    };

    // Télécharger plusieurs enregistrements
    const handleDownloadSelected = async () => {
        if (selectedIds.size === 0) return;

        setDownloadingMultiple(true);
        try {
            const selectedRecordings = recordings.filter(rec => selectedIds.has(rec.id) && rec.recordingPath);

            for (let i = 0; i < selectedRecordings.length; i++) {
                const rec = selectedRecordings[i];
                await handleDownload(rec.id, generateFilename(rec));
                // Petit délai entre les téléchargements pour éviter de bloquer le navigateur
                if (i < selectedRecordings.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        } finally {
            setDownloadingMultiple(false);
        }
    };

    // Gestion de la sélection
    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
        setSelectAll(newSelected.size === recordings.filter(r => r.recordingPath).length);
    };

    const toggleSelectAll = () => {
        if (selectAll) {
            setSelectedIds(new Set());
            setSelectAll(false);
        } else {
            const allWithRecordings = recordings.filter(r => r.recordingPath).map(r => r.id);
            setSelectedIds(new Set(allWithRecordings));
            setSelectAll(true);
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const statusLabels: { [key: string]: string } = {
        'APPOINTMENT_TAKEN': 'RDV Pris',
        'CALLBACK_LATER': 'A Rappeler',
        'FOLLOW_UP': 'Relance',
        'NOT_INTERESTED': 'Pas Interesse',
        'UNREACHABLE': 'Injoignable',
        'ANSWERING_MACHINE': 'Repondeur',
        'ABSENT': 'Absent',
        'NRP': 'NRP',
        'WRONG_NUMBER': 'Faux Numero',
        'OUT_OF_TARGET': 'Hors Cible',
        'ALREADY_CLIENT': 'Deja Client',
        'OTHER': 'Autre'
    };

    const generateFilename = (rec: Recording): string => {
        const sanitize = (str: string | null | undefined): string => {
            if (!str) return 'Inconnu';
            return str
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9\s]/g, '')
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 20);
        };

        const agentName = sanitize(rec.user?.name);
        const companyName = sanitize(rec.contact?.companyName);
        const status = statusLabels[rec.outcome] || 'Non Qualifie';
        const dateStr = rec.calledAt
            ? new Date(rec.calledAt).toISOString().split('T')[0].replace(/-/g, '')
            : '';

        return `${agentName}_${companyName}_${status}_${dateStr}`;
    };

    const availableCount = recordings.filter(r => r.recordingPath).length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-wider">Enregistrements</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Gestion et écoute des appels enregistrés</p>
                </div>

                {/* Bouton export sélection */}
                {selectedIds.size > 0 && (
                    <button
                        onClick={handleDownloadSelected}
                        disabled={downloadingMultiple}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(22,163,74,0.3)] disabled:opacity-50"
                    >
                        {downloadingMultiple ? (
                            <>
                                <RefreshCw size={16} className="animate-spin" />
                                Téléchargement...
                            </>
                        ) : (
                            <>
                                <Download size={16} />
                                Télécharger ({selectedIds.size})
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-[#0E0E11] p-4 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm space-y-4">
                {/* Première ligne - Recherche et statut */}
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher par numéro..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-red-500/50 transition-colors"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>
                    <div className="w-40">
                        <select
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-red-500/50"
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="">Tous (traitement)</option>
                            <option value="UNTREATED">Non traité</option>
                            <option value="TREATED">Traité</option>
                        </select>
                    </div>
                    <div className="w-48">
                        <select
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-red-500/50"
                            value={filters.outcome}
                            onChange={(e) => setFilters({ ...filters, outcome: e.target.value })}
                        >
                            <option value="">Tous les résultats</option>
                            <option value="NEW">Nouveau</option>
                            <option value="NRP">NRP</option>
                            <option value="UNREACHABLE">Injoignable</option>
                            <option value="ANSWERING_MACHINE">Répondeur</option>
                            <option value="ABSENT">Absent</option>
                            <option value="CALLBACK_LATER">Rappeler</option>
                            <option value="FOLLOW_UP">Relance</option>
                            <option value="APPOINTMENT_TAKEN">RDV Pris</option>
                            <option value="NOT_INTERESTED">Pas intéressé</option>
                            <option value="OUT_OF_TARGET">Hors cible</option>
                            <option value="ALREADY_CLIENT">Client</option>
                            <option value="WRONG_NUMBER">Faux numéro</option>
                        </select>
                    </div>
                </div>

                {/* Deuxième ligne - Filtres de période */}
                <div className="flex flex-wrap items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2">Période :</span>

                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setPeriodFilter('all')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${periodFilter === 'all'
                                ? 'bg-red-600 text-white border-red-600 shadow-[0_0_10px_rgba(220,38,38,0.3)]'
                                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-red-400'
                                }`}
                        >
                            Tout
                        </button>
                        <button
                            onClick={() => setPeriodFilter('day')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${periodFilter === 'day'
                                ? 'bg-red-600 text-white border-red-600 shadow-[0_0_10px_rgba(220,38,38,0.3)]'
                                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-red-400'
                                }`}
                        >
                            Aujourd'hui
                        </button>
                        <button
                            onClick={() => setPeriodFilter('week')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${periodFilter === 'week'
                                ? 'bg-red-600 text-white border-red-600 shadow-[0_0_10px_rgba(220,38,38,0.3)]'
                                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-red-400'
                                }`}
                        >
                            Cette semaine
                        </button>
                        <button
                            onClick={() => setPeriodFilter('month')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${periodFilter === 'month'
                                ? 'bg-red-600 text-white border-red-600 shadow-[0_0_10px_rgba(220,38,38,0.3)]'
                                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-red-400'
                                }`}
                        >
                            Ce mois
                        </button>
                        <button
                            onClick={() => setPeriodFilter('custom')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${periodFilter === 'custom'
                                ? 'bg-red-600 text-white border-red-600 shadow-[0_0_10px_rgba(220,38,38,0.3)]'
                                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-red-400'
                                }`}
                        >
                            📅 Personnalisé
                        </button>
                    </div>

                    {/* Champs dates personnalisées */}
                    {periodFilter === 'custom' && (
                        <div className="flex items-center gap-2 ml-4">
                            <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="px-2 py-1 bg-white dark:bg-[#0E0E11] border border-gray-300 dark:border-white/20 rounded text-xs focus:ring-1 focus:ring-red-500 outline-none"
                            />
                            <span className="text-gray-400">→</span>
                            <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="px-2 py-1 bg-white dark:bg-[#0E0E11] border border-gray-300 dark:border-white/20 rounded text-xs focus:ring-1 focus:ring-red-500 outline-none"
                            />
                        </div>
                    )}
                </div>

                {/* Barre de sélection */}
                {availableCount > 0 && (
                    <div className="flex items-center gap-4 pt-2 border-t border-gray-200 dark:border-white/10">
                        <button
                            onClick={toggleSelectAll}
                            className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        >
                            {selectAll ? <CheckSquare size={16} className="text-red-500" /> : <Square size={16} />}
                            {selectAll ? 'Tout désélectionner' : 'Tout sélectionner'}
                        </button>
                        <span className="text-xs text-gray-400">
                            {selectedIds.size} sélectionné(s) sur {availableCount} disponible(s)
                        </span>
                    </div>
                )}
            </div>

            {/* Audio Player (Hidden but functional) */}
            <audio
                ref={audioRef}
                onEnded={() => setIsPlaying(false)}
                onPause={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                className="hidden"
            />

            {/* Table */}
            <div className="bg-white dark:bg-[#0E0E11] rounded-xl border border-gray-200 dark:border-white/5 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/5">
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">
                                    <button onClick={toggleSelectAll} className="hover:text-red-500 transition-colors">
                                        {selectAll ? <CheckSquare size={16} className="text-red-500" /> : <Square size={16} />}
                                    </button>
                                </th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Agent</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Client / Numéro</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Durée</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nom du fichier</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Statut</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-500">Chargement...</td>
                                </tr>
                            ) : recordings.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-500">Aucun enregistrement trouvé</td>
                                </tr>
                            ) : (
                                recordings.map((rec) => (
                                    <tr
                                        key={rec.id}
                                        className={`hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group ${selectedIds.has(rec.id) ? 'bg-red-50 dark:bg-red-500/10' : ''
                                            }`}
                                    >
                                        <td className="p-4">
                                            {rec.recordingPath && (
                                                <button
                                                    onClick={() => toggleSelect(rec.id)}
                                                    className="hover:text-red-500 transition-colors"
                                                >
                                                    {selectedIds.has(rec.id) ? (
                                                        <CheckSquare size={16} className="text-red-500" />
                                                    ) : (
                                                        <Square size={16} className="text-gray-400" />
                                                    )}
                                                </button>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                            {new Date(rec.calledAt).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">
                                            {rec.user?.name || 'Inconnu'}
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                            <div className="font-medium text-gray-900 dark:text-white">{rec.contact?.companyName || 'Nouveau Contact'}</div>
                                            <div className="text-xs text-gray-500">{rec.phoneNumber}</div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 dark:text-gray-300 font-mono">
                                            {formatDuration(rec.duration || 0)}
                                        </td>
                                        <td className="p-4 text-xs text-gray-500 dark:text-gray-400 font-mono max-w-[250px] truncate" title={`${generateFilename(rec)}.mp3`}>
                                            {generateFilename(rec)}.mp3
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit ${rec.recordingStatus === 'TREATED'
                                                ? 'bg-green-500/10 text-green-600'
                                                : 'bg-yellow-500/10 text-yellow-600'
                                                }`}>
                                                {rec.recordingStatus === 'TREATED' ? (
                                                    <>✓ Qualifié</>
                                                ) : (
                                                    <>⚠️ Non qualifié</>
                                                )}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {rec.recordingPath ? (
                                                    <>
                                                        <button
                                                            onClick={() => handlePlay(rec.id)}
                                                            className={`p-2 rounded-lg transition-colors ${currentAudio === rec.id && isPlaying
                                                                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                                                                : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-red-500 hover:text-white'
                                                                }`}
                                                            title="Écouter"
                                                        >
                                                            {currentAudio === rec.id && isPlaying ? <Pause size={16} /> : <Play size={16} />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownload(rec.id, generateFilename(rec))}
                                                            className="p-2 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                                                            title="Télécharger"
                                                        >
                                                            <Download size={16} />
                                                        </button>
                                                    </>
                                                ) : rec.recordingUrl ? (
                                                    <a
                                                        href={rec.recordingUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-500/20 transition-colors flex items-center gap-2 text-xs font-medium"
                                                        title="Fichier non disponible localement, ouvrir le lien Aircall"
                                                    >
                                                        <Download size={14} />
                                                        Lien Externe
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">Indisponible</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-gray-200 dark:border-white/5 flex justify-between items-center">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                    >
                        Précédent
                    </button>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} sur {totalPages}</span>
                    <button
                        disabled={page === totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                    >
                        Suivant
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Recordings;
