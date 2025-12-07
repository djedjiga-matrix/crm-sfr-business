import { Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/authMiddleware';

// Récupérer les logs d'audit avec pagination et filtres
export const getAuditLogs = async (req: AuthRequest, res: Response) => {
    try {
        const {
            page = 1,
            limit = 50,
            action,
            userId,
            dateStart,
            dateEnd,
            search
        } = req.query;

        const pageNum = Number(page);
        const limitNum = Math.min(Number(limit), 100);
        const skip = (pageNum - 1) * limitNum;

        const where: any = {};

        if (action) {
            where.action = { contains: String(action) };
        }

        if (userId) {
            where.userId = userId;
        }

        if (dateStart || dateEnd) {
            where.createdAt = {};
            if (dateStart) {
                where.createdAt.gte = new Date(String(dateStart));
            }
            if (dateEnd) {
                const end = new Date(String(dateEnd));
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        if (search) {
            where.OR = [
                { action: { contains: String(search), mode: 'insensitive' } },
                { details: { contains: String(search), mode: 'insensitive' } }
            ];
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true
                        }
                    }
                }
            }),
            prisma.auditLog.count({ where })
        ]);

        res.json({
            logs,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ message: 'Error fetching audit logs' });
    }
};

// Statistiques d'audit (pour le dashboard admin)
export const getAuditStats = async (req: AuthRequest, res: Response) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [totalToday, recentActions] = await Promise.all([
            // Total aujourd'hui
            prisma.auditLog.count({
                where: { createdAt: { gte: today } }
            }),
            // Actions récentes par type
            prisma.auditLog.groupBy({
                by: ['action'],
                _count: { action: true },
                where: { createdAt: { gte: today } },
                orderBy: { _count: { action: 'desc' } },
                take: 10
            })
        ]);

        res.json({
            totalToday,
            byAction: recentActions.map((a) => ({ action: a.action, count: a._count.action })),
        });
    } catch (error) {
        console.error('Error fetching audit stats:', error);
        res.status(500).json({ message: 'Error fetching audit stats' });
    }
};

// Exporter les logs en CSV
export const exportAuditLogs = async (req: AuthRequest, res: Response) => {
    try {
        const { dateStart, dateEnd, action } = req.query;

        const where: any = {};

        if (action) where.action = { contains: String(action) };
        if (dateStart || dateEnd) {
            where.createdAt = {};
            if (dateStart) where.createdAt.gte = new Date(String(dateStart));
            if (dateEnd) {
                const end = new Date(String(dateEnd));
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        const logs = await prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 10000, // Limite max
            include: {
                user: { select: { name: true, email: true } }
            }
        });

        // Générer CSV
        const headers = ['Date', 'Utilisateur', 'Action', 'Détails', 'IP'];
        const rows = logs.map((log) => [
            new Date(log.createdAt).toISOString(),
            log.user?.name || 'Système',
            log.action,
            (log.details || '').replace(/;/g, ',').replace(/\n/g, ' '),
            log.ipAddress || ''
        ]);

        const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
    } catch (error) {
        console.error('Error exporting audit logs:', error);
        res.status(500).json({ message: 'Error exporting audit logs' });
    }
};
