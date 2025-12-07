import { useState } from 'react';
import { X, Download, FileSpreadsheet, FileText, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';
import api from '../services/api';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    filters: any;
    totalContacts: number;
    filteredCount: number;
}

const ExportModal = ({ isOpen, onClose, filters, totalContacts, filteredCount }: ExportModalProps) => {
    const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
    const [scope, setScope] = useState<'filtered' | 'all'>('filtered');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleExport = async () => {
        setLoading(true);
        setError(null);
        try {
            const exportFilters = scope === 'filtered' ? filters : {};

            const response = await api.post('/contacts/export', {
                format,
                filters: exportFilters
            }, {
                responseType: 'blob'
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Smart Filename Generation
            const dateStr = new Date().toISOString().split('T')[0];
            let filename = `Contacts`;

            if (scope === 'filtered') {
                const parts = [];
                if (filters.agentIds && filters.agentIds.length > 0) parts.push(`Agents-${filters.agentIds.length}`);
                if (filters.dateStart && filters.dateEnd) parts.push(`Periode-${filters.dateStart}-${filters.dateEnd}`);
                if (filters.id) parts.push(`ID-${filters.id}`);
                if (filters.phone) parts.push(`Tel-${filters.phone}`);
                if (filters.status && filters.status.length > 0) parts.push(`Status-${filters.status.length}`);

                if (parts.length > 0) {
                    filename += `_${parts.join('_')}`;
                } else {
                    filename += `_All`;
                }
            } else {
                filename += `_Full_Database`;
            }

            filename += `_${dateStr}.${format}`;

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();

            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                onClose();
            }, 2000);
        } catch (err) {
            console.error('Export failed:', err);
            setError('Échec de l\'export. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 rounded-xl w-full max-w-md overflow-hidden shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in duration-200 transition-colors">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-white/5">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Download size={20} className="text-blue-600 dark:text-blue-500" />
                        Exporter les contacts
                    </h2>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Format Selection */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">Format d'export</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setFormat('xlsx')}
                                className={`flex flex-col items-center p-4 rounded-lg border transition-all ${format === 'xlsx'
                                    ? 'bg-green-50 dark:bg-green-600/20 border-green-500 text-green-700 dark:text-green-400'
                                    : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                                    }`}
                            >
                                <FileSpreadsheet size={24} className="mb-2" />
                                <span className="text-sm font-bold">Excel (.xlsx)</span>
                                <span className="text-[10px] opacity-70">Recommandé</span>
                            </button>
                            <button
                                onClick={() => setFormat('csv')}
                                className={`flex flex-col items-center p-4 rounded-lg border transition-all ${format === 'csv'
                                    ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-500 text-blue-700 dark:text-blue-400'
                                    : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                                    }`}
                            >
                                <FileText size={24} className="mb-2" />
                                <span className="text-sm font-bold">CSV (.csv)</span>
                                <span className="text-[10px] opacity-70">Universel</span>
                            </button>
                        </div>
                    </div>

                    {/* Scope Selection */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">Données à exporter</label>
                        <div className="space-y-2">
                            <label className={`flex items-center justify-between p-3 rounded border cursor-pointer transition-colors ${scope === 'filtered' ? 'bg-blue-50 dark:bg-white/10 border-blue-200 dark:border-white/30' : 'bg-transparent border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                                }`}>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="radio"
                                        name="scope"
                                        checked={scope === 'filtered'}
                                        onChange={() => setScope('filtered')}
                                        className="text-blue-600 dark:text-blue-500 focus:ring-blue-500 bg-transparent border-gray-300 dark:border-gray-600"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">Contacts filtrés actuels</span>
                                        <span className="text-xs text-gray-500">Respecte les filtres actifs</span>
                                    </div>
                                </div>
                                <span className="text-xs font-mono bg-gray-200 dark:bg-white/10 px-2 py-1 rounded text-gray-700 dark:text-white">{filteredCount}</span>
                            </label>

                            <label className={`flex items-center justify-between p-3 rounded border cursor-pointer transition-colors ${scope === 'all' ? 'bg-blue-50 dark:bg-white/10 border-blue-200 dark:border-white/30' : 'bg-transparent border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                                }`}>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="radio"
                                        name="scope"
                                        checked={scope === 'all'}
                                        onChange={() => setScope('all')}
                                        className="text-blue-600 dark:text-blue-500 focus:ring-blue-500 bg-transparent border-gray-300 dark:border-gray-600"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">Tous les contacts</span>
                                        <span className="text-xs text-gray-500">Base complète</span>
                                    </div>
                                </div>
                                <span className="text-xs font-mono bg-gray-200 dark:bg-white/10 px-2 py-1 rounded text-gray-700 dark:text-white">{totalContacts}</span>
                            </label>
                        </div>
                    </div>

                    {/* Info / Warning */}
                    <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded p-3 flex items-start gap-3">
                        <Calendar size={16} className="text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div className="text-xs text-blue-800 dark:text-blue-200">
                            <p className="font-bold mb-1">Période :</p>
                            <p>L'export inclura la "Dernière date de traitement" pour chaque contact.</p>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded p-3 flex items-center gap-3 text-red-600 dark:text-red-400 text-sm">
                            <AlertTriangle size={16} />
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3 bg-gray-50 dark:bg-white/5">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        disabled={loading}
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={loading || (scope === 'filtered' && filteredCount === 0)}
                        className={`px-6 py-2 rounded text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${success
                            ? 'bg-green-600 text-white'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Génération...
                            </>
                        ) : success ? (
                            <>
                                <CheckCircle size={16} />
                                Exporté !
                            </>
                        ) : (
                            <>
                                <Download size={16} />
                                Télécharger Export
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportModal;
