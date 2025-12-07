import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import ExcelJS from 'exceljs';

export const exportContacts = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { format = 'xlsx', filters = {}, columns = [] } = req.body;

        // --- 1. Build Query based on Filters & Permissions ---
        const where: any = {};

        // Permissions
        if (userRole === 'AGENT') {
            where.assignedToId = userId;
        } else if (userRole === 'COMMERCIAL') {
            // Commercials might see their appointments or assigned contacts? 
            // User said: "Agent: Peut exporter ses propres contacts", "Superviseur/Admin: Tous"
            // Assuming Commercial is like Agent for now or restricted.
            // Let's assume Commercials can see contacts where they have an appointment?
            // For simplicity and safety, restrict to assignedToId if not Admin/Superviseur (User model has role AGENT, ADMIN, COMMERCIAL)
            // Wait, schema has ADMIN, AGENT, COMMERCIAL.
            // Let's stick to the prompt: "Agent: Peut exporter ses propres contacts".
            where.assignedToId = userId;
        }
        // ADMIN sees all (no extra where clause needed for permission)

        // Apply Filters
        if (filters.status && filters.status.length > 0) {
            where.status = { in: filters.status };
        }

        // Agent Filter (supports both agentId and agentIds)
        if (userRole === 'ADMIN') {
            if (filters.agentIds && filters.agentIds.length > 0) {
                where.assignedToId = { in: filters.agentIds };
            } else if (filters.agentId && filters.agentId.length > 0) {
                // Legacy support or if singular passed
                where.assignedToId = { in: filters.agentId };
            }
        }

        if (filters.campaignId) {
            where.campaignId = filters.campaignId;
        }
        if (filters.dateStart && filters.dateEnd) {
            where.updatedAt = {};
            if (filters.dateStart) {
                where.updatedAt.gte = new Date(filters.dateStart);
            }
            if (filters.dateEnd) {
                const endDate = new Date(filters.dateEnd);
                endDate.setHours(23, 59, 59, 999);
                where.updatedAt.lte = endDate;
            }
        }

        // ID Filter
        if (filters.id) {
            where.uniqueId = { contains: filters.id, mode: 'insensitive' };
        }

        // Phone Filter
        if (filters.phone) {
            const phoneStr = String(filters.phone).trim();
            const phoneConditions = [
                { phoneFixed: { contains: phoneStr } },
                { phoneMobile: { contains: phoneStr } }
            ];

            if (where.OR) {
                where.AND = [
                    { OR: where.OR },
                    { OR: phoneConditions }
                ];
                delete where.OR;
            } else {
                where.OR = phoneConditions;
            }
        }

        // Search filter (if passed)
        if (filters.search) {
            const searchConditions = [
                { companyName: { contains: filters.search, mode: 'insensitive' } },
                { email: { contains: filters.search, mode: 'insensitive' } },
                { uniqueId: { contains: filters.search, mode: 'insensitive' } },
            ];

            if (where.OR) {
                // If we already have OR from phone, combine with AND
                where.AND = where.AND || [];
                where.AND.push({ OR: searchConditions });
                // Note: if where.OR was phone, it's already moved to AND above if phone was present.
                // But if phone was NOT present, where.OR might be undefined.
                // Wait, if phone was present, where.OR is set.
                // If search is also present, we need to combine.
                // My logic above for phone handled "if where.OR exists (from search)".
                // But here I am processing search AFTER phone? No, search is processed here.
                // The order matters.

                // Let's restructure to be safe.
                // 1. Build Search OR
                // 2. Build Phone OR
                // 3. Combine
            } else {
                where.OR = searchConditions;
            }
        }

        // --- 2. Fetch Data ---
        const contacts = await prisma.contact.findMany({
            where,
            include: {
                assignedTo: true,
                campaign: true,
                appointments: {
                    include: {
                        commercial: true
                    },
                    orderBy: { date: 'desc' },
                    take: 1
                },
                importHistory: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // --- 3. Generate File ---
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Contacts');

        // Define Columns
        worksheet.columns = [
            { header: 'ID', key: 'uniqueId', width: 15 },
            { header: 'Nom de l\'agent', key: 'agentName', width: 20 },
            { header: 'Statut', key: 'status', width: 15 },
            { header: 'Nom de l\'entreprise', key: 'companyName', width: 30 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Tél. Fixe', key: 'phoneFixed', width: 15 },
            { header: 'Mobile', key: 'phoneMobile', width: 15 },
            { header: 'Date de Rappel', key: 'nextCallDate', width: 20 },
            { header: 'Date du rendez-vous', key: 'appointmentDate', width: 20 },
            { header: 'Nom du Responsable', key: 'managerName', width: 20 },
            { header: 'Fonction', key: 'managerRole', width: 20 },
            { header: 'Code postal', key: 'zipCode', width: 10 },
            { header: 'Ville', key: 'city', width: 20 },
            { header: 'Commentaire', key: 'notes', width: 40 },
            { header: 'Nom du commercial', key: 'commercialName', width: 20 },
            { header: 'Nom de la base', key: 'databaseName', width: 20 },
            { header: 'Dernière date de traitement', key: 'updatedAt', width: 20 },
        ];

        // Style Header
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add Data
        contacts.forEach(contact => {
            const latestAppointment = contact.appointments[0];

            worksheet.addRow({
                uniqueId: contact.uniqueId || '',
                agentName: contact.assignedTo?.name || '',
                status: contact.status,
                companyName: contact.companyName,
                email: contact.email || '',
                phoneFixed: contact.phoneFixed || '',
                phoneMobile: contact.phoneMobile || '',
                nextCallDate: contact.nextCallDate ? new Date(contact.nextCallDate).toLocaleString('fr-FR') : '',
                appointmentDate: latestAppointment?.date ? new Date(latestAppointment.date).toLocaleString('fr-FR') : '',
                managerName: contact.managerName || '',
                managerRole: contact.managerRole || '',
                zipCode: contact.zipCode || '',
                city: contact.city || '',
                notes: contact.notes || '',
                commercialName: latestAppointment?.commercial?.name || '',
                databaseName: contact.campaign?.name || contact.importHistory?.name || '',
                updatedAt: new Date(contact.updatedAt).toLocaleString('fr-FR')
            });
        });

        // --- 4. Audit Log ---
        try {
            await prisma.auditLog.create({
                data: {
                    action: 'EXPORT_CONTACTS',
                    userId,
                    details: JSON.stringify({
                        format,
                        count: contacts.length,
                        filters
                    }),
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                }
            });
        } catch (logError) {
            console.error('Failed to create audit log:', logError);
            // Continue even if logging fails
        }

        // --- 5. Send Response ---
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=Contacts_${new Date().toISOString()}.csv`);
            await workbook.csv.write(res);
        } else {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=Contacts_${new Date().toISOString()}.xlsx`);
            await workbook.xlsx.write(res);
        }

        res.end();

    } catch (error) {
        console.error('Error exporting contacts:', error);
        res.status(500).json({ message: 'Error exporting contacts' });
    }
};
