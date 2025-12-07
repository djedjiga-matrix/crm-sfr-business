import { useState } from 'react';
import { X, Coffee, Utensils, Phone, Activity, Clock } from 'lucide-react';

interface PauseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStartPause: (type: string, duration: number, reason?: string) => void;
}

const PAUSE_TYPES = [
    { id: 'SHORT', label: 'Pause courte', icon: Coffee, defaultDuration: 15, color: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' },
    { id: 'LUNCH', label: 'Déjeuner', icon: Utensils, defaultDuration: 60, color: 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400' },
    { id: 'PHONE', label: 'Téléphone perso', icon: Phone, defaultDuration: 10, color: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' },
    { id: 'OTHER', label: 'Autre', icon: Activity, defaultDuration: 15, color: 'bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400' },
];

const PauseModal = ({ isOpen, onClose, onStartPause }: PauseModalProps) => {
    const [selectedType, setSelectedType] = useState(PAUSE_TYPES[0]);
    const [duration, setDuration] = useState(PAUSE_TYPES[0].defaultDuration);
    const [reason, setReason] = useState('');

    if (!isOpen) return null;

    const handleStart = () => {
        onStartPause(selectedType.id, duration, reason);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-md bg-white dark:bg-[#0A0A0C] rounded-xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-white/5">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <Coffee size={20} className="text-orange-500" />
                        Gestion de Pause
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Type de pause</label>
                        <div className="grid grid-cols-2 gap-3">
                            {PAUSE_TYPES.map((type) => (
                                <button
                                    key={type.id}
                                    onClick={() => {
                                        setSelectedType(type);
                                        setDuration(type.defaultDuration);
                                    }}
                                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${selectedType.id === type.id
                                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 ring-1 ring-orange-500'
                                            : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                                        }`}
                                >
                                    <div className={`p-2 rounded-full ${type.color}`}>
                                        <type.icon size={16} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{type.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Durée estimée (minutes)</label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-2.5 text-gray-400" size={16} />
                            <input
                                type="number"
                                min="1"
                                value={duration}
                                onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none text-gray-900 dark:text-white transition-colors"
                            />
                        </div>
                    </div>

                    {selectedType.id === 'OTHER' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Motif</label>
                            <input
                                type="text"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Précisez le motif..."
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none text-gray-900 dark:text-white transition-colors"
                            />
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleStart}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-xs font-bold uppercase tracking-wider shadow-lg shadow-orange-500/20"
                    >
                        Démarrer la pause
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PauseModal;
