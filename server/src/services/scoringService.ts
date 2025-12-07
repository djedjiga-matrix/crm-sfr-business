/**
 * Service de scoring des contacts
 * Calcule un score de "potentiel" basé sur différents critères
 */

interface ContactForScoring {
    id: string;
    companyName?: string;
    activity?: string;
    city?: string;
    postalCode?: string;
    email?: string;
    phoneFixed?: string;
    phoneMobile?: string;
    siret?: string;
    effectif?: string;
    status?: string;
    callCount?: number;
    lastContactDate?: Date | string | null;
}

interface ScoreBreakdown {
    completeness: number;
    engagement: number;
    potential: number;
    timing: number;
    total: number;
}

/**
 * Calcule le score d'un contact (0-100)
 */
export const calculateContactScore = (contact: ContactForScoring): ScoreBreakdown => {
    let completeness = 0;
    let engagement = 0;
    let potential = 0;
    let timing = 0;

    // 1. COMPLÉTUDE DES DONNÉES (max 30 points)
    // Plus les données sont complètes, plus le contact est qualifié
    if (contact.companyName) completeness += 5;
    if (contact.email) completeness += 5;
    if (contact.phoneFixed || contact.phoneMobile) completeness += 5;
    if (contact.phoneFixed && contact.phoneMobile) completeness += 3; // Bonus double téléphone
    if (contact.siret) completeness += 4;
    if (contact.activity) completeness += 3;
    if (contact.city && contact.postalCode) completeness += 3;
    if (contact.effectif) completeness += 2;

    // 2. ENGAGEMENT / HISTORIQUE (max 25 points)
    // Contacts déjà engagés = plus intéressants
    const callCount = contact.callCount || 0;
    if (callCount > 0) {
        engagement += Math.min(15, callCount * 3); // Max 15 points pour les appels
    }

    // Status favorables
    const positiveStatuses = ['CALLBACK_LATER', 'FOLLOW_UP', 'APPOINTMENT_TAKEN'];
    if (positiveStatuses.includes(contact.status || '')) {
        engagement += 10;
    }

    // 3. POTENTIEL BUSINESS (max 30 points)
    // Taille de l'entreprise
    const effectif = contact.effectif?.toLowerCase() || '';
    if (effectif.includes('50') || effectif.includes('100') || effectif.includes('250')) {
        potential += 15; // Grandes entreprises = gros potentiel
    } else if (effectif.includes('20') || effectif.includes('30')) {
        potential += 10; // PME
    } else if (effectif.includes('10')) {
        potential += 5; // TPE
    }

    // Secteur d'activité (certains secteurs sont plus réceptifs)
    const activity = contact.activity?.toLowerCase() || '';
    const highValueSectors = ['tech', 'informatique', 'numérique', 'digital', 'finance', 'banque', 'assurance', 'santé', 'industrie'];
    if (highValueSectors.some(s => activity.includes(s))) {
        potential += 15;
    }

    // 4. TIMING / FRAÎCHEUR (max 15 points)
    // Contacts récemment mis à jour = plus chauds
    if (contact.lastContactDate) {
        const lastContact = new Date(contact.lastContactDate);
        const daysSinceContact = Math.floor((Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceContact <= 7) {
            timing += 15; // Contact cette semaine
        } else if (daysSinceContact <= 14) {
            timing += 12; // Contact il y a moins de 2 semaines
        } else if (daysSinceContact <= 30) {
            timing += 8; // Contact ce mois
        } else if (daysSinceContact <= 90) {
            timing += 4; // Contact dans les 3 mois
        }
    } else {
        // Nouveau contact = fraîcheur maximale
        if (contact.status === 'NEW') {
            timing += 15;
        }
    }

    // Statuts non intéressants = pénalité
    const negativeStatuses = ['NOT_INTERESTED', 'WRONG_NUMBER', 'OUT_OF_TARGET', 'ALREADY_CLIENT'];
    if (negativeStatuses.includes(contact.status || '')) {
        timing = 0;
        potential = Math.floor(potential / 2);
    }

    const total = completeness + engagement + potential + timing;

    return {
        completeness,
        engagement,
        potential,
        timing,
        total: Math.min(100, total)
    };
};

/**
 * Obtenir la catégorie de score
 */
export const getScoreCategory = (score: number): {
    label: string;
    color: string;
    priority: 'high' | 'medium' | 'low';
} => {
    if (score >= 70) {
        return { label: 'HOT', color: 'red', priority: 'high' };
    } else if (score >= 50) {
        return { label: 'WARM', color: 'orange', priority: 'medium' };
    } else if (score >= 30) {
        return { label: 'COOL', color: 'blue', priority: 'low' };
    } else {
        return { label: 'COLD', color: 'gray', priority: 'low' };
    }
};

/**
 * Trier les contacts par score
 */
export const sortContactsByScore = <T extends ContactForScoring>(contacts: T[]): T[] => {
    return [...contacts].sort((a, b) => {
        const scoreA = calculateContactScore(a).total;
        const scoreB = calculateContactScore(b).total;
        return scoreB - scoreA; // Tri décroissant
    });
};

/**
 * Recommandation d'action basée sur le score et le statut
 */
export const getRecommendedAction = (contact: ContactForScoring): string => {
    const score = calculateContactScore(contact).total;
    const status = contact.status || 'NEW';

    if (status === 'CALLBACK_LATER') {
        return 'Rappeler - Contact en attente de rappel';
    }
    if (status === 'FOLLOW_UP') {
        return 'Relancer - Suivi nécessaire';
    }
    if (status === 'APPOINTMENT_TAKEN') {
        return 'Préparer le RDV';
    }

    if (score >= 70) {
        return 'PRIORITAIRE - Contacter immédiatement';
    } else if (score >= 50) {
        return 'À contacter rapidement';
    } else if (score >= 30) {
        return 'À inclure dans le prochain batch';
    } else {
        return 'Faible priorité';
    }
};
