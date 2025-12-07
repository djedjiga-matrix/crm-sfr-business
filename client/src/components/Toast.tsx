import { useState, useEffect, createContext, useContext } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

interface Toast {
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
    duration?: number;
}

interface ToastContextType {
    showToast: (type: Toast['type'], message: string, duration?: number) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (type: Toast['type'], message: string, duration = 3000) => {
        const id = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id, type, message, duration }]);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const success = (message: string) => showToast('success', message);
    const error = (message: string) => showToast('error', message);
    const info = (message: string) => showToast('info', message);

    return (
        <ToastContext.Provider value={{ showToast, success, error, info }}>
            {children}
            {/* Toast Container */}
            <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2">
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

const ToastItem = ({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onRemove(toast.id);
        }, toast.duration || 3000);
        return () => clearTimeout(timer);
    }, [toast.id, toast.duration, onRemove]);

    const icons = {
        success: <CheckCircle size={18} className="text-green-500" />,
        error: <AlertCircle size={18} className="text-red-500" />,
        info: <Info size={18} className="text-blue-500" />
    };

    const bgColors = {
        success: 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20',
        error: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20',
        info: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20'
    };

    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm animate-in slide-in-from-right-full duration-300 ${bgColors[toast.type]}`}>
            {icons[toast.type]}
            <span className="text-sm font-medium text-gray-900 dark:text-white">{toast.message}</span>
            <button
                onClick={() => onRemove(toast.id)}
                className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors ml-2"
            >
                <X size={14} className="text-gray-400" />
            </button>
        </div>
    );
};

// Utility function for copying to clipboard with feedback
export const copyToClipboard = async (text: string, showFeedback?: (msg: string) => void) => {
    try {
        await navigator.clipboard.writeText(text);
        showFeedback?.('Copié !');
        return true;
    } catch (error) {
        console.error('Failed to copy:', error);
        showFeedback?.('Erreur de copie');
        return false;
    }
};
