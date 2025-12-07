import { useState, useEffect } from 'react';
import { X, Calendar, Clock, MessageSquare } from 'lucide-react';
import api from '../services/api';

interface CallbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    contactId?: string;
    contactName?: string;
    newStatus: string; // 'CALLBACK_LATER' or 'FOLLOW_UP'
}

const CallbackModal = ({ isOpen, onClose, onSuccess, contactId, contactName, newStatus }: CallbackModalProps) => {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Default to tomorrow 10:00
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setDate(tomorrow.toISOString().split('T')[0]);
            setTime('10:00');
            setNote('');
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contactId) return;

        setLoading(true);
        try {
            const nextCallDate = new Date(`${date}T${time}:00`);

            await api.put(`/contacts/${contactId}`, {
                status: newStatus,
                nextCallDate: nextCallDate.toISOString(),
                notes: note ? `[RAPPEL] ${note}` : undefined
            });

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error scheduling callback:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const title = newStatus === 'FOLLOW_UP' ? 'Programmer une Relance' : 'Programmer un Rappel';

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-md overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-white dark:bg-[#0A0A0C] transition-colors">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-widest">{title}</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">{contactName}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" size={16} />
                                <input
                                    type="date"
                                    required
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="pl-10 w-full px-3 py-2 bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 outline-none text-gray-900 dark:text-gray-300 text-sm [color-scheme:light] dark:[color-scheme:dark] transition-colors"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Heure</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" size={16} />
                                <input
                                    type="time"
                                    required
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="pl-10 w-full px-3 py-2 bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 outline-none text-gray-900 dark:text-gray-300 text-sm [color-scheme:light] dark:[color-scheme:dark] transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Note (Optionnel)</label>
                        <div className="relative">
                            <MessageSquare className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" size={16} />
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="pl-10 w-full px-3 py-2 bg-gray-50 dark:bg-[#050507]/50 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 outline-none text-gray-900 dark:text-gray-300 text-sm min-h-[80px] placeholder-gray-400 dark:placeholder-gray-600 transition-colors"
                                placeholder="Sujet du rappel..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
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
                            {loading ? 'Enregistrement...' : 'Programmer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CallbackModal;
