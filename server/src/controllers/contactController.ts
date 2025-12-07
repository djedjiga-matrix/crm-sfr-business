import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/authMiddleware';

// Créer un contact
export const createContact = async (req: AuthRequest, res: Response) => {
    try {
        const contactData = req.body;

        // Clean up empty strings for date fields to avoid Prisma validation errors
        if (contactData.nextCallDate === "" || contactData.nextCallDate === null) {
            delete contactData.nextCallDate;
        } else if (contactData.nextCallDate) {
            contactData.nextCallDate = new Date(contactData.nextCallDate);
        }

        const contact = await prisma.contact.create({
            data: {
                ...contactData,
                status: 'NEW',
                // Auto-assign to creator if not specified
                assignedToId: contactData.assignedToId || req.user?.userId
            },
        });
        res.status(201).json(contact);
    } catch (error: any) {
        console.error('Error creating contact:', error);
        if (error.code === 'P2002') {
            const target = error.meta?.target;
            if (Array.isArray(target)) {
                if (target.includes('phoneFixed')) {
                    return res.status(409).json({ message: 'Un contact avec ce numéro de téléphone fixe existe déjà.' });
                }
                if (target.includes('phoneMobile')) {
                    return res.status(409).json({ message: 'Un contact avec ce numéro de téléphone mobile existe déjà.' });
                }
                if (target.includes('email')) {
                    return res.status(409).json({ message: 'Un contact avec cet email existe déjà.' });
                }
            }
        }
        res.status(500).json({ message: 'Error creating contact', error: String(error) });
    }
};

// Récupérer tous les contacts (avec pagination et filtres)
export const getContacts = async (req: AuthRequest, res: Response) => {
    try {
        const { page = 1, limit = 50, status, search, campaignId, id, dateStart, dateEnd, agentIds, phone } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum > 0 ? pageNum - 1 : 0) * limitNum;

        const where: any = {};

        // 1. Basic Filters
        if (status) {
            if (Array.isArray(status)) {
                where.status = { in: status };
            } else {
                where.status = status;
            }
        }

        if (campaignId) {
            where.campaignId = String(campaignId);
        }

        if (search) {
            where.OR = [
                { companyName: { contains: String(search), mode: 'insensitive' } },
                { siret: { contains: String(search) } },
                { email: { contains: String(search), mode: 'insensitive' } },
                { uniqueId: { contains: String(search), mode: 'insensitive' } },
            ];
        }

        // 2. Advanced Filters

        // ID
        if (id) {
            where.uniqueId = { contains: String(id), mode: 'insensitive' };
        }

        // Date Range
        const dateType = req.query.dateType === 'createdAt' ? 'createdAt' : 'updatedAt';
        if (dateStart || dateEnd) {
            where[dateType] = {};
            if (dateStart && !isNaN(Date.parse(String(dateStart)))) {
                where[dateType].gte = new Date(String(dateStart));
            }
            if (dateEnd && !isNaN(Date.parse(String(dateEnd)))) {
                const endDate = new Date(String(dateEnd));
                endDate.setHours(23, 59, 59, 999);
                where[dateType].lte = endDate;
            }
        }

        // Agents
        if (agentIds) {
            const ids = Array.isArray(agentIds) ? agentIds : [agentIds];
            // Filter out empty strings or undefined
            const validIds = ids.filter(id => id && id !== 'undefined' && id !== 'null');
            if (validIds.length > 0) {
                where.assignedToId = { in: validIds };
            }
        }

        // Phone
        if (phone) {
            const phoneStr = String(phone).trim();
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

        // Permissions
        if (req.user?.role === 'AGENT') {
            const agent = await prisma.user.findUnique({
                where: { id: req.user.userId },
                include: {
                    assignments: {
                        where: { active: true },
                        select: { campaignId: true, databaseId: true }
                    }
                }
            });

            if (agent) {
                const campaignIds = agent.assignments.map(a => a.campaignId);
                const databaseIds = agent.assignments.map(a => a.databaseId).filter((id): id is string => !!id);

                console.log(`[GET_CONTACTS] Agent: ${agent.email} (${req.user.userId})`);
                console.log(`[GET_CONTACTS] Assignments: ${agent.assignments.length}`);
                console.log(`[GET_CONTACTS] Campaign IDs:`, campaignIds);
                console.log(`[GET_CONTACTS] Database IDs:`, databaseIds);

                const permissionCondition = {
                    OR: [
                        { assignedToId: req.user.userId },
                        {
                            AND: [
                                campaignIds.length > 0 ? { campaignId: { in: campaignIds } } : { campaignId: 'NO_ACCESS' },
                                databaseIds.length > 0 ? { importId: { in: databaseIds } } : { importId: 'NO_ACCESS' }
                            ]
                        }
                    ]
                };

                if (where.OR) {
                    // If we have search OR conditions, we combine them with permission AND
                    // (Search OR ...) AND (Permission OR ...)
                    where.AND = [
                        { OR: where.OR },
                        permissionCondition
                    ];
                    delete where.OR;
                } else if (where.AND) {
                    // If we already have AND conditions (e.g. from Phone), just add permission
                    where.AND.push(permissionCondition);
                } else {
                    where.AND = [permissionCondition];
                }
            }
        } else if (req.user?.role === 'COMMERCIAL') {
            where.assignedToId = req.user.userId;
        }

        const contacts = await prisma.contact.findMany({
            where,
            skip,
            take: limitNum,
            orderBy: { updatedAt: 'desc' },
            include: {
                assignedTo: {
                    select: { name: true, email: true }
                }
            }
        });

        const total = await prisma.contact.count({ where });

        res.json({
            data: contacts,
            meta: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ message: 'Error fetching contacts', error: String(error) });
    }
};

// Récupérer un contact par ID
export const getContactById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const contact = await prisma.contact.findUnique({
            where: { id },
            include: {
                calls: {
                    orderBy: { calledAt: 'desc' },
                    take: 5
                },
                appointments: true,
                assignedTo: {
                    select: { name: true }
                }
            },
        });

        if (!contact) {
            return res.status(404).json({ message: 'Contact not found' });
        }

        res.json(contact);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching contact', error });
    }
};

// Récupérer les notifications de rappel
export const getNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const now = new Date();
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
        // On regarde aussi un peu en arrière pour ne pas rater un rappel récent (ex: il y a 30 min)
        const pastWindow = new Date(now.getTime() - 30 * 60 * 1000);

        const callbacks = await prisma.contact.findMany({
            where: {
                assignedToId: userId,
                status: { in: ['CALLBACK_LATER', 'FOLLOW_UP'] },
                nextCallDate: {
                    gte: pastWindow,
                    lte: fiveMinutesFromNow
                }
            },
            select: {
                id: true,
                companyName: true,
                nextCallDate: true,
                status: true
            },
            orderBy: {
                nextCallDate: 'asc'
            }
        });

        res.json(callbacks);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
};

// Mettre à jour un contact
export const updateContact = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;

        // Destructure to remove fields that shouldn't be updated directly or are relations
        const {
            id: _id,
            calls,
            appointments,
            assignedTo,
            createdAt,
            updatedAt,
            importId,
            ...updateData
        } = req.body;

        console.log(`[UPDATE CONTACT] ID: ${id}`);

        // Ensure nextCallDate is a valid Date object if present
        if (updateData.nextCallDate) {
            updateData.nextCallDate = new Date(updateData.nextCallDate);
        }

        // Si le statut change pour un rappel, on assigne le contact à l'utilisateur courant
        if (userId && (updateData.status === 'CALLBACK_LATER' || updateData.status === 'FOLLOW_UP')) {
            updateData.assignedToId = userId;
        }

        console.log(`[UPDATE CONTACT] Payload (filtered):`, JSON.stringify(updateData, null, 2));

        const contact = await prisma.contact.update({
            where: { id },
            data: updateData,
        });

        res.json(contact);
    } catch (error: any) {
        console.error('[UPDATE CONTACT] Error:', error);
        res.status(500).json({
            message: 'Error updating contact',
            error: error.message,
            details: error.meta
        });
    }
};

// Supprimer un contact
export const deleteContact = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.contact.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Error deleting contact', error });
    }
};

// Supprimer plusieurs contacts
export const deleteContacts = async (req: AuthRequest, res: Response) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'No IDs provided' });
        }

        const result = await prisma.contact.deleteMany({
            where: {
                id: { in: ids }
            }
        });

        res.json({ message: `${result.count} contacts deleted successfully`, count: result.count });
    } catch (error) {
        console.error('Error deleting contacts:', error);
        res.status(500).json({ message: 'Error deleting contacts', error });
    }
};

// Récupérer le prochain contact pour le mode Preview
export const getNextContact = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const now = new Date();

        // Helper pour le include commun
        const contactInclude = {
            calls: { orderBy: { calledAt: 'desc' as const }, take: 5 },
            appointments: true,
            campaign: true
        };

        // Récupérer l'agent et ses assignations
        const agent = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                assignments: {
                    where: { active: true },
                    include: { database: true }
                }
            }
        });

        if (!agent) {
            return res.status(401).json({ message: 'Agent not found' });
        }

        const isAdmin = agent.role === 'ADMIN' || agent.role === 'SUPERVISEUR';
        const campaignIds = agent.assignments.map(a => a.campaignId);
        const databaseIds = agent.assignments.map(a => a.databaseId).filter((id): id is string => !!id);
        const hasAssignments = campaignIds.length > 0;

        let contact = null;

        // ===== PRIORITÉ 1: Rappels et Relances en retard (assignés à l'agent) =====
        // Ces contacts ont un nextCallDate dans le passé et sont en attente de rappel
        contact = await prisma.contact.findFirst({
            where: {
                assignedToId: userId,
                status: { in: ['CALLBACK_LATER', 'FOLLOW_UP'] },
                nextCallDate: { lte: now }
            },
            orderBy: { nextCallDate: 'asc' }, // Le plus urgent d'abord
            include: contactInclude
        });

        if (contact) {
            console.log(`[PREVIEW] 📞 Rappel urgent: ${contact.companyName} (NextCall: ${contact.nextCallDate})`);
            return res.json(contact);
        }

        // ===== PRIORITÉ 2: Nouveaux contacts (assignés à l'agent) =====
        contact = await prisma.contact.findFirst({
            where: {
                assignedToId: userId,
                status: 'NEW'
            },
            orderBy: { createdAt: 'asc' }, // FIFO
            include: contactInclude
        });

        if (contact) {
            console.log(`[PREVIEW] 🆕 Nouveau contact assigné: ${contact.companyName}`);
            return res.json(contact);
        }

        // ===== PRIORITÉ 3: Nouveaux contacts (NON assignés) - avec assignments =====
        // Chercher dans les bases actives assignées à l'agent
        if (hasAssignments && databaseIds.length > 0) {
            const unassignedNew = await prisma.contact.findFirst({
                where: {
                    assignedToId: null,
                    status: 'NEW',
                    importHistory: { isActive: true },
                    campaignId: { in: campaignIds },
                    importId: { in: databaseIds }
                },
                orderBy: { createdAt: 'asc' },
                select: { id: true }
            });

            if (unassignedNew) {
                // Assigner ce contact à l'agent
                contact = await prisma.contact.update({
                    where: { id: unassignedNew.id },
                    data: { assignedToId: userId },
                    include: contactInclude
                });
                console.log(`[PREVIEW] 🆕 Nouveau contact assigné automatiquement: ${contact.companyName}`);
                return res.json(contact);
            }
        }

        // ===== PRIORITÉ 3B: FALLBACK - Admins ou agents sans assignments =====
        // Si l'agent est admin OU n'a pas d'assignments, chercher n'importe quel contact NEW non assigné
        if (isAdmin || !hasAssignments) {
            const fallbackNew = await prisma.contact.findFirst({
                where: {
                    assignedToId: null,
                    status: 'NEW'
                },
                orderBy: { createdAt: 'asc' },
                select: { id: true }
            });

            if (fallbackNew) {
                contact = await prisma.contact.update({
                    where: { id: fallbackNew.id },
                    data: { assignedToId: userId },
                    include: contactInclude
                });
                console.log(`[PREVIEW] 🆕 Fallback - Nouveau contact: ${contact.companyName} (Admin/NoAssignment)`);
                return res.json(contact);
            }
        }

        // ===== PRIORITÉ 4: Recyclage des contacts selon la configuration des bases =====
        // Quand il n'y a plus de contacts NEW, on recycle les NRP, Répondeurs, Absents, Injoignables
        // selon la configuration de chaque base de données

        // Récupérer les configurations de recyclage des bases assignées
        const databases = await prisma.importHistory.findMany({
            where: {
                id: { in: databaseIds },
                isActive: true,
                recycleEnabled: true
            } as any
        });

        for (const db of databases) {
            // Calculer le cutoff basé sur la config de la base
            const dbAny = db as any;
            const recycleDelayMs = (dbAny.recycleDelayMinutes || 30) * 60 * 1000;
            const recycleCutoff = new Date(now.getTime() - recycleDelayMs);

            // Construire la liste des statuts à recycler
            const recyclableStatuses: any[] = [];
            if (dbAny.recycleNRP) recyclableStatuses.push('NRP');
            if (dbAny.recycleAnsweringMachine) recyclableStatuses.push('ANSWERING_MACHINE');
            if (dbAny.recycleAbsent) recyclableStatuses.push('ABSENT');
            if (dbAny.recycleUnreachable) recyclableStatuses.push('UNREACHABLE');

            if (recyclableStatuses.length === 0) continue;

            // Chercher d'abord dans les contacts assignés à l'agent
            contact = await prisma.contact.findFirst({
                where: {
                    assignedToId: userId,
                    importId: db.id,
                    status: { in: recyclableStatuses },
                    updatedAt: { lt: recycleCutoff } // Pas touché depuis X minutes
                } as any,
                orderBy: { updatedAt: 'asc' }, // Les plus anciens d'abord
                include: contactInclude
            });

            if (contact) {
                console.log(`[PREVIEW] 🔄 Recyclage (assigné): ${contact.companyName} - Status: ${contact.status} - Base: ${db.name}`);
                return res.json(contact);
            }

            // Si pas trouvé dans les assignés, chercher dans les non-assignés
            const unassignedRecycle = await prisma.contact.findFirst({
                where: {
                    assignedToId: null,
                    importId: db.id,
                    status: { in: recyclableStatuses },
                    updatedAt: { lt: recycleCutoff },
                    campaignId: { in: campaignIds }
                } as any,
                orderBy: { updatedAt: 'asc' },
                select: { id: true }
            });

            if (unassignedRecycle) {
                contact = await prisma.contact.update({
                    where: { id: unassignedRecycle.id },
                    data: { assignedToId: userId },
                    include: contactInclude
                });
                console.log(`[PREVIEW] 🔄 Recyclage (auto-assigné): ${contact.companyName} - Status: ${contact.status} - Base: ${db.name}`);
                return res.json(contact);
            }
        }

        // Aucun contact disponible
        console.log(`[PREVIEW] ⚠️ Aucun contact disponible pour l'agent ${userId}`);
        return res.status(204).send();

    } catch (error) {
        console.error('Error fetching next contact:', error);
        res.status(500).json({ message: 'Error fetching next contact' });
    }
};

// Rechercher un contact par ID unique
export const searchContactByUniqueId = async (req: AuthRequest, res: Response) => {
    try {
        const { uniqueId } = req.params;

        const contact = await prisma.contact.findUnique({
            where: { uniqueId },
            include: {
                calls: { orderBy: { calledAt: 'desc' }, take: 5 },
                appointments: true,
                campaign: true,
                assignedTo: { select: { name: true } }
            }
        });

        if (!contact) {
            return res.status(404).json({ message: 'Contact not found' });
        }

        res.json(contact);
    } catch (error) {
        console.error('Error searching contact by ID:', error);
        res.status(500).json({ message: 'Error searching contact' });
    }
};

// Qualifier un contact (sans appel existant)
export const qualifyContact = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { outcome, notes, contactStatus, nextCallDate } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        console.log(`[QUALIFY CONTACT] Contact ${id} - Outcome: ${outcome}, Status: ${contactStatus}`);

        // Map frontend outcome to Prisma CallOutcome enum
        // ContactStatus et CallOutcome ont des valeurs différentes
        let prismaOutcome: any = outcome;

        // Mappings pour les statuts qui n'existent pas dans CallOutcome
        switch (outcome) {
            case 'WRONG_NUMBER': prismaOutcome = 'WRONG_CONTACT'; break;
            case 'NRP': prismaOutcome = 'UNREACHABLE'; break;
            case 'ABSENT': prismaOutcome = 'UNREACHABLE'; break;
            case 'OUT_OF_TARGET': prismaOutcome = 'NOT_INTERESTED'; break;
            case 'ALREADY_CLIENT': prismaOutcome = 'OTHER'; break;
            case 'FOLLOW_UP': prismaOutcome = 'CALLBACK_LATER'; break;
        }

        // Validate against enum (basic check, or let Prisma throw if invalid)
        const validOutcomes = ['APPOINTMENT_TAKEN', 'UNREACHABLE', 'ANSWERING_MACHINE', 'CALLBACK_LATER', 'NOT_INTERESTED', 'BUSY', 'REFUSAL', 'WRONG_CONTACT', 'OTHER'];
        if (!validOutcomes.includes(prismaOutcome)) {
            prismaOutcome = 'OTHER';
        }

        // Handle Date Validation safely
        let validNextCallDate: Date | null = null;
        if (nextCallDate) {
            const d = new Date(nextCallDate);
            if (!isNaN(d.getTime())) {
                validNextCallDate = d;
            } else {
                console.warn(`[QUALIFY CONTACT] Received invalid date: ${nextCallDate}`);
            }
        }

        // 1. Create a "Manual" Call record
        const call = await prisma.call.create({
            data: {
                contactId: id,
                userId: userId,
                // status: outcome, // Removed: field does not exist
                outcome: prismaOutcome,
                notes: notes,
                duration: 0,
                calledAt: new Date(),
                direction: 'OUTBOUND', // Assumed
                recordingStatus: 'NO_RECORDING'
            }
        });

        // 2. Update Contact
        const updateData: any = {
            status: contactStatus,
            updatedAt: new Date()
        };

        // Logic to update nextCallDate:
        // If status requires a callback (CALLBACK_LATER, FOLLOW_UP) and we have a valid date, use it.
        // If status DOES NOT require callback, we should FORCE CLEAR the nextCallDate (set to null) 
        // to prevent old dates from triggering notifications.
        const requiresCallback = ['CALLBACK_LATER', 'FOLLOW_UP'].includes(contactStatus);

        if (requiresCallback && validNextCallDate) {
            updateData.nextCallDate = validNextCallDate;
        } else if (!requiresCallback) {
            updateData.nextCallDate = null;
        }
        // If requiresCallback is true but no date provided, we leave it alone (or could enforce it?)
        // Implicitly if frontend sends null, validNextCallDate is null, so we didn't enter the first branch.
        // But if we are in 'CALLBACK_LATER' and user didn't send date, that's an issue? 
        // Frontend validation should handle that. Using old date is acceptable if intention was just to update status.
        // However, usually we want to clear if we move AWAY from callback.

        // Auto-assign for callbacks
        if (userId && (contactStatus === 'CALLBACK_LATER' || contactStatus === 'FOLLOW_UP')) {
            updateData.assignedToId = userId;
        }

        const contact = await prisma.contact.update({
            where: { id },
            data: updateData
        });

        res.json({
            message: 'Contact qualified successfully',
            call,
            contact
        });

    } catch (error) {
        console.error('[QUALIFY CONTACT] Error:', error);
        res.status(500).json({ message: 'Error qualifying contact', error });
    }
};
