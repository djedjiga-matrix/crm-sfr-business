import { useState, useEffect } from 'react';
import { FileText, ChevronDown, ChevronUp, MessageCircle, AlertTriangle, X, Copy, Check } from 'lucide-react';
import api from '../services/api';

interface ScriptSection {
    id: string;
    title: string;
    content: string;
    type: 'INTRO' | 'PITCH' | 'OBJECTION' | 'CLOSING' | 'INFO';
    order: number;
}

interface Objection {
    id: string;
    objection: string;
    response: string;
    order: number;
}

interface CallScript {
    id: string;
    name: string;
    status: string;
    sections: ScriptSection[];
    objections: Objection[];
}

// Fallback default scripts if API fails
const getFallbackScript = (status: string, companyName: string): CallScript => {
    const scripts: Record<string, CallScript> = {
        NEW: {
            id: 'fallback-new',
            name: 'Premier appel',
            status: 'NEW',
            sections: [
                {
                    id: 'intro',
                    title: '👋 Introduction',
                    content: `Bonjour, je suis [VOTRE NOM] de SFR Business.\n\nJe me permets de vous appeler concernant ${companyName}.\n\nÊtes-vous bien le responsable des télécommunications de l'entreprise ?`,
                    type: 'INTRO',
                    order: 0
                },
                {
                    id: 'pitch',
                    title: '💼 Pitch principal',
                    content: `Super ! Je vous contacte car nous accompagnons les entreprises comme la vôtre dans l'optimisation de leurs coûts télécoms.\n\nNous proposons actuellement :\n• Des forfaits mobiles professionnels à partir de 19€/mois\n• La fibre entreprise avec garantie de débit\n• Des solutions de téléphonie IP\n\nEst-ce que vous avez quelques minutes pour en discuter ?`,
                    type: 'PITCH',
                    order: 1
                },
                {
                    id: 'rdv',
                    title: '📅 Proposition RDV',
                    content: `Pour vous présenter nos solutions en détail et vous faire une proposition personnalisée, je vous propose un rendez-vous avec notre conseiller commercial.\n\nIl pourra analyser vos besoins spécifiques et vous proposer les meilleures offres.\n\nQuel jour vous conviendrait le mieux la semaine prochaine ?`,
                    type: 'CLOSING',
                    order: 2
                }
            ],
            objections: []
        },
        CALLBACK_LATER: {
            id: 'fallback-callback',
            name: 'Rappel client',
            status: 'CALLBACK_LATER',
            sections: [
                {
                    id: 'intro',
                    title: '👋 Introduction rappel',
                    content: `Bonjour, [VOTRE NOM] de SFR Business.\n\nNous nous étions parlé il y a quelques temps concernant vos solutions télécoms pour ${companyName}.\n\nVous m'aviez demandé de vous rappeler. Est-ce que c'est un bon moment ?`,
                    type: 'INTRO',
                    order: 0
                }
            ],
            objections: []
        }
    };

    return scripts[status] || scripts['NEW'];
};

const fallbackObjections: Objection[] = [
    {
        id: 'obj1',
        objection: "On est déjà chez un concurrent",
        response: "Je comprends tout à fait. C'est justement l'occasion de comparer. Nous faisons régulièrement économiser 20 à 30% à nos clients qui viennent de la concurrence. Un audit gratuit ne vous engage à rien.",
        order: 0
    },
    {
        id: 'obj2',
        objection: "Pas intéressé / Pas le temps",
        response: "Je comprends que vous soyez occupé. C'est justement pour vous faire gagner du temps que je propose ce rendez-vous. Notre conseiller vient directement chez vous et l'échange dure seulement 30 minutes.",
        order: 1
    },
    {
        id: 'obj3',
        objection: "Envoyez-moi un email",
        response: "Bien sûr, je peux vous envoyer notre documentation. Mais pour vous proposer une offre adaptée, j'aurais besoin de quelques informations. Combien de lignes mobiles avez-vous actuellement ?",
        order: 2
    },
    {
        id: 'obj4',
        objection: "C'est trop cher",
        response: "Je comprends votre préoccupation sur le budget. C'est pourquoi nous proposons une étude personnalisée. Souvent, nos clients réalisent des économies dès le premier mois.",
        order: 3
    },
    {
        id: 'obj5',
        objection: "Je dois en parler à mon associé/direction",
        response: "Tout à fait normal. C'est pour cela que notre conseiller peut venir rencontrer l'ensemble des décideurs. Quand pensez-vous pouvoir en discuter avec eux ?",
        order: 4
    }
];

interface CallScriptPanelProps {
    contactStatus: string;
    companyName: string;
    campaignName?: string;
    onClose?: () => void;
    className?: string;
}

const CallScriptPanel = ({ contactStatus, companyName, campaignName, onClose, className = '' }: CallScriptPanelProps) => {
    const [script, setScript] = useState<CallScript | null>(null);
    const [objections, setObjections] = useState<Objection[]>([]);
    const [expandedSections, setExpandedSections] = useState<string[]>([]);
    const [showObjections, setShowObjections] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadScript();
    }, [contactStatus, companyName]);

    const loadScript = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/scripts/status/${contactStatus}`);
            const data = response.data;

            if (data && data.id) {
                // Process content to replace {companyName} placeholder
                const processedSections = (data.sections || []).map((section: ScriptSection) => ({
                    ...section,
                    content: section.content.replace(/\{companyName\}/g, companyName)
                }));

                setScript({
                    ...data,
                    sections: processedSections
                });
                setObjections(data.objections || []);

                // Open first section by default
                if (processedSections.length > 0) {
                    setExpandedSections([processedSections[0].id]);
                }
            } else {
                // Use fallback if no script in database
                const fallback = getFallbackScript(contactStatus, companyName);
                setScript(fallback);
                setObjections(data?.objections || fallbackObjections);
                if (fallback.sections.length > 0) {
                    setExpandedSections([fallback.sections[0].id]);
                }
            }
        } catch (error) {
            console.error('Error loading script:', error);
            // Use fallback on error
            const fallback = getFallbackScript(contactStatus, companyName);
            setScript(fallback);
            setObjections(fallbackObjections);
            if (fallback.sections.length > 0) {
                setExpandedSections([fallback.sections[0].id]);
            }
        } finally {
            setLoading(false);
        }
    };

    const toggleSection = (sectionId: string) => {
        setExpandedSections(prev =>
            prev.includes(sectionId)
                ? prev.filter(id => id !== sectionId)
                : [...prev, sectionId]
        );
    };

    const copyToClipboard = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const getSectionColor = (type: ScriptSection['type']) => {
        switch (type) {
            case 'INTRO': return 'border-blue-500 bg-blue-50 dark:bg-blue-500/10';
            case 'PITCH': return 'border-green-500 bg-green-50 dark:bg-green-500/10';
            case 'OBJECTION': return 'border-orange-500 bg-orange-50 dark:bg-orange-500/10';
            case 'CLOSING': return 'border-purple-500 bg-purple-50 dark:bg-purple-500/10';
            default: return 'border-gray-300 bg-gray-50 dark:bg-white/5';
        }
    };

    if (loading) {
        return (
            <div className={`bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden ${className}`}>
                <div className="p-8 flex items-center justify-center">
                    <div className="animate-pulse text-gray-400">Chargement du script...</div>
                </div>
            </div>
        );
    }

    if (!script) return null;

    return (
        <div className={`bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-lg text-red-600 dark:text-red-500">
                        <FileText size={18} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{script.name}</h3>
                        <p className="text-xs text-gray-500 font-mono">
                            {campaignName || 'Script standard'} • {companyName}
                        </p>
                    </div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X size={18} className="text-gray-400" />
                    </button>
                )}
            </div>

            {/* Sections du script */}
            <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                {script.sections.map((section) => (
                    <div
                        key={section.id}
                        className={`rounded-lg border-l-4 overflow-hidden ${getSectionColor(section.type)}`}
                    >
                        <button
                            onClick={() => toggleSection(section.id)}
                            className="w-full flex items-center justify-between p-3 text-left"
                        >
                            <span className="font-medium text-gray-900 dark:text-white">{section.title}</span>
                            {expandedSections.includes(section.id) ? (
                                <ChevronUp size={18} className="text-gray-400" />
                            ) : (
                                <ChevronDown size={18} className="text-gray-400" />
                            )}
                        </button>

                        {expandedSections.includes(section.id) && (
                            <div className="px-3 pb-3">
                                <div className="relative">
                                    <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed bg-white dark:bg-black/20 p-3 rounded-lg">
                                        {section.content}
                                    </pre>
                                    <button
                                        onClick={() => copyToClipboard(section.content, section.id)}
                                        className="absolute top-2 right-2 p-1.5 bg-white dark:bg-white/10 rounded-md shadow-sm hover:bg-gray-100 dark:hover:bg-white/20 transition-colors"
                                        title="Copier"
                                    >
                                        {copiedId === section.id ? (
                                            <Check size={14} className="text-green-500" />
                                        ) : (
                                            <Copy size={14} className="text-gray-400" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Toggle Objections */}
            {objections.length > 0 && (
                <div className="border-t border-gray-200 dark:border-white/10">
                    <button
                        onClick={() => setShowObjections(!showObjections)}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={18} className="text-orange-500" />
                            <span className="font-medium text-gray-900 dark:text-white">Réponses aux objections</span>
                        </div>
                        {showObjections ? (
                            <ChevronUp size={18} className="text-gray-400" />
                        ) : (
                            <ChevronDown size={18} className="text-gray-400" />
                        )}
                    </button>

                    {showObjections && (
                        <div className="px-4 pb-4 space-y-3">
                            {objections.map((obj) => (
                                <div key={obj.id} className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-lg p-3">
                                    <div className="text-sm font-medium text-orange-700 dark:text-orange-400 mb-2">
                                        ❌ "{obj.objection}"
                                    </div>
                                    <div className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-black/20 p-2 rounded">
                                        ✅ {obj.response}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tips */}
            <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border-t border-blue-200 dark:border-blue-500/20">
                <div className="flex items-start gap-2">
                    <MessageCircle size={16} className="text-blue-500 mt-0.5" />
                    <div className="text-xs text-blue-700 dark:text-blue-400">
                        <strong>Conseil :</strong> Souriez en parlant, cela s'entend au téléphone ! Personnalisez le script avec les informations du contact.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CallScriptPanel;
