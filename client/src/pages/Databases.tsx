import { useState, useEffect } from 'react';
import api from '../services/api';
import { Database, FileText, Calendar, User, RefreshCw, Settings, X, Clock } from 'lucide-react';

interface DatabaseStats {
    id: string;
    name: string;
    filename: string;
    date: string;
    isActive: boolean;
    importerName: string;
    totalContacts: number;
    // Recyclage
    recycleEnabled: boolean;
    recycleNRP: boolean;
    recycleAnsweringMachine: boolean;
    recycleAbsent: boolean;
    recycleUnreachable: boolean;
    recycleDelayMinutes: number;
    stats: {
        exploitable: number;
        argumented: number;
        positive: number;
        counts: {
            exploitable: number;
            argumented: number;
            positive: number;
        }
    };
}

interface RecycleModalProps {
    isOpen: boolean;
    onClose: () => void;
    database: DatabaseStats | null;
    onSave: (settings: any) => void;
}

const RecycleSettingsModal = ({ isOpen, onClose, database, onSave }: RecycleModalProps) => {
    const [settings, setSettings] = useState({
        recycleEnabled: true,
        recycleNRP: true,
        recycleAnsweringMachine: true,
        recycleAbsent: true,
        recycleUnreachable: true,
        recycleDelayMinutes: 30
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (database) {
            setSettings({
                recycleEnabled: database.recycleEnabled,
                recycleNRP: database.recycleNRP,
                recycleAnsweringMachine: database.recycleAnsweringMachine,
                recycleAbsent: database.recycleAbsent,
                recycleUnreachable: database.recycleUnreachable,
                recycleDelayMinutes: database.recycleDelayMinutes
            });
        }
    }, [database]);

    const handleSave = async () => {
        setSaving(true);
        await onSave(settings);
        setSaving(false);
        onClose();
    };

    if (!isOpen || !database) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#0E0E11] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-500/20 rounded-lg text-orange-600 dark:text-orange-500">
                            <RefreshCw size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Configuration du Recyclage</h3>
                            <p className="text-xs text-gray-500 font-mono">{database.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Master Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-500/10 dark:to-orange-500/5 rounded-xl border border-orange-200 dark:border-orange-500/20">
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white">Recyclage Automatique</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Active le recyclage automatique pour cette base
                            </p>
                        </div>
                        <button
                            onClick={() => setSettings(s => ({ ...s, recycleEnabled: !s.recycleEnabled }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.recycleEnabled ? 'bg-orange-500 shadow-lg shadow-orange-500/30' : 'bg-gray-300 dark:bg-white/10'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.recycleEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {/* Status toggles */}
                    <div className={`space-y-3 transition-opacity ${settings.recycleEnabled ? '' : 'opacity-50 pointer-events-none'}`}>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Statuts à recycler</p>

                        <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                            <span className="text-sm text-gray-900 dark:text-white">NRP (Ne Répond Pas)</span>
                            <input
                                type="checkbox"
                                checked={settings.recycleNRP}
                                onChange={e => setSettings(s => ({ ...s, recycleNRP: e.target.checked }))}
                                className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                            />
                        </label>

                        <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                            <span className="text-sm text-gray-900 dark:text-white">Répondeur</span>
                            <input
                                type="checkbox"
                                checked={settings.recycleAnsweringMachine}
                                onChange={e => setSettings(s => ({ ...s, recycleAnsweringMachine: e.target.checked }))}
                                className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                            />
                        </label>

                        <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                            <span className="text-sm text-gray-900 dark:text-white">Absent</span>
                            <input
                                type="checkbox"
                                checked={settings.recycleAbsent}
                                onChange={e => setSettings(s => ({ ...s, recycleAbsent: e.target.checked }))}
                                className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                            />
                        </label>

                        <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                            <span className="text-sm text-gray-900 dark:text-white">Injoignable</span>
                            <input
                                type="checkbox"
                                checked={settings.recycleUnreachable}
                                onChange={e => setSettings(s => ({ ...s, recycleUnreachable: e.target.checked }))}
                                className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                            />
                        </label>
                    </div>

                    {/* Delay setting */}
                    <div className={`space-y-2 transition-opacity ${settings.recycleEnabled ? '' : 'opacity-50 pointer-events-none'}`}>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Clock size={12} /> Délai avant recyclage
                        </p>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                min="5"
                                max="1440"
                                value={settings.recycleDelayMinutes}
                                onChange={e => setSettings(s => ({ ...s, recycleDelayMinutes: parseInt(e.target.value) || 30 }))}
                                className="w-24 px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-center font-mono focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none"
                            />
                            <span className="text-sm text-gray-500">minutes</span>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            Les contacts seront recyclés après {settings.recycleDelayMinutes} minutes sans modification
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving && <RefreshCw size={14} className="animate-spin" />}
                        Enregistrer
                    </button>
                </div>
            </div>
        </div>
    );
};

const Databases = () => {
    const [databases, setDatabases] = useState<DatabaseStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDatabase, setSelectedDatabase] = useState<DatabaseStats | null>(null);
    const [isRecycleModalOpen, setIsRecycleModalOpen] = useState(false);

    useEffect(() => {
        fetchDatabases();
    }, []);

    const fetchDatabases = async () => {
        try {
            const response = await api.get('/databases');
            setDatabases(response.data.map((db: any) => ({
                ...db,
                isActive: db.isActive ?? true,
                recycleEnabled: db.recycleEnabled ?? true,
                recycleNRP: db.recycleNRP ?? true,
                recycleAnsweringMachine: db.recycleAnsweringMachine ?? true,
                recycleAbsent: db.recycleAbsent ?? true,
                recycleUnreachable: db.recycleUnreachable ?? true,
                recycleDelayMinutes: db.recycleDelayMinutes ?? 30
            })));
        } catch (error) {
            console.error('Error fetching databases:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            setDatabases(prevDatabases =>
                prevDatabases.map(db =>
                    db.id === id ? { ...db, isActive: !currentStatus } : db
                )
            );

            await api.put(`/databases/${id}/status`, { isActive: !currentStatus });
        } catch (error) {
            console.error('Error updating database status:', error);
            setDatabases(prevDatabases =>
                prevDatabases.map(db =>
                    db.id === id ? { ...db, isActive: currentStatus } : db
                )
            );
            alert('Erreur lors de la mise à jour du statut');
        }
    };

    const handleRecycle = async (id: string) => {
        if (!window.confirm('Êtes-vous sûr de vouloir recycler cette base ? Cela remettra en "Nouveau" tous les contacts non traités (NRP, Injoignables, etc.) sauf les RDV, Refus et Rappels.')) {
            return;
        }

        try {
            await api.post(`/databases/${id}/recycle`);
            alert('Base recyclée avec succès ! Les contacts sont à nouveau disponibles.');
            fetchDatabases();
        } catch (error) {
            console.error('Error recycling database:', error);
            alert('Erreur lors du recyclage de la base');
        }
    };

    const handleOpenRecycleSettings = (db: DatabaseStats) => {
        setSelectedDatabase(db);
        setIsRecycleModalOpen(true);
    };

    const handleSaveRecycleSettings = async (settings: any) => {
        if (!selectedDatabase) return;

        try {
            await api.put(`/databases/${selectedDatabase.id}/recycle-settings`, settings);
            setDatabases(prevDatabases =>
                prevDatabases.map(db =>
                    db.id === selectedDatabase.id ? { ...db, ...settings } : db
                )
            );
        } catch (error) {
            console.error('Error saving recycle settings:', error);
            alert('Erreur lors de la sauvegarde des paramètres');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight uppercase">Bases de données <span className="text-red-600">.</span></h1>
                    <p className="text-gray-500 text-sm font-mono mt-1">INGESTION_ET_MÉTRIQUES_DE_DONNÉES</p>
                </div>
            </div>

            <div className="bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-xl overflow-hidden transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest">Nom de la Base</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest">Date d'Importation</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest">Importé Par</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest text-center">Total</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest text-center">Exploitable</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest text-center">Argumenté</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest text-center">Positif</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500 font-mono animate-pulse">CHARGEMENT_DONNÉES...</td>
                                </tr>
                            ) : databases.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500 font-mono">AUCUNE_BASE_DE_DONNÉES_TROUVÉE</td>
                                </tr>
                            ) : (
                                databases.map((db) => (
                                    <tr key={db.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-gray-100 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 text-red-600 dark:text-red-500">
                                                    <Database size={16} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">{db.name}</div>
                                                    <div className="text-xs text-gray-500 font-mono flex items-center gap-1 mt-0.5">
                                                        <FileText size={10} />
                                                        {db.filename}
                                                    </div>
                                                    {/* Recyclage indicator */}
                                                    {db.recycleEnabled && (
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <RefreshCw size={10} className="text-orange-500" />
                                                            <span className="text-[10px] text-orange-600 dark:text-orange-400 font-mono">
                                                                Auto-recyclage: {db.recycleDelayMinutes}min
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                <Calendar size={12} />
                                                <span>{new Date(db.date).toLocaleDateString('fr-FR')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                <User size={12} />
                                                <span>{db.importerName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center px-2 py-1 rounded border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs font-mono text-gray-900 dark:text-white">
                                                {db.totalContacts}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">{db.stats.exploitable}%</span>
                                                <span className="text-[10px] text-gray-500 font-mono">({db.stats.counts.exploitable})</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-sm font-bold text-orange-600 dark:text-orange-400 font-mono">{db.stats.argumented}%</span>
                                                <span className="text-[10px] text-gray-500 font-mono">({db.stats.counts.argumented})</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-sm font-bold text-green-600 dark:text-green-400 font-mono">{db.stats.positive}%</span>
                                                <span className="text-[10px] text-gray-500 font-mono">({db.stats.counts.positive})</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleToggleStatus(db.id, db.isActive)}
                                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-red-500/50 ${db.isActive ? 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.4)]' : 'bg-gray-200 dark:bg-white/10'}`}
                                                    title={db.isActive ? "Désactiver la base" : "Activer la base"}
                                                >
                                                    <span
                                                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${db.isActive ? 'translate-x-5' : 'translate-x-1'}`}
                                                    />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenRecycleSettings(db)}
                                                    className="p-1.5 bg-gray-100 dark:bg-white/5 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-500 rounded-lg transition-colors border border-gray-200 dark:border-white/5 hover:border-blue-300 dark:hover:border-blue-500/30"
                                                    title="Configurer le recyclage automatique"
                                                >
                                                    <Settings size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleRecycle(db.id)}
                                                    className="p-1.5 bg-gray-100 dark:bg-white/5 hover:bg-orange-100 dark:hover:bg-orange-500/20 text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-500 rounded-lg transition-colors border border-gray-200 dark:border-white/5 hover:border-orange-300 dark:hover:border-orange-500/30"
                                                    title="Recycler manuellement (remet tout à Nouveau)"
                                                >
                                                    <RefreshCw size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <RecycleSettingsModal
                isOpen={isRecycleModalOpen}
                onClose={() => setIsRecycleModalOpen(false)}
                database={selectedDatabase}
                onSave={handleSaveRecycleSettings}
            />
        </div>
    );
};

export default Databases;
