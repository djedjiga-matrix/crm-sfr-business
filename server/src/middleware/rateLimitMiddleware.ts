import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

// Store en mémoire pour le rate limiting (à remplacer par Redis en production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Nettoyer les entrées expirées périodiquement
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetTime < now) {
            rateLimitStore.delete(key);
        }
    }
}, 60000); // Chaque minute

interface RateLimitOptions {
    windowMs?: number;      // Fenêtre de temps en ms (défaut: 15 minutes)
    max?: number;           // Nombre max de requêtes dans la fenêtre (défaut: 100)
    message?: string;       // Message d'erreur personnalisé
    keyGenerator?: (req: Request) => string;  // Fonction pour générer la clé unique
    skipSuccessfulRequests?: boolean;         // Ne pas compter les requêtes réussies
    skipFailedRequests?: boolean;             // Ne pas compter les requêtes échouées
}

/**
 * Middleware de rate limiting
 */
export const rateLimit = (options: RateLimitOptions = {}) => {
    const {
        windowMs = 15 * 60 * 1000,  // 15 minutes par défaut
        max = 100,
        message = 'Trop de requêtes, veuillez réessayer plus tard.',
        keyGenerator = (req) => {
            // Utiliser IP + route comme clé par défaut
            const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]
                || req.socket?.remoteAddress
                || 'unknown';
            return `${ip}:${req.path}`;
        }
    } = options;

    return (req: Request, res: Response, next: NextFunction) => {
        const key = keyGenerator(req);
        const now = Date.now();
        const entry = rateLimitStore.get(key);

        if (!entry || entry.resetTime < now) {
            // Nouvelle entrée ou entrée expirée
            rateLimitStore.set(key, {
                count: 1,
                resetTime: now + windowMs
            });

            // Ajouter les headers de rate limit
            res.setHeader('X-RateLimit-Limit', max);
            res.setHeader('X-RateLimit-Remaining', max - 1);
            res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));

            return next();
        }

        // Incrémenter le compteur
        entry.count++;

        const remaining = Math.max(0, max - entry.count);
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', remaining);
        res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

        if (entry.count > max) {
            // Limite dépassée
            const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
            res.setHeader('Retry-After', retryAfter);

            console.log(`[RATE LIMIT] Blocked ${key} - ${entry.count}/${max} requests`);

            return res.status(429).json({
                error: 'Too Many Requests',
                message,
                retryAfter
            });
        }

        next();
    };
};

/**
 * Rate limiter spécifique pour l'authentification (plus restrictif)
 */
export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 5,                     // 5 tentatives max
    message: 'Trop de tentatives de connexion. Compte temporairement bloqué.',
    keyGenerator: (req) => {
        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]
            || req.socket?.remoteAddress
            || 'unknown';
        // Pour le login, inclure l'email dans la clé
        const email = req.body?.email || 'unknown';
        return `auth:${ip}:${email}`;
    }
});

/**
 * Rate limiter pour les API génériques
 */
export const apiRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000,   // 1 minute
    max: 60,                    // 60 requêtes par minute
    message: 'Limite de requêtes API atteinte.'
});

/**
 * Rate limiter pour les exports (opérations lourdes)
 */
export const exportRateLimit = rateLimit({
    windowMs: 5 * 60 * 1000,   // 5 minutes
    max: 5,                     // 5 exports max en 5 minutes
    message: 'Trop d\'exports demandés. Veuillez patienter.'
});

/**
 * Rate limiter pour les imports
 */
export const importRateLimit = rateLimit({
    windowMs: 10 * 60 * 1000,  // 10 minutes
    max: 3,                     // 3 imports max en 10 minutes
    message: 'Trop d\'imports en cours. Veuillez patienter.'
});

export default rateLimit;
