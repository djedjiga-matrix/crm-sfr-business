import { Request, Response, NextFunction } from 'express';

/**
 * Validation des entrées de base pour prévenir les injections
 */

// Liste des caractères suspects à surveiller
const SUSPICIOUS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Scripts
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers
    /data:text\/html/gi,
    /<!--/g, // HTML comments
    /-->/g,
];

// Sanitize une chaîne de caractères
export const sanitizeString = (str: string): string => {
    if (typeof str !== 'string') return str;
    let sanitized = str.trim();

    // Supprimer les patterns dangereux
    for (const pattern of SUSPICIOUS_PATTERNS) {
        sanitized = sanitized.replace(pattern, '');
    }

    // Encode les caractères HTML de base
    sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');

    return sanitized;
};

// Valide un email
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Valide un UUID
export const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};

// Valide un numéro de téléphone français
export const isValidFrenchPhone = (phone: string): boolean => {
    const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
};

// Valide un SIRET
export const isValidSIRET = (siret: string): boolean => {
    const cleaned = siret.replace(/\s/g, '');
    return /^\d{14}$/.test(cleaned);
};

// Middleware de validation des IDs dans les params
export const validateIdParam = (paramName: string = 'id') => {
    return (req: Request, res: Response, next: NextFunction) => {
        const id = req.params[paramName];

        if (!id) {
            return res.status(400).json({ message: `Parameter ${paramName} is required` });
        }

        if (!isValidUUID(id)) {
            return res.status(400).json({ message: `Invalid ${paramName} format` });
        }

        next();
    };
};

// Middleware de validation du body
export const validateBody = (requiredFields: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const missingFields = requiredFields.filter(field => {
            const value = req.body[field];
            return value === undefined || value === null || value === '';
        });

        if (missingFields.length > 0) {
            return res.status(400).json({
                message: 'Missing required fields',
                fields: missingFields
            });
        }

        next();
    };
};

// Middleware de validation de l'email
export const validateEmail = (req: Request, res: Response, next: NextFunction) => {
    const email = req.body.email;

    if (email && !isValidEmail(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
    }

    next();
};

// Limiter la longueur des champs texte
export const validateTextLength = (fieldName: string, maxLength: number) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const value = req.body[fieldName];

        if (value && typeof value === 'string' && value.length > maxLength) {
            return res.status(400).json({
                message: `Field ${fieldName} exceeds maximum length of ${maxLength} characters`
            });
        }

        next();
    };
};

// Nettoyage global du body
export const sanitizeBody = (req: Request, res: Response, next: NextFunction) => {
    const sanitizeObject = (obj: any): any => {
        if (typeof obj === 'string') {
            // Pour les mots de passe et autres champs sensibles, ne pas sanitizer
            return obj.trim();
        }
        if (Array.isArray(obj)) {
            return obj.map(item => sanitizeObject(item));
        }
        if (obj && typeof obj === 'object') {
            const sanitized: any = {};
            for (const key of Object.keys(obj)) {
                sanitized[key] = sanitizeObject(obj[key]);
            }
            return sanitized;
        }
        return obj;
    };

    if (req.body) {
        req.body = sanitizeObject(req.body);
    }

    next();
};
