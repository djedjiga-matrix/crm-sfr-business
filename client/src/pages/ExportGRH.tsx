import { useState, useEffect } from 'react';
import { FileText, Download, Calendar, Users, Filter, CheckSquare, Mail, RefreshCw, Eye } from 'lucide-react';
import api from '../services/api';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

const ExportGRH = () => {
    const [period, setPeriod] = useState('MONTH'); // DAY, WEEK, MONTH, CUSTOM
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [generating, setGenerating] = useState(false);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [showPreview, setShowPreview] = useState(false);

    // Options
    const [includeWorkHours, setIncludeWorkHours] = useState(true);
    const [includeProduction, setIncludeProduction] = useState(true);
    const [includeBreaks, setIncludeBreaks] = useState(true);
    const [includeAbsence, setIncludeAbsence] = useState(true);
    const [includeOvertime, setIncludeOvertime] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const handleGenerateExport = async () => {
        setGenerating(true);
        try {
            let start, end;
            const now = new Date();

            switch (period) {
                case 'DAY':
                    start = customStartDate ? new Date(customStartDate) : now;
                    end = customStartDate ? new Date(customStartDate) : now;
                    break;
                case 'WEEK':
                    start = startOfWeek(now, { weekStartsOn: 1 });
                    end = endOfWeek(now, { weekStartsOn: 1 });
                    break;
                case 'MONTH':
                    start = startOfMonth(now);
                    end = endOfMonth(now);
                    break;
                case 'CUSTOM':
                    start = new Date(customStartDate);
                    end = new Date(customEndDate);
                    break;
                default:
                    start = startOfMonth(now);
                    end = endOfMonth(now);
            }

            const response = await api.post('/grh/export', {
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                userIds: selectedUsers.length > 0 ? selectedUsers : undefined,
                format: 'excel'
            }, {
                responseType: 'blob'
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Export_GRH_${format(now, 'yyyyMMdd')}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error generating export:', error);
            alert('Erreur lors de la génération de l\'export');
        } finally {
            setGenerating(false);
        }
    };

    const handlePreview = async () => {
        setGenerating(true);
        try {
            let start, end;
            const now = new Date();

            switch (period) {
                case 'DAY':
                    start = customStartDate ? new Date(customStartDate) : now;
                    end = customStartDate ? new Date(customStartDate) : now;
                    break;
                case 'WEEK':
                    start = startOfWeek(now, { weekStartsOn: 1 });
                    end = endOfWeek(now, { weekStartsOn: 1 });
                    break;
                case 'MONTH':
                    start = startOfMonth(now);
                    end = endOfMonth(now);
                    break;
                case 'CUSTOM':
                    start = new Date(customStartDate);
                    end = new Date(customEndDate);
                    break;
                default:
                    start = startOfMonth(now);
                    end = endOfMonth(now);
            }

            const response = await api.post('/grh/export', {
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                userIds: selectedUsers.length > 0 ? selectedUsers : undefined,
                format: 'json'
            });

            setPreviewData(response.data);
            setShowPreview(true);
        } catch (error) {
            console.error('Error fetching preview:', error);
            alert('Erreur lors de la récupération de l\'aperçu');
        } finally {
            setGenerating(false);
        }
    };

    const toggleUser = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const selectAllUsers = () => {
        if (selectedUsers.length === users.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(users.map(u => u.id));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
                        <FileText className="text-blue-500" />
                        Export GRH - Gestion des Temps
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Génération de rapports détaillés pour la paie et le suivi RH
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Configuration */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Period Selection */}
                    <div className="bg-white dark:bg-[#0A0A0C] p-6 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Calendar size={20} className="text-blue-500" />
                            Période
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={() => setPeriod('MONTH')}
                                className={`p-4 rounded-lg border text-left transition-all ${period === 'MONTH' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 ring-1 ring-blue-500' : 'border-gray-200 dark:border-white/10 hover:border-blue-300'}`}
                            >
                                <div className="font-bold text-gray-900 dark:text-white">Mois en cours</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {format(startOfMonth(new Date()), 'dd/MM/yyyy')} - {format(endOfMonth(new Date()), 'dd/MM/yyyy')}
                                </div>
                            </button>
                            <button
                                onClick={() => setPeriod('WEEK')}
                                className={`p-4 rounded-lg border text-left transition-all ${period === 'WEEK' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 ring-1 ring-blue-500' : 'border-gray-200 dark:border-white/10 hover:border-blue-300'}`}
                            >
                                <div className="font-bold text-gray-900 dark:text-white">Semaine en cours</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'dd/MM/yyyy')} - {format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'dd/MM/yyyy')}
                                </div>
                            </button>
                            <button
                                onClick={() => setPeriod('CUSTOM')}
                                className={`p-4 rounded-lg border text-left transition-all ${period === 'CUSTOM' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 ring-1 ring-blue-500' : 'border-gray-200 dark:border-white/10 hover:border-blue-300'}`}
                            >
                                <div className="font-bold text-gray-900 dark:text-white">Personnalisé</div>
                                <div className="mt-2 flex gap-2">
                                    <input
                                        type="date"
                                        value={customStartDate}
                                        onChange={(e) => setCustomStartDate(e.target.value)}
                                        className="w-full bg-white dark:bg-[#050507] border border-gray-200 dark:border-white/10 rounded px-2 py-1 text-sm"
                                    />
                                    <span className="text-gray-400">-</span>
                                    <input
                                        type="date"
                                        value={customEndDate}
                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                        className="w-full bg-white dark:bg-[#050507] border border-gray-200 dark:border-white/10 rounded px-2 py-1 text-sm"
                                    />
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* User Selection */}
                    <div className="bg-white dark:bg-[#0A0A0C] p-6 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Users size={20} className="text-blue-500" />
                                Utilisateurs ({selectedUsers.length})
                            </h2>
                            <button
                                onClick={selectAllUsers}
                                className="text-sm text-blue-500 hover:text-blue-600 font-medium"
                            >
                                {selectedUsers.length === users.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-2">
                            {users.map(user => (
                                <div
                                    key={user.id}
                                    onClick={() => toggleUser(user.id)}
                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedUsers.includes(user.id) ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedUsers.includes(user.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-400'}`}>
                                        {selectedUsers.includes(user.id) && <CheckSquare size={12} className="text-white" />}
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm text-gray-900 dark:text-white">{user.name}</div>
                                        <div className="text-xs text-gray-500 uppercase">{user.role}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Data Options */}
                    <div className="bg-white dark:bg-[#0A0A0C] p-6 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Filter size={20} className="text-blue-500" />
                            Données à inclure
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={includeWorkHours} onChange={(e) => setIncludeWorkHours(e.target.checked)} className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500" />
                                <span className="text-gray-700 dark:text-gray-300">Heures de connexion/déconnexion</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={includeProduction} onChange={(e) => setIncludeProduction(e.target.checked)} className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500" />
                                <span className="text-gray-700 dark:text-gray-300">Temps de production effectif</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={includeBreaks} onChange={(e) => setIncludeBreaks(e.target.checked)} className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500" />
                                <span className="text-gray-700 dark:text-gray-300">Détail des pauses</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={includeAbsence} onChange={(e) => setIncludeAbsence(e.target.checked)} className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500" />
                                <span className="text-gray-700 dark:text-gray-300">Jours de présence/absence</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={includeOvertime} onChange={(e) => setIncludeOvertime(e.target.checked)} className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500" />
                                <span className="text-gray-700 dark:text-gray-300">Heures supplémentaires</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Right Column: Actions & Preview */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-[#0A0A0C] p-6 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm sticky top-24">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Action</h2>

                        <div className="space-y-4">
                            <button
                                onClick={handleGenerateExport}
                                disabled={generating}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {generating ? (
                                    <>
                                        <RefreshCw className="animate-spin" size={20} />
                                        Génération...
                                    </>
                                ) : (
                                    <>
                                        <Download size={20} />
                                        Générer l'export Excel
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handlePreview}
                                className="w-full py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-3 transition-all"
                            >
                                <Eye size={20} />
                                Aperçu des données
                            </button>

                            <button className="w-full py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-3 transition-all">
                                <Mail size={20} />
                                Envoyer par email
                            </button>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/5">
                            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Résumé</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Utilisateurs :</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{selectedUsers.length || 'Tous'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Format :</span>
                                    <span className="font-medium text-gray-900 dark:text-white">Excel (.xlsx)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Est. taille :</span>
                                    <span className="font-medium text-gray-900 dark:text-white">~150 KB</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-[#0A0A0C] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Aperçu des données</h3>
                            <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                Fermer
                            </button>
                        </div>
                        <div className="p-6 overflow-auto">
                            <pre className="bg-gray-50 dark:bg-black/50 p-4 rounded-lg text-xs font-mono text-gray-700 dark:text-gray-300 overflow-auto max-h-[60vh]">
                                {JSON.stringify(previewData, null, 2)}
                            </pre>
                        </div>
                        <div className="p-6 border-t border-gray-200 dark:border-white/10 flex justify-end">
                            <button
                                onClick={() => setShowPreview(false)}
                                className="px-4 py-2 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExportGRH;
