import { useState, createContext, useContext, useCallback } from 'react';
import { AlertTriangle, X, Trash2, Check } from 'lucide-react';

interface ConfirmDialogOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void | Promise<void>;
    onCancel?: () => void;
}

interface ConfirmDialogContextType {
    confirm: (options: ConfirmDialogOptions) => void;
    confirmDelete: (itemName: string, onConfirm: () => void | Promise<void>) => void;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | undefined>(undefined);

export const useConfirmDialog = () => {
    const context = useContext(ConfirmDialogContext);
    if (!context) {
        throw new Error('useConfirmDialog must be used within ConfirmDialogProvider');
    }
    return context;
};

export const ConfirmDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [dialog, setDialog] = useState<ConfirmDialogOptions | null>(null);
    const [loading, setLoading] = useState(false);

    const confirm = useCallback((options: ConfirmDialogOptions) => {
        setDialog(options);
    }, []);

    const confirmDelete = useCallback((itemName: string, onConfirm: () => void | Promise<void>) => {
        setDialog({
            title: 'Confirmer la suppression',
            message: `Êtes-vous sûr de vouloir supprimer "${itemName}" ? Cette action est irréversible.`,
            confirmText: 'Supprimer',
            cancelText: 'Annuler',
            type: 'danger',
            onConfirm
        });
    }, []);

    const handleConfirm = async () => {
        if (!dialog) return;
        setLoading(true);
        try {
            await dialog.onConfirm();
        } finally {
            setLoading(false);
            setDialog(null);
        }
    };

    const handleCancel = () => {
        if (dialog?.onCancel) {
            dialog.onCancel();
        }
        setDialog(null);
    };

    const typeStyles = {
        danger: {
            bg: 'bg-red-100 dark:bg-red-500/20',
            icon: 'text-red-600 dark:text-red-500',
            button: 'bg-red-600 hover:bg-red-700 text-white'
        },
        warning: {
            bg: 'bg-yellow-100 dark:bg-yellow-500/20',
            icon: 'text-yellow-600 dark:text-yellow-500',
            button: 'bg-yellow-600 hover:bg-yellow-700 text-white'
        },
        info: {
            bg: 'bg-blue-100 dark:bg-blue-500/20',
            icon: 'text-blue-600 dark:text-blue-500',
            button: 'bg-blue-600 hover:bg-blue-700 text-white'
        }
    };

    return (
        <ConfirmDialogContext.Provider value={{ confirm, confirmDelete }}>
            {children}

            {/* Dialog Modal */}
            {dialog && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={handleCancel}
                    />

                    {/* Dialog */}
                    <div className="relative w-full max-w-md bg-white dark:bg-[#0E0E11] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-start gap-4 p-6">
                            <div className={`p-3 rounded-full ${typeStyles[dialog.type || 'danger'].bg}`}>
                                {dialog.type === 'danger' ? (
                                    <Trash2 size={24} className={typeStyles[dialog.type || 'danger'].icon} />
                                ) : (
                                    <AlertTriangle size={24} className={typeStyles[dialog.type || 'danger'].icon} />
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {dialog.title}
                                </h3>
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                    {dialog.message}
                                </p>
                            </div>
                            <button
                                onClick={handleCancel}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 p-4 bg-gray-50 dark:bg-white/5 border-t border-gray-200 dark:border-white/10">
                            <button
                                onClick={handleCancel}
                                disabled={loading}
                                className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-white/20 transition-colors disabled:opacity-50"
                            >
                                {dialog.cancelText || 'Annuler'}
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={loading}
                                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${typeStyles[dialog.type || 'danger'].button}`}
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        {dialog.type === 'danger' ? <Trash2 size={16} /> : <Check size={16} />}
                                        {dialog.confirmText || 'Confirmer'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmDialogContext.Provider>
    );
};

export default ConfirmDialogProvider;
