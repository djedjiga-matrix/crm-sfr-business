import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, X, Check, ChevronDown } from 'lucide-react';

interface Column {
    key: string;
    label: string;
    selected?: boolean;
}

interface ExportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (format: 'csv' | 'xlsx' | 'json', columns: string[]) => void;
    availableColumns: Column[];
    title?: string;
}

const ExportDialog = ({
    isOpen,
    onClose,
    onExport,
    availableColumns,
    title = 'Exporter les données'
}: ExportDialogProps) => {
    const [selectedColumns, setSelectedColumns] = useState<string[]>(
        availableColumns.filter(c => c.selected !== false).map(c => c.key)
    );
    const [format, setFormat] = useState<'csv' | 'xlsx' | 'json'>('xlsx');
    const [exporting, setExporting] = useState(false);

    if (!isOpen) return null;

    const toggleColumn = (key: string) => {
        setSelectedColumns(prev =>
            prev.includes(key)
                ? prev.filter(k => k !== key)
                : [...prev, key]
        );
    };

    const selectAll = () => {
        setSelectedColumns(availableColumns.map(c => c.key));
    };

    const deselectAll = () => {
        setSelectedColumns([]);
    };

    const handleExport = async () => {
        if (selectedColumns.length === 0) return;

        setExporting(true);
        try {
            await onExport(format, selectedColumns);
            onClose();
        } finally {
            setExporting(false);
        }
    };

    const formatOptions = [
        { value: 'xlsx', label: 'Excel (.xlsx)', icon: FileSpreadsheet, color: 'text-green-600' },
        { value: 'csv', label: 'CSV (.csv)', icon: FileText, color: 'text-blue-600' },
        { value: 'json', label: 'JSON (.json)', icon: FileText, color: 'text-orange-600' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-white dark:bg-[#0E0E11] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-lg text-red-600 dark:text-red-500">
                            <Download size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <div className="p-4 space-y-6">
                    {/* Format selection */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Format d'export
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {formatOptions.map(({ value, label, icon: Icon, color }) => (
                                <button
                                    key={value}
                                    onClick={() => setFormat(value as any)}
                                    className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${format === value
                                            ? 'border-red-500 bg-red-50 dark:bg-red-500/10'
                                            : 'border-gray-200 dark:border-white/10 hover:border-gray-300'
                                        }`}
                                >
                                    <Icon size={18} className={format === value ? 'text-red-500' : color} />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {label.split(' ')[0]}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Column selection */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Colonnes à exporter ({selectedColumns.length}/{availableColumns.length})
                            </label>
                            <div className="flex gap-2">
                                <button
                                    onClick={selectAll}
                                    className="text-xs text-red-600 hover:underline"
                                >
                                    Tout sélectionner
                                </button>
                                <span className="text-gray-300">|</span>
                                <button
                                    onClick={deselectAll}
                                    className="text-xs text-gray-500 hover:underline"
                                >
                                    Tout désélectionner
                                </button>
                            </div>
                        </div>

                        <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-white/10 rounded-lg">
                            {availableColumns.map((column) => (
                                <label
                                    key={column.key}
                                    className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer border-b border-gray-100 dark:border-white/5 last:border-0"
                                >
                                    <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${selectedColumns.includes(column.key)
                                            ? 'bg-red-600 text-white'
                                            : 'border-2 border-gray-300 dark:border-gray-600'
                                        }`}>
                                        {selectedColumns.includes(column.key) && <Check size={12} />}
                                    </div>
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        {column.label}
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={selectedColumns.includes(column.key)}
                                        onChange={() => toggleColumn(column.key)}
                                        className="sr-only"
                                    />
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 border-t border-gray-200 dark:border-white/10">
                    <span className="text-sm text-gray-500">
                        {selectedColumns.length === 0
                            ? 'Sélectionnez au moins une colonne'
                            : `${selectedColumns.length} colonne(s) sélectionnée(s)`}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={selectedColumns.length === 0 || exporting}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {exporting ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Download size={16} />
                            )}
                            Exporter
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Bouton d'export simple avec menu déroulant
interface QuickExportButtonProps {
    onExport: (format: 'csv' | 'xlsx') => void;
    loading?: boolean;
}

export const QuickExportButton = ({ onExport, loading }: QuickExportButtonProps) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            >
                {loading ? (
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin" />
                ) : (
                    <Download size={16} className="text-gray-600 dark:text-gray-400" />
                )}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Exporter</span>
                <ChevronDown size={14} className="text-gray-400" />
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-lg shadow-lg z-20 overflow-hidden">
                        <button
                            onClick={() => { onExport('xlsx'); setOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 text-left"
                        >
                            <FileSpreadsheet size={16} className="text-green-600" />
                            <span className="text-sm">Excel</span>
                        </button>
                        <button
                            onClick={() => { onExport('csv'); setOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 text-left"
                        >
                            <FileText size={16} className="text-blue-600" />
                            <span className="text-sm">CSV</span>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default ExportDialog;
