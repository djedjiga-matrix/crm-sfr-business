
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDatabases = async (req: Request, res: Response) => {
    try {
        const imports = await prisma.importHistory.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: { name: true }
                },
                contacts: {
                    select: { status: true, campaignId: true }
                },
                assignedUsers: {
                    select: { id: true, name: true, role: true }
                }
            }
        });

        const databases = await Promise.all(imports.map(async imp => {
            const total = imp.contacts.length;
            const impAny = imp as any;

            // Define status categories
            const exploitableStatuses = ['NEW', 'FOLLOW_UP', 'CALLBACK_LATER', 'NRP', 'ANSWERING_MACHINE', 'ABSENT'];
            const argumentedStatuses = ['NOT_INTERESTED', 'APPOINTMENT_TAKEN'];
            const positiveStatuses = ['APPOINTMENT_TAKEN'];

            let exploitableCount = 0;
            let argumentedCount = 0;
            let positiveCount = 0;

            // Try to get campaignId from first contact
            let campaignId: string | null = null;
            let campaignName: string | null = null;

            imp.contacts.forEach(c => {
                if (exploitableStatuses.includes(c.status)) exploitableCount++;
                if (argumentedStatuses.includes(c.status)) argumentedCount++;
                if (positiveStatuses.includes(c.status)) positiveCount++;
                if (!campaignId && c.campaignId) {
                    campaignId = c.campaignId;
                }
            });

            // Get campaign name if we have an ID
            if (campaignId) {
                const campaign = await prisma.campaign.findUnique({
                    where: { id: campaignId },
                    select: { name: true }
                });
                campaignName = campaign?.name || null;
            }

            return {
                id: imp.id,
                name: imp.name || imp.filename,
                filename: imp.filename,
                date: imp.createdAt,
                isActive: imp.isActive,
                importerName: imp.user.name,
                totalContacts: total,
                campaignId,
                campaignName,
                assignedUsers: imp.assignedUsers,
                // Configuration du recyclage
                recycleEnabled: impAny.recycleEnabled ?? true,
                recycleNRP: impAny.recycleNRP ?? true,
                recycleAnsweringMachine: impAny.recycleAnsweringMachine ?? true,
                recycleAbsent: impAny.recycleAbsent ?? true,
                recycleUnreachable: impAny.recycleUnreachable ?? true,
                recycleDelayMinutes: impAny.recycleDelayMinutes ?? 30,
                stats: {
                    exploitable: total > 0 ? Math.round((exploitableCount / total) * 100) : 0,
                    argumented: total > 0 ? Math.round((argumentedCount / total) * 100) : 0,
                    positive: total > 0 ? Math.round((positiveCount / total) * 100) : 0,
                    counts: {
                        exploitable: exploitableCount,
                        argumented: argumentedCount,
                        positive: positiveCount
                    }
                }
            };
        }));

        res.json(databases);
    } catch (error) {
        console.error('Error fetching databases:', error);
        res.status(500).json({ error: 'Error fetching databases' });
    }
};

export const toggleDatabaseStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body;

    try {
        const updatedDatabase = await prisma.importHistory.update({
            where: { id },
            data: { isActive },
        });

        res.json(updatedDatabase);
    } catch (error) {
        console.error('Error updating database status:', error);
        res.status(500).json({ error: 'Error updating database status' });
    }
};

export const updateRecycleSettings = async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
        recycleEnabled,
        recycleNRP,
        recycleAnsweringMachine,
        recycleAbsent,
        recycleUnreachable,
        recycleDelayMinutes
    } = req.body;

    try {
        const updatedDatabase = await prisma.importHistory.update({
            where: { id },
            data: {
                recycleEnabled,
                recycleNRP,
                recycleAnsweringMachine,
                recycleAbsent,
                recycleUnreachable,
                recycleDelayMinutes
            } as any,
        });

        res.json(updatedDatabase);
    } catch (error) {
        console.error('Error updating recycle settings:', error);
        res.status(500).json({ error: 'Error updating recycle settings' });
    }
};

export const recycleDatabase = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        // Recycler les contacts de cette base
        // On remet à 'NEW' tous les contacts qui ne sont pas dans les statuts finaux ou planifiés
        // Statuts à EXCLURE du recyclage : 'APPOINTMENT_TAKEN', 'NOT_INTERESTED', 'CALLBACK_LATER', 'FOLLOW_UP'
        // Tous les autres (NRP, UNREACHABLE, ANSWERING_MACHINE, ABSENT, etc.) sont remis à 'NEW'

        const result = await prisma.contact.updateMany({
            where: {
                importId: id,
                status: {
                    notIn: ['APPOINTMENT_TAKEN', 'NOT_INTERESTED', 'CALLBACK_LATER', 'FOLLOW_UP']
                }
            },
            data: {
                status: 'NEW',
                assignedToId: null
            }
        });

        res.json({ message: 'Database recycled successfully', count: result.count });
    } catch (error) {
        console.error('Error recycling database:', error);
        res.status(500).json({ error: 'Error recycling database' });
    }
};

// Assign users to a database
export const assignUsersToDatabase = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { userIds } = req.body;

    try {
        // Clear existing assignments and set new ones
        const updatedDatabase = await prisma.importHistory.update({
            where: { id },
            data: {
                assignedUsers: {
                    set: userIds.map((userId: string) => ({ id: userId }))
                }
            },
            include: {
                assignedUsers: {
                    select: { id: true, name: true, role: true }
                }
            }
        });

        res.json({
            message: 'Users assigned successfully',
            assignedUsers: updatedDatabase.assignedUsers
        });
    } catch (error) {
        console.error('Error assigning users to database:', error);
        res.status(500).json({ error: 'Error assigning users to database' });
    }
};
