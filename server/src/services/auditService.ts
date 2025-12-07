import prisma from '../prisma';
import { Request } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';

interface AuditLogParams {
    userId?: string;
    action: string;
    details?: string;
    metadata?: any;
    req?: Request | AuthRequest;
}

/**
 * Service d'audit pour tracer les actions importantes
 */
export const logAudit = async (params: AuditLogParams) => {
    try {
        const { userId, action, details, metadata, req } = params;

        // Extraire IP et User-Agent de la requête
        let ipAddress: string | undefined;
        let userAgent: string | undefined;

        if (req) {
            ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]
                || req.socket?.remoteAddress
                || undefined;
            userAgent = req.headers['user-agent'];
        }

        // Le modèle AuditLog existant utilise 'details' comme string JSON
        const detailsStr = details || (metadata ? JSON.stringify(metadata) : undefined);

        await prisma.auditLog.create({
            data: {
                userId: userId || null,
                action,
                details: detailsStr,
                ipAddress: ipAddress || null,
                userAgent: userAgent || null
            }
        });

        // Log console en dev pour debug
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[AUDIT] ${action} by ${userId || 'system'}`);
        }
    } catch (error) {
        // Ne pas faire échouer l'opération principale si l'audit échoue
        console.error('[AUDIT] Error logging audit:', error);
    }
};

/**
 * Helper pour créer un log depuis un controller
 */
export const createAuditFromRequest = (
    req: AuthRequest,
    action: string,
    details?: string | object
) => {
    return logAudit({
        userId: req.user?.userId,
        action,
        details: typeof details === 'object' ? JSON.stringify(details) : details,
        req
    });
};

/**
 * Actions d'audit prédéfinies
 */
export const AuditActions = {
    // Auth
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',

    // Contacts
    CONTACT_CREATE: 'CONTACT_CREATE',
    CONTACT_UPDATE: 'CONTACT_UPDATE',
    CONTACT_DELETE: 'CONTACT_DELETE',
    CONTACT_QUALIFY: 'CONTACT_QUALIFY',

    // Appointments
    APPOINTMENT_CREATE: 'APPOINTMENT_CREATE',
    APPOINTMENT_UPDATE: 'APPOINTMENT_UPDATE',
    APPOINTMENT_DELETE: 'APPOINTMENT_DELETE',

    // Users
    USER_CREATE: 'USER_CREATE',
    USER_UPDATE: 'USER_UPDATE',
    USER_DELETE: 'USER_DELETE',

    // Imports/Exports
    IMPORT_CONTACTS: 'IMPORT_CONTACTS',
    EXPORT_CONTACTS: 'EXPORT_CONTACTS',
    EXPORT_GRH: 'EXPORT_GRH',
    EXPORT_RECORDINGS: 'EXPORT_RECORDINGS',

    // Campaigns
    CAMPAIGN_CREATE: 'CAMPAIGN_CREATE',
    CAMPAIGN_UPDATE: 'CAMPAIGN_UPDATE',
    CAMPAIGN_DELETE: 'CAMPAIGN_DELETE',
};
