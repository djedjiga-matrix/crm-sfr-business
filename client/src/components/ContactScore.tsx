import { Flame, Thermometer, Snowflake, Target } from 'lucide-react';

interface ContactScoreProps {
    score: number;
    size?: 'sm' | 'md' | 'lg';
    showBreakdown?: boolean;
    breakdown?: {
        completeness: number;
        engagement: number;
        potential: number;
        timing: number;
    };
}

// Calcul du score côté frontend (version simplifiée)
export const calculateFrontendScore = (contact: any): number => {
    let score = 0;

    // Complétude
    if (contact.companyName) score += 5;
    if (contact.email) score += 5;
    if (contact.phoneFixed || contact.phoneMobile) score += 5;
    if (contact.siret) score += 4;
    if (contact.activity) score += 3;
    if (contact.city) score += 3;

    // Statut favorable
    const goodStatuses = ['CALLBACK_LATER', 'FOLLOW_UP'];
    if (goodStatuses.includes(contact.status)) score += 20;
    if (contact.status === 'NEW') score += 10;

    // Mauvais statuts
    const badStatuses = ['NOT_INTERESTED', 'WRONG_NUMBER', 'OUT_OF_TARGET'];
    if (badStatuses.includes(contact.status)) score -= 30;

    return Math.min(100, Math.max(0, score));
};

const ContactScore = ({ score, size = 'md', showBreakdown = false, breakdown }: ContactScoreProps) => {
    // Déterminer la catégorie
    const getCategory = () => {
        if (score >= 70) return { label: 'HOT', color: 'red', icon: Flame, gradient: 'from-red-500 to-orange-500' };
        if (score >= 50) return { label: 'WARM', color: 'orange', icon: Thermometer, gradient: 'from-orange-500 to-yellow-500' };
        if (score >= 30) return { label: 'COOL', color: 'blue', icon: Target, gradient: 'from-blue-500 to-cyan-500' };
        return { label: 'COLD', color: 'gray', icon: Snowflake, gradient: 'from-gray-400 to-gray-600' };
    };

    const category = getCategory();
    const Icon = category.icon;

    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-12 h-12 text-sm',
        lg: 'w-16 h-16 text-lg'
    };

    const iconSizes = {
        sm: 12,
        md: 16,
        lg: 24
    };

    return (
        <div className="flex items-center gap-2">
            {/* Score Circle */}
            <div className={`relative ${sizeClasses[size]} rounded-full bg-gradient-to-br ${category.gradient} flex items-center justify-center shadow-lg`}>
                <span className="font-bold text-white">{score}</span>

                {/* Ring animation for hot leads */}
                {score >= 70 && (
                    <div className="absolute inset-0 rounded-full animate-ping opacity-30 bg-red-500" />
                )}
            </div>

            {/* Label */}
            {size !== 'sm' && (
                <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                        <Icon size={iconSizes[size]} className={`text-${category.color}-500`} />
                        <span className={`font-bold text-${category.color}-500 text-xs`}>{category.label}</span>
                    </div>
                    {size === 'lg' && (
                        <span className="text-[10px] text-gray-500">Score de potentiel</span>
                    )}
                </div>
            )}

            {/* Breakdown */}
            {showBreakdown && breakdown && (
                <div className="ml-4 grid grid-cols-2 gap-2 text-[10px]">
                    <ScoreBar label="Données" value={breakdown.completeness} max={30} color="blue" />
                    <ScoreBar label="Engagement" value={breakdown.engagement} max={25} color="green" />
                    <ScoreBar label="Potentiel" value={breakdown.potential} max={30} color="purple" />
                    <ScoreBar label="Fraîcheur" value={breakdown.timing} max={15} color="orange" />
                </div>
            )}
        </div>
    );
};

// Mini barre de score
const ScoreBar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => {
    const percentage = (value / max) * 100;
    const colors: Record<string, string> = {
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        purple: 'bg-purple-500',
        orange: 'bg-orange-500',
        red: 'bg-red-500'
    };

    return (
        <div>
            <div className="flex justify-between text-gray-500 mb-0.5">
                <span>{label}</span>
                <span>{value}/{max}</span>
            </div>
            <div className="h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full ${colors[color]}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

// Badge compact pour les tableaux
export const ScoreBadge = ({ score }: { score: number }) => {
    const getColors = () => {
        if (score >= 70) return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';
        if (score >= 50) return 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400';
        if (score >= 30) return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
        return 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-400';
    };

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${getColors()}`}>
            {score}
        </span>
    );
};

export default ContactScore;
