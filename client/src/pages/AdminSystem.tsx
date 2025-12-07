import { useState, useEffect } from 'react';
import api from '../services/api';
import {
    Settings,
    FileText,
    Plus,
    Trash2,
    Save,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    GripVertical,
    Check,
    RefreshCw,
    Wand2
} from 'lucide-react';

interface ScriptSection {
    id?: string;
    title: string;
    content: string;
    type: 'INTRO' | 'PITCH' | 'OBJECTION' | 'CLOSING' | 'INFO';
    order: number;
}

interface Objection {
    id?: string;
    objection: string;
    response: string;
    order: number;
    isGlobal: boolean;
}

interface CallScript {
    id?: string;
    name: string;
    status: string;
    isDefault: boolean;
    isActive: boolean;
    sections: ScriptSection[];
    objections: Objection[];
}

const STATUS_OPTIONS = [
    { value: 'NEW', label: 'Nouveau contact', color: 'blue' },
    { value: 'CALLBACK_LATER', label: 'Rappel programmé', color: 'purple' },
    { value: 'NRP', label: 'NRP (Ne Répond Pas)', color: 'orange' },
    { value: 'FOLLOW_UP', label: 'Suivi après RDV', color: 'green' },
    { value: 'UNREACHABLE', label: 'Injoignable', color: 'red' },
    { value: 'ANSWERING_MACHINE', label: 'Répondeur', color: 'yellow' },
    { value: 'ABSENT', label: 'Absent', color: 'gray' }
];

const SECTION_TYPES = [
    { value: 'INTRO', label: 'Introduction', color: 'blue' },
    { value: 'PITCH', label: 'Argumentaire', color: 'green' },
    { value: 'CLOSING', label: 'Conclusion/RDV', color: 'purple' },
    { value: 'OBJECTION', label: 'Objection', color: 'orange' },
    { value: 'INFO', label: 'Information', color: 'gray' }
];

const AdminSystem = () => {
    const [scripts, setScripts] = useState<CallScript[]>([]);
    const [globalObjections, setGlobalObjections] = useState<Objection[]>([]);
    const [selectedScript, setSelectedScript] = useState<CallScript | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'scripts' | 'objections'>('scripts');
    const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        fetchScripts();
        fetchGlobalObjections();
    }, []);

    const fetchScripts = async () => {
        try {
            const response = await api.get('/scripts');
            setScripts(response.data);
        } catch (error) {
            console.error('Error fetching scripts:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchGlobalObjections = async () => {
        try {
            const response = await api.get('/scripts/objections');
            setGlobalObjections(response.data);
        } catch (error) {
            console.error('Error fetching objections:', error);
        }
    };

    const seedDefaultScripts = async () => {
        try {
            setSaving(true);
            await api.post('/scripts/seed');
            await fetchScripts();
            await fetchGlobalObjections();
            showSuccess('Scripts par défaut créés avec succès !');
        } catch (error) {
            console.error('Error seeding scripts:', error);
        } finally {
            setSaving(false);
        }
    };

    const showSuccess = (message: string) => {
        setSuccessMessage(message);
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const handleSelectScript = (script: CallScript) => {
        setSelectedScript({ ...script });
        setExpandedSections(new Set([0]));
    };

    const handleCreateScript = () => {
        setSelectedScript({
            name: 'Nouveau script',
            status: 'NEW',
            isDefault: false,
            isActive: true,
            sections: [
                { title: '👋 Introduction', content: '', type: 'INTRO', order: 0 }
            ],
            objections: []
        });
        setExpandedSections(new Set([0]));
    };

    const handleSaveScript = async () => {
        if (!selectedScript) return;

        try {
            setSaving(true);
            const response = await api.post('/scripts', selectedScript);
            setSelectedScript(response.data);
            await fetchScripts();
            showSuccess('Script sauvegardé avec succès !');
        } catch (error) {
            console.error('Error saving script:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteScript = async (id: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce script ?')) return;

        try {
            await api.delete(`/scripts/${id}`);
            if (selectedScript?.id === id) {
                setSelectedScript(null);
            }
            await fetchScripts();
            showSuccess('Script supprimé !');
        } catch (error) {
            console.error('Error deleting script:', error);
        }
    };

    const handleAddSection = () => {
        if (!selectedScript) return;
        setSelectedScript({
            ...selectedScript,
            sections: [
                ...selectedScript.sections,
                {
                    title: 'Nouvelle section',
                    content: '',
                    type: 'INFO',
                    order: selectedScript.sections.length
                }
            ]
        });
        setExpandedSections(new Set([...expandedSections, selectedScript.sections.length]));
    };

    const handleRemoveSection = (index: number) => {
        if (!selectedScript) return;
        const newSections = selectedScript.sections.filter((_, i) => i !== index);
        setSelectedScript({
            ...selectedScript,
            sections: newSections.map((s, i) => ({ ...s, order: i }))
        });
    };

    const handleSectionChange = (index: number, field: keyof ScriptSection, value: any) => {
        if (!selectedScript) return;
        const newSections = [...selectedScript.sections];
        newSections[index] = { ...newSections[index], [field]: value };
        setSelectedScript({ ...selectedScript, sections: newSections });
    };

    const toggleSection = (index: number) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedSections(newExpanded);
    };

    // Global Objections Management
    const handleSaveGlobalObjections = async () => {
        try {
            setSaving(true);
            await api.put('/scripts/objections/global', { objections: globalObjections });
            showSuccess('Objections sauvegardées !');
        } catch (error) {
            console.error('Error saving objections:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleAddGlobalObjection = () => {
        setGlobalObjections([
            ...globalObjections,
            { objection: '', response: '', order: globalObjections.length, isGlobal: true }
        ]);
    };

    const handleRemoveGlobalObjection = (index: number) => {
        setGlobalObjections(globalObjections.filter((_, i) => i !== index));
    };

    const handleObjectionChange = (index: number, field: 'objection' | 'response', value: string) => {
        const newObjections = [...globalObjections];
        newObjections[index] = { ...newObjections[index], [field]: value };
        setGlobalObjections(newObjections);
    };

    const getSectionTypeStyle = (type: string) => {
        switch (type) {
            case 'INTRO': return 'border-blue-500 bg-blue-50 dark:bg-blue-500/10';
            case 'PITCH': return 'border-green-500 bg-green-50 dark:bg-green-500/10';
            case 'CLOSING': return 'border-purple-500 bg-purple-50 dark:bg-purple-500/10';
            case 'OBJECTION': return 'border-orange-500 bg-orange-50 dark:bg-orange-500/10';
            default: return 'border-gray-300 bg-gray-50 dark:bg-white/5';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <RefreshCw className="animate-spin text-red-500" size={32} />
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 dark:bg-[#050507] min-h-full">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-100 dark:bg-red-500/20 rounded-xl">
                            <Settings className="text-red-600 dark:text-red-500" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Système - Configuration
                            </h1>
                            <p className="text-sm text-gray-500">
                                Personnalisez les scripts d'appel du mode Preview
                            </p>
                        </div>
                    </div>

                    {scripts.length === 0 && (
                        <button
                            onClick={seedDefaultScripts}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
                        >
                            <Wand2 size={18} />
                            Créer les scripts par défaut
                        </button>
                    )}
                </div>

                {/* Success Message */}
                {successMessage && (
                    <div className="mt-4 p-3 bg-green-100 dark:bg-green-500/20 border border-green-300 dark:border-green-500/30 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-400">
                        <Check size={18} />
                        {successMessage}
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('scripts')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'scripts'
                        ? 'bg-red-600 text-white'
                        : 'bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
                        }`}
                >
                    <FileText size={18} />
                    Scripts d'appel
                </button>
                <button
                    onClick={() => setActiveTab('objections')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'objections'
                        ? 'bg-red-600 text-white'
                        : 'bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
                        }`}
                >
                    <AlertTriangle size={18} />
                    Réponses aux objections
                </button>
            </div>

            {activeTab === 'scripts' && (
                <div className="grid grid-cols-12 gap-6">
                    {/* Scripts List */}
                    <div className="col-span-4">
                        <div className="bg-white dark:bg-[#0A0A0C] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                            <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                                <h2 className="font-bold text-gray-900 dark:text-white">
                                    Scripts ({scripts.length})
                                </h2>
                                <button
                                    onClick={handleCreateScript}
                                    className="p-2 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-500 rounded-lg hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>

                            <div className="max-h-[600px] overflow-y-auto">
                                {scripts.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">
                                        <FileText size={48} className="mx-auto mb-4 opacity-50" />
                                        <p>Aucun script configuré</p>
                                        <p className="text-sm mt-2">
                                            Cliquez sur le bouton magique pour créer les scripts par défaut
                                        </p>
                                    </div>
                                ) : (
                                    scripts.map((script) => {
                                        const statusInfo = STATUS_OPTIONS.find(s => s.value === script.status);
                                        return (
                                            <div
                                                key={script.id}
                                                onClick={() => handleSelectScript(script)}
                                                className={`p-4 border-b border-gray-100 dark:border-white/5 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${selectedScript?.id === script.id ? 'bg-red-50 dark:bg-red-500/10 border-l-4 border-l-red-500' : ''
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                        {script.name}
                                                    </span>
                                                    {script.isDefault && (
                                                        <span className="text-[10px] px-2 py-0.5 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 rounded-full">
                                                            Par défaut
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full bg-${statusInfo?.color}-100 dark:bg-${statusInfo?.color}-500/20 text-${statusInfo?.color}-700 dark:text-${statusInfo?.color}-400`}>
                                                        {statusInfo?.label}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {script.sections.length} sections
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Script Editor */}
                    <div className="col-span-8">
                        {selectedScript ? (
                            <div className="bg-white dark:bg-[#0A0A0C] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                                {/* Editor Header */}
                                <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-white/5">
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="text"
                                            value={selectedScript.name}
                                            onChange={(e) => setSelectedScript({ ...selectedScript, name: e.target.value })}
                                            className="text-xl font-bold bg-transparent border-b-2 border-transparent hover:border-gray-300 focus:border-red-500 outline-none text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {selectedScript.id && (
                                            <button
                                                onClick={() => handleDeleteScript(selectedScript.id!)}
                                                className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                        <button
                                            onClick={handleSaveScript}
                                            disabled={saving}
                                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                        >
                                            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                                            Sauvegarder
                                        </button>
                                    </div>
                                </div>

                                {/* Script Settings */}
                                <div className="p-4 border-b border-gray-200 dark:border-white/10 grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">
                                            Statut du contact
                                        </label>
                                        <select
                                            value={selectedScript.status}
                                            onChange={(e) => setSelectedScript({ ...selectedScript, status: e.target.value })}
                                            className="w-full p-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white"
                                        >
                                            {STATUS_OPTIONS.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedScript.isDefault}
                                                onChange={(e) => setSelectedScript({ ...selectedScript, isDefault: e.target.checked })}
                                                className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                                Script par défaut
                                            </span>
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedScript.isActive}
                                                onChange={(e) => setSelectedScript({ ...selectedScript, isActive: e.target.checked })}
                                                className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                                Actif
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                {/* Sections */}
                                <div className="p-4 max-h-[500px] overflow-y-auto space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold text-gray-900 dark:text-white">
                                            Sections du script
                                        </h3>
                                        <button
                                            onClick={handleAddSection}
                                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                                        >
                                            <Plus size={14} />
                                            Ajouter une section
                                        </button>
                                    </div>

                                    {selectedScript.sections.map((section, index) => (
                                        <div
                                            key={index}
                                            className={`border-l-4 rounded-lg overflow-hidden ${getSectionTypeStyle(section.type)}`}
                                        >
                                            <div
                                                className="flex items-center justify-between p-3 cursor-pointer"
                                                onClick={() => toggleSection(index)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <GripVertical size={16} className="text-gray-400" />
                                                    <input
                                                        type="text"
                                                        value={section.title}
                                                        onChange={(e) => handleSectionChange(index, 'title', e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="bg-transparent font-medium text-gray-900 dark:text-white outline-none"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={section.type}
                                                        onChange={(e) => handleSectionChange(index, 'type', e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-xs p-1 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded text-gray-700 dark:text-gray-300"
                                                    >
                                                        {SECTION_TYPES.map((type) => (
                                                            <option key={type.value} value={type.value}>
                                                                {type.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRemoveSection(index); }}
                                                        className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                    {expandedSections.has(index) ? (
                                                        <ChevronUp size={18} className="text-gray-400" />
                                                    ) : (
                                                        <ChevronDown size={18} className="text-gray-400" />
                                                    )}
                                                </div>
                                            </div>

                                            {expandedSections.has(index) && (
                                                <div className="px-3 pb-3">
                                                    <textarea
                                                        value={section.content}
                                                        onChange={(e) => handleSectionChange(index, 'content', e.target.value)}
                                                        placeholder="Contenu du script...

Utilisez {companyName} pour insérer le nom de l'entreprise.
Utilisez [VOTRE NOM] comme placeholder pour le nom de l'agent."
                                                        className="w-full h-40 p-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-700 dark:text-gray-300 resize-none outline-none focus:ring-2 focus:ring-red-500/50"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-[#0A0A0C] rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
                                <FileText size={64} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                    Sélectionnez un script
                                </h3>
                                <p className="text-gray-500 mb-4">
                                    Choisissez un script dans la liste ou créez-en un nouveau
                                </p>
                                <button
                                    onClick={handleCreateScript}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    <Plus size={18} />
                                    Créer un script
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'objections' && (
                <div className="bg-white dark:bg-[#0A0A0C] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-white/5">
                        <div>
                            <h2 className="font-bold text-gray-900 dark:text-white">
                                Réponses aux objections courantes
                            </h2>
                            <p className="text-sm text-gray-500">
                                Ces réponses s'affichent dans tous les scripts d'appel
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleAddGlobalObjection}
                                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                            >
                                <Plus size={18} />
                                Ajouter
                            </button>
                            <button
                                onClick={handleSaveGlobalObjections}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                                Sauvegarder
                            </button>
                        </div>
                    </div>

                    <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                        {globalObjections.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <AlertTriangle size={48} className="mx-auto mb-4 opacity-50" />
                                <p>Aucune objection configurée</p>
                                <button
                                    onClick={handleAddGlobalObjection}
                                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    <Plus size={18} />
                                    Ajouter une objection
                                </button>
                            </div>
                        ) : (
                            globalObjections.map((obj, index) => (
                                <div
                                    key={index}
                                    className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-lg p-4"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <GripVertical size={16} className="text-gray-400" />
                                            <span className="text-sm font-bold text-orange-700 dark:text-orange-400">
                                                Objection #{index + 1}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveGlobalObjection(index)}
                                            className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">
                                                ❌ L'objection du client
                                            </label>
                                            <input
                                                type="text"
                                                value={obj.objection}
                                                onChange={(e) => handleObjectionChange(index, 'objection', e.target.value)}
                                                placeholder="Ex: On est déjà chez un concurrent..."
                                                className="w-full p-2 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">
                                                ✅ Votre réponse suggérée
                                            </label>
                                            <textarea
                                                value={obj.response}
                                                onChange={(e) => handleObjectionChange(index, 'response', e.target.value)}
                                                placeholder="Ex: Je comprends tout à fait. C'est justement l'occasion de comparer..."
                                                className="w-full h-24 p-2 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSystem;
