import { Keyboard, X } from 'lucide-react';
import { shortcutsList } from '../hooks/useKeyboardShortcuts';

interface ShortcutsHelpProps {
    isOpen: boolean;
    onClose: () => void;
}

const ShortcutsHelp = ({ isOpen, onClose }: ShortcutsHelpProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white dark:bg-[#0E0E11] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-lg text-red-600 dark:text-red-500">
                            <Keyboard size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Raccourcis Clavier</h3>
                            <p className="text-xs text-gray-500">Naviguez plus vite</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Shortcuts List */}
                <div className="p-4 space-y-2">
                    {shortcutsList.map((shortcut, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg"
                        >
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                {shortcut.description}
                            </span>
                            <kbd className="px-2 py-1 bg-gray-200 dark:bg-white/10 rounded text-xs font-mono text-gray-600 dark:text-gray-400">
                                {shortcut.keys}
                            </kbd>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                    <p className="text-xs text-gray-500 text-center">
                        Appuyez sur <kbd className="px-1 bg-gray-200 dark:bg-white/10 rounded">?</kbd> pour ouvrir cette aide
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ShortcutsHelp;
