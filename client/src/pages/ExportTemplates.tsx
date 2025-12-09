import { useState, useEffect } from 'react';
import {
    FileSpreadsheet, Plus, Edit, Trash2, Download, X, Check, ChevronDown,
    ChevronRight, Save, Database, Users, Building, FileText, Calendar,
    RefreshCw, Eye, Copy, Settings
} from 'lucide-react';
import api from '../services/api';

interface ExportField {
    label: string;
    type: string;
}

interface FieldCategory {
    label: string;
    fields: Record<string, ExportField>;
}

interface ExportTemplate {
    id: string;
    name: string;
    description?: string;
    fields: string[];
    includeHeader: boolean;
    separator: string;
    dateFormat: string;
    isDefault: boolean;
    isActive: boolean;
    createdAt: string;
}

interface DatabaseOption {
    id: string;
    name: string;
    totalContacts: number;
    campaignName?: string;
}

interface User {
    id: string;
    name: string;
    role: string;
}

const ExportTemplates = () => {
    const [templates, setTemplates] = useState<ExportTemplate[]>([]);
    const [availableFields, setAvailableFields] = useState<Record<string, FieldCategory>>({});
    const [databases, setDatabases] = useState<DatabaseOption[]>([]);
    const [agents, setAgents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<ExportTemplate | null>(null);

    // Form states
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formFields, setFormFields] = useState<string[]>([]);
    const [formIncludeHeader, setFormIncludeHeader] = useState(true);
    const [formSeparator, setFormSeparator] = useState(';');
    const [formDateFormat, setFormDateFormat] = useState('dd/MM/yyyy HH:mm');
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    // Export modal states
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [selectedDatabaseIds, setSelectedDatabaseIds] = useState<string[]>([]);
    const [exporting, setExporting] = useState(false);

    // Export filters
    const [filterDateStart, setFilterDateStart] = useState<string>('');
    const [filterDateEnd, setFilterDateEnd] = useState<string>('');
    const [filterAgentId, setFilterAgentId] = useState<string>('');

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [templatesRes, fieldsRes, databasesRes, usersRes] = await Promise.all([
                api.get('/export-templates'),
                api.get('/export-templates/fields'),
                api.get('/databases'),
                api.get('/users')
            ]);

            setTemplates(templatesRes.data);
            setAvailableFields(fieldsRes.data);
            setDatabases(databasesRes.data);
            setAgents(usersRes.data.filter((u: User) => u.role === 'AGENT' || u.role === 'SUPERVISEUR'));

            // Expand all categories by default
            setExpandedCategories(new Set(Object.keys(fieldsRes.data)));
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingTemplate(null);
        setFormName('');
        setFormDescription('');
        setFormFields([]);
        setFormIncludeHeader(true);
        setFormSeparator(';');
        setFormDateFormat('dd/MM/yyyy HH:mm');
        setIsModalOpen(true);
    };

    const openEditModal = (template: ExportTemplate) => {
        setEditingTemplate(template);
        setFormName(template.name);
        setFormDescription(template.description || '');
        setFormFields([...template.fields]);
        setFormIncludeHeader(template.includeHeader);
        setFormSeparator(template.separator);
        setFormDateFormat(template.dateFormat);
        setIsModalOpen(true);
    };

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(category)) {
                next.delete(category);
            } else {
                next.add(category);
            }
            return next;
        });
    };

    const toggleField = (fieldKey: string) => {
        setFormFields(prev =>
            prev.includes(fieldKey)
                ? prev.filter(f => f !== fieldKey)
                : [...prev, fieldKey]
        );
    };

    const selectAllInCategory = (category: string) => {
        const categoryFields = Object.keys(availableFields[category].fields);
        const allSelected = categoryFields.every(f => formFields.includes(f));

        if (allSelected) {
            setFormFields(prev => prev.filter(f => !categoryFields.includes(f)));
        } else {
            setFormFields(prev => [...new Set([...prev, ...categoryFields])]);
        }
    };

    const handleSave = async () => {
        if (!formName || formFields.length === 0) return;

        setSaving(true);
        try {
            const data = {
                name: formName,
                description: formDescription,
                fields: formFields,
                includeHeader: formIncludeHeader,
                separator: formSeparator,
                dateFormat: formDateFormat
            };

            if (editingTemplate) {
                await api.put(`/export-templates/${editingTemplate.id}`, data);
            } else {
                await api.post('/export-templates', data);
            }

            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Error saving template:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer ce modèle d\'export ?')) return;

        try {
            await api.delete(`/export-templates/${id}`);
            fetchData();
        } catch (error) {
            console.error('Error deleting template:', error);
        }
    };

    const openExportModal = (templateId?: string) => {
        setSelectedTemplateId(templateId || '');
        setSelectedDatabaseIds([]);
        setFilterDateStart('');
        setFilterDateEnd('');
        setFilterAgentId('');
        setIsExportModalOpen(true);
    };

    const toggleDatabaseSelection = (dbId: string) => {
        setSelectedDatabaseIds(prev =>
            prev.includes(dbId)
                ? prev.filter(id => id !== dbId)
                : [...prev, dbId]
        );
    };

    const handleExport = async () => {
        if (!selectedTemplateId || selectedDatabaseIds.length === 0) return;

        setExporting(true);
        try {
            const filters: any = {};
            if (filterDateStart) filters.dateStart = filterDateStart;
            if (filterDateEnd) filters.dateEnd = filterDateEnd;
            if (filterAgentId) filters.agentId = filterAgentId;

            const response = await api.post('/export-templates/execute', {
                templateId: selectedTemplateId,
                databaseIds: selectedDatabaseIds,
                filters
            }, {
                responseType: 'blob'
            });

            // Download the file
            const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            // Get filename from headers or generate one
            const contentDisposition = response.headers['content-disposition'];
            let filename = 'export.csv';
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?(.+)"?/);
                if (match) filename = match[1];
            }

            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            setIsExportModalOpen(false);
        } catch (error) {
            console.error('Error exporting:', error);
            alert('Erreur lors de l\'export');
        } finally {
            setExporting(false);
        }
    };

    const duplicateTemplate = async (template: ExportTemplate) => {
        try {
            await api.post('/export-templates', {
                name: `${template.name} (copie)`,
                description: template.description,
                fields: template.fields,
                includeHeader: template.includeHeader,
                separator: template.separator,
                dateFormat: template.dateFormat
            });
            fetchData();
        } catch (error) {
            console.error('Error duplicating template:', error);
        }
    };

    // Get field label helper
    const getFieldLabel = (fieldKey: string): string => {
        for (const category of Object.values(availableFields)) {
            if (category.fields[fieldKey]) {
                return category.fields[fieldKey].label;
            }
        }
        return fieldKey;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight uppercase flex items-center gap-3">
                        <FileSpreadsheet className="text-green-500" size={28} />
                        Modèles d'Export <span className="text-green-500">.</span>
                    </h1>
                    <p className="text-gray-500 text-sm font-mono mt-1">
                        CONFIGURATION_TEMPLATES_EXPORT_CSV
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => openExportModal()}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-colors shadow-lg shadow-green-600/20"
                    >
                        <Download size={16} />
                        Exporter
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors"
                    >
                        <Plus size={16} />
                        Nouveau Modèle
                    </button>
                </div>
            </div>

            {/* Templates Grid */}
            {loading ? (
                <div className="text-center py-12">
                    <RefreshCw size={32} className="animate-spin text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 font-mono">CHARGEMENT_TEMPLATES...</p>
                </div>
            ) : templates.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-[#0A0A0C] rounded-xl border border-gray-200 dark:border-white/10">
                    <FileSpreadsheet size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">Aucun modèle d'export configuré</p>
                    <button
                        onClick={openCreateModal}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold"
                    >
                        Créer votre premier modèle
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map(template => (
                        <div
                            key={template.id}
                            className="bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 rounded-xl p-5 hover:shadow-lg transition-all group"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 dark:bg-green-500/10 rounded-lg">
                                        <FileSpreadsheet className="text-green-600" size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white">{template.name}</h3>
                                        <p className="text-xs text-gray-500">{template.fields.length} champs</p>
                                    </div>
                                </div>
                                {template.isDefault && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase text-blue-600 bg-blue-50 dark:bg-blue-500/10 rounded">
                                        Par défaut
                                    </span>
                                )}
                            </div>

                            {template.description && (
                                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{template.description}</p>
                            )}

                            {/* Field tags preview */}
                            <div className="flex flex-wrap gap-1 mb-4">
                                {template.fields.slice(0, 5).map(field => (
                                    <span
                                        key={field}
                                        className="px-2 py-0.5 text-[10px] bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded"
                                    >
                                        {getFieldLabel(field)}
                                    </span>
                                ))}
                                {template.fields.length > 5 && (
                                    <span className="px-2 py-0.5 text-[10px] bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400 rounded">
                                        +{template.fields.length - 5}
                                    </span>
                                )}
                            </div>

                            {/* Settings preview */}
                            <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                                <span>Séparateur: <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">{template.separator}</code></span>
                                <span>{template.includeHeader ? '✓ Entêtes' : '✗ Sans entêtes'}</span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/5">
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => openExportModal(template.id)}
                                        className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-lg transition-colors"
                                        title="Exporter avec ce modèle"
                                    >
                                        <Download size={16} />
                                    </button>
                                    <button
                                        onClick={() => duplicateTemplate(template)}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                                        title="Dupliquer"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => openEditModal(template)}
                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                        title="Modifier"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(template.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Supprimer"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl flex flex-col">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <FileSpreadsheet className="text-green-500" size={24} />
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-widest">
                                        {editingTemplate ? 'Modifier le modèle' : 'Nouveau modèle d\'export'}
                                    </h2>
                                    <p className="text-xs text-gray-500 font-mono">Sélectionnez les champs à inclure</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-900">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                        Nom du modèle *
                                    </label>
                                    <input
                                        type="text"
                                        value={formName}
                                        onChange={e => setFormName(e.target.value)}
                                        placeholder="Ex: Export complet avec qualifications"
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                        Description
                                    </label>
                                    <input
                                        type="text"
                                        value={formDescription}
                                        onChange={e => setFormDescription(e.target.value)}
                                        placeholder="Description optionnelle..."
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500/50"
                                    />
                                </div>
                            </div>

                            {/* Options */}
                            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-lg">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                        Séparateur CSV
                                    </label>
                                    <select
                                        value={formSeparator}
                                        onChange={e => setFormSeparator(e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 rounded-lg text-sm"
                                    >
                                        <option value=";">Point-virgule (;)</option>
                                        <option value=",">Virgule (,)</option>
                                        <option value="\t">Tabulation</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                        Format des dates
                                    </label>
                                    <select
                                        value={formDateFormat}
                                        onChange={e => setFormDateFormat(e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 rounded-lg text-sm"
                                    >
                                        <option value="dd/MM/yyyy HH:mm">dd/MM/yyyy HH:mm</option>
                                        <option value="dd/MM/yyyy">dd/MM/yyyy</option>
                                        <option value="yyyy-MM-dd HH:mm">yyyy-MM-dd HH:mm</option>
                                        <option value="yyyy-MM-dd">yyyy-MM-dd</option>
                                    </select>
                                </div>
                                <div className="flex items-center">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formIncludeHeader}
                                            onChange={e => setFormIncludeHeader(e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                        />
                                        <span className="text-sm font-medium">Inclure les en-têtes</span>
                                    </label>
                                </div>
                            </div>

                            {/* Field Selection */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-xs font-bold text-gray-500 uppercase">
                                        Champs à exporter ({formFields.length} sélectionnés)
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                const allFields = Object.values(availableFields).flatMap(c => Object.keys(c.fields));
                                                setFormFields(allFields);
                                            }}
                                            className="text-xs text-blue-600 hover:underline"
                                        >
                                            Tout sélectionner
                                        </button>
                                        <button
                                            onClick={() => setFormFields([])}
                                            className="text-xs text-gray-500 hover:underline"
                                        >
                                            Tout effacer
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar border border-gray-200 dark:border-white/10 rounded-lg p-4">
                                    {Object.entries(availableFields).map(([categoryKey, category]) => {
                                        const categoryFields = Object.keys(category.fields);
                                        const selectedInCategory = categoryFields.filter(f => formFields.includes(f)).length;
                                        const allSelected = selectedInCategory === categoryFields.length;

                                        return (
                                            <div key={categoryKey} className="border-b border-gray-100 dark:border-white/5 pb-2 last:border-0">
                                                {/* Category Header */}
                                                <div
                                                    className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 rounded px-2 -mx-2"
                                                    onClick={() => toggleCategory(categoryKey)}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {expandedCategories.has(categoryKey) ? (
                                                            <ChevronDown size={16} className="text-gray-400" />
                                                        ) : (
                                                            <ChevronRight size={16} className="text-gray-400" />
                                                        )}
                                                        <span className="font-bold text-sm">{category.label}</span>
                                                        <span className="text-xs text-gray-400">
                                                            ({selectedInCategory}/{categoryFields.length})
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); selectAllInCategory(categoryKey); }}
                                                        className={`text-xs px-2 py-0.5 rounded ${allSelected ? 'text-red-600 bg-red-50 dark:bg-red-500/10' : 'text-blue-600 bg-blue-50 dark:bg-blue-500/10'}`}
                                                    >
                                                        {allSelected ? 'Désélectionner tout' : 'Sélectionner tout'}
                                                    </button>
                                                </div>

                                                {/* Category Fields */}
                                                {expandedCategories.has(categoryKey) && (
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 pl-6">
                                                        {Object.entries(category.fields).map(([fieldKey, field]) => (
                                                            <label
                                                                key={fieldKey}
                                                                className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${formFields.includes(fieldKey)
                                                                    ? 'bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30'
                                                                    : 'bg-gray-50 dark:bg-white/5 border border-transparent hover:border-gray-200 dark:hover:border-white/10'
                                                                    }`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formFields.includes(fieldKey)}
                                                                    onChange={() => toggleField(fieldKey)}
                                                                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                                                />
                                                                <span className="text-xs font-medium truncate">{field.label}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex justify-between items-center shrink-0">
                            <p className="text-xs text-gray-400">
                                {formFields.length === 0 && <span className="text-red-500">Sélectionnez au moins un champ</span>}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-sm font-bold"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!formName || formFields.length === 0 || saving}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-bold flex items-center gap-2"
                                >
                                    {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                    {editingTemplate ? 'Sauvegarder' : 'Créer le modèle'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Export Modal */}
            {isExportModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-lg bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Download className="text-green-500" size={24} />
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-widest">
                                    Exporter les données
                                </h2>
                            </div>
                            <button onClick={() => setIsExportModalOpen(false)} className="text-gray-500 hover:text-gray-900">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* Template Selection */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                                    Modèle d'export *
                                </label>
                                <select
                                    value={selectedTemplateId}
                                    onChange={e => setSelectedTemplateId(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm"
                                >
                                    <option value="">Sélectionner un modèle...</option>
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} ({t.fields.length} champs)</option>
                                    ))}
                                </select>
                            </div>

                            {/* Database Selection */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                                    Bases de données à exporter *
                                </label>
                                <div className="max-h-40 overflow-y-auto custom-scrollbar border border-gray-200 dark:border-white/10 rounded-lg p-2 space-y-1">
                                    {databases.filter(db => db.totalContacts > 0).map(db => (
                                        <label
                                            key={db.id}
                                            className={`flex items-center justify-between p-3 rounded cursor-pointer transition-colors ${selectedDatabaseIds.includes(db.id)
                                                ? 'bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30'
                                                : 'hover:bg-gray-50 dark:hover:bg-white/5 border border-transparent'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDatabaseIds.includes(db.id)}
                                                    onChange={() => toggleDatabaseSelection(db.id)}
                                                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                                />
                                                <div>
                                                    <span className="font-medium text-sm">{db.name}</span>
                                                    {db.campaignName && (
                                                        <span className="text-xs text-gray-400 ml-2">({db.campaignName})</span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="text-xs text-gray-500">{db.totalContacts.toLocaleString()} contacts</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                    {selectedDatabaseIds.length} base(s) sélectionnée(s)
                                </p>
                            </div>

                            {/* Filters Section */}
                            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-lg space-y-4">
                                <p className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                    <Calendar size={14} />
                                    Filtres optionnels
                                </p>

                                {/* Date Period Filter */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                                        Période de traitement
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] text-gray-400 mb-1">Date début</label>
                                            <input
                                                type="date"
                                                value={filterDateStart}
                                                onChange={e => setFilterDateStart(e.target.value)}
                                                className="w-full px-3 py-2 bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 rounded-lg text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-gray-400 mb-1">Date fin</label>
                                            <input
                                                type="date"
                                                value={filterDateEnd}
                                                onChange={e => setFilterDateEnd(e.target.value)}
                                                className="w-full px-3 py-2 bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 rounded-lg text-sm"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        Filtre selon la date de dernière modification du contact
                                    </p>
                                </div>

                                {/* Agent Filter */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                                        <Users size={14} />
                                        Filtrer par agent
                                    </label>
                                    <select
                                        value={filterAgentId}
                                        onChange={e => setFilterAgentId(e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 rounded-lg text-sm"
                                    >
                                        <option value="">Tous les agents</option>
                                        {agents.map(agent => (
                                            <option key={agent.id} value={agent.id}>
                                                {agent.name} ({agent.role})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        Exporte uniquement les contacts assignés à cet agent
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex justify-end gap-3">
                            <button
                                onClick={() => setIsExportModalOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-sm font-bold"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleExport}
                                disabled={!selectedTemplateId || selectedDatabaseIds.length === 0 || exporting}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-bold flex items-center gap-2"
                            >
                                {exporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                                {exporting ? 'Export en cours...' : 'Télécharger le CSV'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExportTemplates;
