import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import prisma from '../prisma';

// Obtenir l'historique des appels
export const getCalls = async (req: AuthRequest, res: Response) => {
    try {
        const { page = 1, limit = 20, userId } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where: any = {};

        // Si l'utilisateur est un agent/commercial, il ne voit que ses appels
        // Sauf si on veut permettre aux commerciaux de voir tout ?
        // Restons simples : ADMIN voit tout, autres voient leurs appels
        if (req.user?.role !== 'ADMIN') {
            where.userId = req.user?.userId;
        } else if (userId) {
            // Admin peut filtrer par utilisateur
            where.userId = String(userId);
        }

        const [calls, total] = await prisma.$transaction([
            prisma.call.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { calledAt: 'desc' },
                include: {
                    contact: {
                        select: {
                            id: true,
                            companyName: true,
                            phoneFixed: true,
                            phoneMobile: true,
                        }
                    },
                    user: {
                        select: {
                            id: true,
                            name: true,
                        }
                    }
                }
            }),
            prisma.call.count({ where })
        ]);

        res.json({
            data: calls,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
// Qualifier un appel
export const qualifyCall = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { outcome, notes, contactStatus, nextCallDate } = req.body;
        const userId = req.user?.userId;

        console.log(`[QUALIFY] Call ${id} - Outcome: ${outcome}, Status: ${contactStatus}`);

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
                console.warn(`[QUALIFY] Received invalid date: ${nextCallDate}`);
            }
        }

        // 1. Update Call
        const call = await prisma.call.update({
            where: { id },
            data: {
                outcome: prismaOutcome,
                notes,
                recordingStatus: 'TREATED' // Will be confirmed by renamer
            },
            include: { contact: true }
        });

        console.log(`[QUALIFY] ✅ Call ${id} updated - New outcome: ${call.outcome}, Status: TREATED`);

        // 1.5 PROPAGER l'outcome aux appels avec enregistrement non qualifiés
        // Cela permet de synchroniser le statut des enregistrements avec la qualification du contact
        if (call.contactId) {
            const callsWithRecording = await prisma.call.findMany({
                where: {
                    contactId: call.contactId,
                    id: { not: id }, // Pas le même appel
                    recordingPath: { not: null },
                    outcome: 'OTHER' // Non encore qualifié
                    // PAS de limite de temps - propager à TOUS les enregistrements non qualifiés
                }
            });

            console.log(`[QUALIFY] 🔍 Recherche d'appels avec enregistrement pour contact ${call.contactId}: ${callsWithRecording.length} trouvé(s)`);

            if (callsWithRecording.length > 0) {
                console.log(`[QUALIFY] 📋 Propagation outcome vers ${callsWithRecording.length} appel(s) avec enregistrement`);

                for (const recCall of callsWithRecording) {
                    await prisma.call.update({
                        where: { id: recCall.id },
                        data: {
                            outcome: prismaOutcome,
                            recordingStatus: 'TREATED'
                        }
                    });
                    console.log(`[QUALIFY] 📋 Appel ${recCall.id} mis à jour avec outcome: ${prismaOutcome}`);

                    // Renommer cet appel aussi
                    const { renameRecording } = require('../services/recordingRenamer');
                    await renameRecording(recCall.id);
                }
            }
        }

        // 2. Update Contact
        if (call.contactId) {
            const updateData: any = {
                status: contactStatus,
                updatedAt: new Date()
            };

            const requiresCallback = ['CALLBACK_LATER', 'FOLLOW_UP'].includes(contactStatus);

            if (requiresCallback && validNextCallDate) {
                updateData.nextCallDate = validNextCallDate;
            } else if (!requiresCallback) {
                updateData.nextCallDate = null;
            }

            // Auto-assign for callbacks
            if (userId && (contactStatus === 'CALLBACK_LATER' || contactStatus === 'FOLLOW_UP')) {
                updateData.assignedToId = userId;
            }

            await prisma.contact.update({
                where: { id: call.contactId },
                data: updateData
            });
        }

        // 3. Trigger Renaming (Async or Await?)
        // User requested "Dès que l'agent valide... Le système déclenche automatiquement"
        // We can await it to return the new name immediately.

        // Import dynamically to avoid circular deps if any (though here it's fine)
        const { renameRecording } = require('../services/recordingRenamer');
        const newFilename = await renameRecording(id);

        res.json({
            message: 'Call qualified successfully',
            call,
            newFilename
        });

    } catch (error) {
        console.error('[QUALIFY] Error:', error);
        res.status(500).json({ message: 'Error qualifying call', error });
    }
};
