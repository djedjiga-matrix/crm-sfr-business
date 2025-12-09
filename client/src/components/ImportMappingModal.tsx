import { useState, useCallback, useEffect, useRef } from 'react';
import {
    X,
    Upload,
    FileSpreadsheet,
    Wand2,
    Eye,
    ArrowRight,
    CheckCircle,
    AlertCircle,
    Loader2,
    ChevronDown,
    RefreshCw,
    Trash2
} from 'lucide-react';
import api from '../services/api';

interface ImportMappingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    campaignId?: string;
}

interface PreviewData {
    headers: string[];
    rows: any[][];
    totalRows: number;
}

// Champs cibles pour le mapping
const TARGET_FIELDS = [
    { key: 'idFiche', label: 'ID Fiche', required: false },
    { key: 'nom', label: 'Nom / Raison Sociale', required: true },
    { key: 'adresse', label: 'Adresse', required: false },
    { key: 'codePostal', label: 'Code Postal', required: false },
    { key: 'ville', label: 'Ville', required: false },
    { key: 'telephone', label: 'Téléphone (Fixe)', required: false },
    { key: 'mobile', label: 'Mobile', required: false },
    { key: 'email', label: 'Email', required: false },
    { key: 'categorie', label: 'Catégorie / Activité', required: false },
    { key: 'siret', label: 'SIRET', required: false },
    { key: 'effectif', label: 'Effectif', required: false },
    { key: 'dirigeants', label: 'Dirigeants', required: false },
    { key: 'dateCreationEnt', label: 'Date Création Entreprise', required: false },
];

// Patterns pour la détection automatique
const AUTO_DETECT_PATTERNS: Record<string, RegExp[]> = {
    idFiche: [/id[_\s]?fiche/i, /^id$/i, /identifiant/i, /référence/i, /ref/i],
    nom: [/^nom$/i, /raison[_\s]?sociale/i, /entreprise/i, /société/i, /company/i, /denomination/i],
    adresse: [/adresse/i, /^rue$/i, /voie/i, /address/i],
    codePostal: [/code[_\s]?postal/i, /^cp$/i, /postal/i, /zip/i],
    ville: [/^ville$/i, /commune/i, /localité/i, /city/i],
    telephone: [/^tel$/i, /téléphone/i, /phone/i, /fixe/i, /tel[_\s]?fixe/i],
    mobile: [/mobile/i, /portable/i, /gsm/i, /cellulaire/i, /tel[_\s]?mobile/i],
    email: [/email/i, /e-mail/i, /mail/i, /courriel/i],
    categorie: [/catégorie/i, /category/i, /secteur/i, /activité/i, /naf/i, /ape/i],
    siret: [/siret/i, /siren/i],
    // Pattern strict pour Effectif: doit être exactement "effectif" ou contenir "salariés", pas "(code)"
    effectif: [/^effectif$/i, /salariés/i, /employés/i, /nb[_\s]?employés/i],
    dirigeants: [/dirigeant/i, /gérant/i, /président/i, /contact/i, /responsable/i],
    dateCreationEnt: [/date[_\s]?création/i, /création/i, /fondation/i, /immatriculation/i, /date[_\s]?immat/i]
};

const autoDetectMapping = (csvHeaders: string[]): Record<string, string> => {
    const mappings: Record<string, string> = {};

    csvHeaders.forEach(header => {
        const normalizedHeader = header.toLowerCase().trim();

        // Ignorer les colonnes contenant "(code)" pour éviter les mauvais mappings
        if (normalizedHeader.includes('(code)')) {
            return;
        }

        for (const [field, regexList] of Object.entries(AUTO_DETECT_PATTERNS)) {
            if (regexList.some(regex => regex.test(normalizedHeader))) {
                if (!mappings[field]) {
                    mappings[field] = header;
                }
                break;
            }
        }
    });

    return mappings;
};

interface Campaign {
    id: string;
    name: string;
    code?: string;
    isActive: boolean;
}

const ImportMappingModal = ({ isOpen, onClose, onSuccess, campaignId }: ImportMappingModalProps) => {
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [dbName, setDbName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [importResult, setImportResult] = useState<{ success: number; errorCount: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // États pour la gestion des campagnes
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>(campaignId || '');
    const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
    const [newCampaignName, setNewCampaignName] = useState('');
    const [loadingCampaigns, setLoadingCampaigns] = useState(false);

    // Charger les campagnes à l'ouverture du modal
    useEffect(() => {
        if (isOpen) {
            fetchCampaigns();
        }
    }, [isOpen]);

    const fetchCampaigns = async () => {
        setLoadingCampaigns(true);
        try {
            const response = await api.get('/campaigns');
            setCampaigns(response.data.filter((c: Campaign) => c.isActive));
        } catch (err) {
            console.error('Error fetching campaigns:', err);
        } finally {
            setLoadingCampaigns(false);
        }
    };

    const handleCreateCampaign = async () => {
        if (!newCampaignName.trim()) return;

        setLoading(true);
        try {
            const response = await api.post('/campaigns', {
                name: newCampaignName.trim(),
                isActive: true
            });
            setCampaigns(prev => [...prev, response.data]);
            setSelectedCampaignId(response.data.id);
            setIsCreatingCampaign(false);
            setNewCampaignName('');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erreur lors de la création de la campagne');
        } finally {
            setLoading(false);
        }
    };

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setStep('upload');
            setFile(null);
            setPreviewData(null);
            setMapping({});
            setDbName('');
            setError(null);
            setImportResult(null);
            setSelectedCampaignId(campaignId || '');
            setIsCreatingCampaign(false);
            setNewCampaignName('');
        }
    }, [isOpen, campaignId]);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const droppedFile = files[0];
            const validExtensions = ['.csv', '.xls', '.xlsx'];
            const fileExtension = droppedFile.name.toLowerCase().slice(droppedFile.name.lastIndexOf('.'));
            if (validExtensions.includes(fileExtension)) {
                setFile(droppedFile);
                setDbName(droppedFile.name.replace(/\.[^/.]+$/, ''));
                handleFilePreview(droppedFile);
            } else {
                setError('Format de fichier non supporté. Veuillez utiliser CSV, XLS ou XLSX.');
            }
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setDbName(selectedFile.name.replace(/\.[^/.]+$/, ''));
            handleFilePreview(selectedFile);
        }
    };

    const handleFilePreview = async (fileToPreview: File) => {
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', fileToPreview);

        try {
            const response = await api.post('/contacts/import/preview', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const { headers, rows, totalRows } = response.data;
            setPreviewData({ headers, rows, totalRows });

            // Auto-detect mapping
            const detectedMapping = autoDetectMapping(headers);
            setMapping(detectedMapping);

            setStep('mapping');
        } catch (err: any) {
            console.error('Error previewing file:', err);
            setError(err.response?.data?.message || 'Erreur lors de la lecture du fichier');
        } finally {
            setLoading(false);
        }
    };

    const handleAutoDetect = () => {
        if (previewData) {
            const detectedMapping = autoDetectMapping(previewData.headers);
            setMapping(detectedMapping);
        }
    };

    const handleMappingChange = (targetField: string, sourceColumn: string) => {
        setMapping(prev => {
            const newMapping = { ...prev };
            if (sourceColumn === '') {
                delete newMapping[targetField];
            } else {
                newMapping[targetField] = sourceColumn;
            }
            return newMapping;
        });
    };

    const handleClearMapping = () => {
        setMapping({});
    };

    const handleImport = async () => {
        if (!file) return;
        if (!selectedCampaignId) {
            setError('Veuillez sélectionner une campagne');
            return;
        }

        setStep('importing');
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('mapping', JSON.stringify(mapping));
        formData.append('name', dbName || file.name);
        formData.append('campaignId', selectedCampaignId);

        try {
            const response = await api.post('/contacts/import/mapped', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setImportResult({
                success: response.data.success,
                errorCount: response.data.errorCount
            });

            setTimeout(() => {
                onSuccess();
                onClose();
            }, 2000);
        } catch (err: any) {
            console.error('Error importing file:', err);
            setError(err.response?.data?.message || 'Erreur lors de l\'import');
            setStep('mapping');
        } finally {
            setLoading(false);
        }
    };

    // Get mapped preview data
    const getMappedPreviewData = () => {
        if (!previewData) return [];

        return previewData.rows.map(row => {
            const mappedRow: Record<string, any> = {};
            TARGET_FIELDS.forEach(field => {
                const sourceColumn = mapping[field.key];
                if (sourceColumn) {
                    const columnIndex = previewData.headers.indexOf(sourceColumn);
                    mappedRow[field.key] = columnIndex >= 0 ? row[columnIndex] : '-';
                } else {
                    mappedRow[field.key] = '-';
                }
            });
            return mappedRow;
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-[#0E0E11] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg">
                            <FileSpreadsheet className="text-white" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Import avec Mapping</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {step === 'upload' && 'Étape 1: Sélection du fichier'}
                                {step === 'mapping' && 'Étape 2: Configuration du mapping'}
                                {step === 'preview' && 'Étape 3: Vérification des données'}
                                {step === 'importing' && 'Import en cours...'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Progress bar */}
                <div className="px-6 py-2 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/5">
                    <div className="flex items-center gap-2">
                        {['upload', 'mapping', 'preview', 'importing'].map((s, idx) => (
                            <div key={s} className="flex items-center flex-1">
                                <div className={`w-full h-1.5 rounded-full transition-all duration-300 ${(['upload', 'mapping', 'preview', 'importing'].indexOf(step) >= idx)
                                    ? 'bg-gradient-to-r from-red-500 to-red-600'
                                    : 'bg-gray-200 dark:bg-gray-700'
                                    }`} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Error message */}
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg flex items-center gap-3">
                            <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Upload Step */}
                    {step === 'upload' && (
                        <div className="space-y-6">
                            {/* Drag & Drop Zone */}
                            <div
                                onDragEnter={handleDragEnter}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ${isDragging
                                    ? 'border-red-500 bg-red-50 dark:bg-red-500/10'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-red-500 hover:bg-gray-50 dark:hover:bg-white/5'
                                    }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,.xls,.xlsx"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />

                                <div className="space-y-4">
                                    <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center transition-all ${isDragging
                                        ? 'bg-red-100 dark:bg-red-500/20'
                                        : 'bg-gray-100 dark:bg-gray-800'
                                        }`}>
                                        {loading ? (
                                            <Loader2 className="animate-spin text-red-500" size={32} />
                                        ) : (
                                            <Upload className={isDragging ? 'text-red-500' : 'text-gray-400'} size={32} />
                                        )}
                                    </div>

                                    <div>
                                        <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                                            {isDragging ? 'Déposez le fichier ici' : 'Glissez-déposez votre fichier'}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            ou <span className="text-red-500 font-medium">cliquez pour parcourir</span>
                                        </p>
                                    </div>

                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                        Formats supportés: CSV, XLS, XLSX
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mapping Step */}
                    {step === 'mapping' && previewData && (
                        <div className="space-y-6">
                            {/* File info */}
                            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Fichier sélectionné</p>
                                <div className="flex items-center gap-2">
                                    <FileSpreadsheet className="text-green-500" size={16} />
                                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{file?.name}</span>
                                    <span className="text-xs text-gray-400">({previewData.totalRows} lignes)</span>
                                </div>
                            </div>

                            {/* Nom de la base - OBLIGATOIRE */}
                            <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg">
                                <label className="flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-400 mb-3">
                                    <FileSpreadsheet size={16} />
                                    Nom de la base <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={dbName}
                                    onChange={(e) => setDbName(e.target.value)}
                                    placeholder="Ex: Fichier Lyon Octobre 2025"
                                    className={`w-full px-4 py-2.5 bg-white dark:bg-[#0A0A0C] border rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all ${dbName.trim() ? 'border-green-500' : 'border-blue-400'
                                        }`}
                                />
                                {!dbName.trim() && (
                                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                                        ⚠️ Donnez un nom descriptif à votre base pour la retrouver facilement
                                    </p>
                                )}
                            </div>

                            {/* Sélection de campagne OBLIGATOIRE */}
                            <div className="p-4 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="text-orange-500" size={16} />
                                        <label className="text-sm font-bold text-orange-700 dark:text-orange-400">
                                            Campagne <span className="text-red-500">*</span>
                                        </label>
                                    </div>
                                    {!isCreatingCampaign && (
                                        <button
                                            onClick={() => setIsCreatingCampaign(true)}
                                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                        >
                                            + Créer une nouvelle campagne
                                        </button>
                                    )}
                                </div>

                                {isCreatingCampaign ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={newCampaignName}
                                            onChange={(e) => setNewCampaignName(e.target.value)}
                                            placeholder="Nom de la nouvelle campagne..."
                                            className="flex-1 px-3 py-2 bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 outline-none"
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleCreateCampaign}
                                            disabled={!newCampaignName.trim() || loading}
                                            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {loading ? <Loader2 className="animate-spin" size={16} /> : 'Créer'}
                                        </button>
                                        <button
                                            onClick={() => { setIsCreatingCampaign(false); setNewCampaignName(''); }}
                                            className="px-3 py-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                        >
                                            Annuler
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        {loadingCampaigns ? (
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <Loader2 className="animate-spin" size={16} />
                                                <span className="text-sm">Chargement des campagnes...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <select
                                                    value={selectedCampaignId}
                                                    onChange={(e) => setSelectedCampaignId(e.target.value)}
                                                    className={`w-full px-4 py-2.5 bg-white dark:bg-[#0A0A0C] border rounded-lg text-sm outline-none appearance-none cursor-pointer transition-all ${selectedCampaignId
                                                        ? 'border-green-500 text-gray-900 dark:text-white'
                                                        : 'border-orange-400 text-gray-500'
                                                        }`}
                                                >
                                                    <option value="">-- Sélectionner une campagne (obligatoire) --</option>
                                                    {campaigns.map((campaign) => (
                                                        <option key={campaign.id} value={campaign.id}>
                                                            {campaign.name} {campaign.code ? `(${campaign.code})` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                            </>
                                        )}
                                    </div>
                                )}

                                {!selectedCampaignId && !isCreatingCampaign && (
                                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                                        ⚠️ Vous devez sélectionner une campagne pour pouvoir importer
                                    </p>
                                )}
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleAutoDetect}
                                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30"
                                >
                                    <Wand2 size={16} />
                                    Détecter automatiquement
                                </button>
                                <button
                                    onClick={handleClearMapping}
                                    className="px-4 py-2 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-all flex items-center gap-2"
                                >
                                    <Trash2 size={16} />
                                    Effacer tout
                                </button>
                            </div>

                            {/* Mapping table */}
                            <div className="border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
                                <div className="bg-gray-50 dark:bg-white/5 px-4 py-3 border-b border-gray-200 dark:border-white/5">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Configuration du mapping</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">Associez les colonnes de votre fichier aux champs de la base</p>
                                </div>

                                <div className="max-h-[300px] overflow-y-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-white/5 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Champ cible</th>
                                                <th className="px-4 py-2 text-center text-xs font-bold text-gray-500 uppercase w-12"></th>
                                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Colonne source</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                            {TARGET_FIELDS.map((field) => (
                                                <tr key={field.key} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                                {field.label}
                                                            </span>
                                                            {field.required && (
                                                                <span className="text-[10px] bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-bold">
                                                                    Requis
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <ArrowRight className="text-gray-300 dark:text-gray-600 mx-auto" size={16} />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="relative">
                                                            <select
                                                                value={mapping[field.key] || ''}
                                                                onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                                                className={`w-full px-3 py-2 bg-white dark:bg-[#0A0A0C] border rounded-lg text-sm outline-none appearance-none cursor-pointer transition-all ${mapping[field.key]
                                                                    ? 'border-green-500 text-gray-900 dark:text-white'
                                                                    : 'border-gray-200 dark:border-white/10 text-gray-500'
                                                                    }`}
                                                            >
                                                                <option value="">-- Ne pas importer --</option>
                                                                {previewData.headers.map((header, idx) => (
                                                                    <option key={idx} value={header}>{header}</option>
                                                                ))}
                                                            </select>
                                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Preview button */}
                            <button
                                onClick={() => setStep('preview')}
                                disabled={!mapping.nom || !selectedCampaignId || !dbName.trim()}
                                className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-medium rounded-lg hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/30 disabled:shadow-none"
                            >
                                <Eye size={18} />
                                {!dbName.trim() ? 'Entrez un nom de base' :
                                    !selectedCampaignId ? 'Sélectionnez une campagne' :
                                        !mapping.nom ? 'Mappez le champ Nom' :
                                            'Prévisualiser les données'}
                            </button>
                        </div>
                    )}

                    {/* Preview Step */}
                    {step === 'preview' && previewData && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Prévisualisation</h3>
                                    <p className="text-xs text-gray-500">Aperçu des 5 premières lignes avec le mapping appliqué</p>
                                </div>
                                <button
                                    onClick={() => setStep('mapping')}
                                    className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
                                >
                                    <RefreshCw size={14} />
                                    Modifier le mapping
                                </button>
                            </div>

                            {/* Preview table */}
                            <div className="border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-max">
                                        <thead className="bg-gray-50 dark:bg-white/5">
                                            <tr>
                                                {TARGET_FIELDS.filter(f => mapping[f.key]).map((field) => (
                                                    <th key={field.key} className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">
                                                        {field.label}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                            {getMappedPreviewData().map((row, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/5">
                                                    {TARGET_FIELDS.filter(f => mapping[f.key]).map((field) => (
                                                        <td key={field.key} className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                            {row[field.key] !== null && row[field.key] !== undefined
                                                                ? String(row[field.key]).substring(0, 50)
                                                                : '-'}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="text-blue-500 flex-shrink-0" size={20} />
                                    <div>
                                        <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                                            Prêt à importer
                                        </p>
                                        <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-0.5">
                                            {previewData.totalRows} contacts seront traités avec {Object.keys(mapping).length} champs mappés
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Importing Step */}
                    {step === 'importing' && (
                        <div className="text-center py-12">
                            {loading ? (
                                <div className="space-y-4">
                                    <Loader2 className="animate-spin text-red-500 mx-auto" size={48} />
                                    <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                                        Import en cours...
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Veuillez patienter, cela peut prendre quelques instants.
                                    </p>
                                </div>
                            ) : importResult ? (
                                <div className="space-y-4">
                                    <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center">
                                        <CheckCircle className="text-green-500" size={32} />
                                    </div>
                                    <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                                        Import terminé !
                                    </p>
                                    <div className="flex justify-center gap-8">
                                        <div>
                                            <p className="text-2xl font-bold text-green-500">{importResult.success}</p>
                                            <p className="text-xs text-gray-500">Contacts importés</p>
                                        </div>
                                        {importResult.errorCount > 0 && (
                                            <div>
                                                <p className="text-2xl font-bold text-orange-500">{importResult.errorCount}</p>
                                                <p className="text-xs text-gray-500">Erreurs</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        Annuler
                    </button>

                    {step === 'preview' && (
                        <button
                            onClick={handleImport}
                            disabled={loading}
                            className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-bold rounded-lg hover:from-red-600 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-red-500/30 disabled:shadow-none"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={16} />
                            ) : (
                                <Upload size={16} />
                            )}
                            Lancer l'import
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImportMappingModal;
