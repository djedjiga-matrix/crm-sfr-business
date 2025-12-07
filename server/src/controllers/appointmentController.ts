import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/authMiddleware';

// Créer un rendez-vous
export const createAppointment = async (req: AuthRequest, res: Response) => {
    try {
        const { contactId, commercialId, date, address, notes } = req.body;
        const agentId = req.user?.userId;

        if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

        const appointment = await prisma.appointment.create({
            data: {
                contactId,
                commercialId,
                agentId,
                date: new Date(date),
                address,
                notes,
                status: 'SCHEDULED'
            }
        });

        // Mettre à jour le statut du contact
        await prisma.contact.update({
            where: { id: contactId },
            data: {
                status: 'APPOINTMENT_TAKEN',
                nextCallDate: new Date(date)
            }
        });

        res.status(201).json(appointment);
    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({ message: 'Error creating appointment', error });
    }
};

// Récupérer les rendez-vous (avec filtres)
export const getAppointments = async (req: AuthRequest, res: Response) => {
    try {
        const { start, end, commercialId } = req.query;
        const userId = req.user?.userId;
        const userRole = req.user?.role;

        const where: any = {};

        if (start && end) {
            const startDate = new Date(String(start));
            const endDate = new Date(String(end));

            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                where.date = {
                    gte: startDate,
                    lte: endDate
                };
            }
        }

        if (commercialId) {
            where.commercialId = String(commercialId);
        }

        // Logique de visibilité basée sur le rôle
        if (userRole === 'COMMERCIAL') {
            // Le commercial ne voit que ses propres rendez-vous
            where.commercialId = userId;
        } else if (userRole === 'AGENT') {
            // L'agent voit les rendez-vous des commerciaux qui sont dans les mêmes campagnes que lui
            // On vérifie les deux types d'assignation : relation directe (users) et table UserAssignment

            // 1. Récupérer les IDs des campagnes de l'agent
            const agentCampaigns = await prisma.campaign.findMany({
                where: {
                    OR: [
                        { users: { some: { id: userId } } },
                        { assignments: { some: { userId: userId, active: true } } }
                    ]
                },
                select: { id: true }
            });

            const campaignIds = agentCampaigns.map(c => c.id);

            if (campaignIds.length > 0) {
                // 2. Récupérer les commerciaux assignés à ces campagnes
                const commercials = await prisma.user.findMany({
                    where: {
                        role: 'COMMERCIAL',
                        OR: [
                            { campaigns: { some: { id: { in: campaignIds } } } },
                            { assignments: { some: { campaignId: { in: campaignIds }, active: true } } }
                        ]
                    },
                    select: { id: true }
                });

                const commercialIds = commercials.map(u => u.id);

                // Si un commercialId spécifique est demandé, on vérifie qu'il fait partie de la liste autorisée
                if (commercialId) {
                    if (!commercialIds.includes(String(commercialId))) {
                        return res.json([]);
                    }
                    where.commercialId = String(commercialId);
                } else {
                    // Sinon on montre tous les commerciaux accessibles
                    where.commercialId = { in: commercialIds };
                }
            } else {
                // Si l'agent n'a pas de campagne, il ne voit rien
                return res.json([]);
            }
        }
        // ADMIN voit tout (pas de restriction ajoutée à 'where')

        const appointments = await prisma.appointment.findMany({
            where,
            include: {
                contact: {
                    select: {
                        companyName: true,
                        address: true,
                        city: true,
                        phoneFixed: true,
                        phoneMobile: true,
                        civility: true,
                        managerName: true,
                        managerRole: true
                    }
                },
                commercial: {
                    select: { name: true }
                },
                agent: {
                    select: { name: true }
                }
            },
            orderBy: { date: 'asc' }
        });

        res.json(appointments);
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ message: 'Error fetching appointments', error });
    }
};

// Mettre à jour un rendez-vous
export const updateAppointment = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const userId = req.user?.userId;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        // Get current appointment
        const currentAppointment = await prisma.appointment.findUnique({
            where: { id }
        });

        if (!currentAppointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        if (data.date) {
            data.date = new Date(data.date);
        }

        // Prepare update data
        const updateData: any = { ...data };

        // Handle specific status logic
        if (data.status === 'SIGNED' && !currentAppointment.signedAt) {
            updateData.signedAt = new Date();
        }

        // Transaction to update and create history
        const result = await prisma.$transaction(async (prisma) => {
            const appointment = await prisma.appointment.update({
                where: { id },
                data: updateData
            });

            // Create history if status changed
            if (data.status && data.status !== currentAppointment.status) {
                await prisma.appointmentHistory.create({
                    data: {
                        appointmentId: id,
                        userId,
                        action: 'STATUS_CHANGE',
                        oldStatus: currentAppointment.status,
                        newStatus: data.status,
                        comment: data.reason || data.notes
                    }
                });
            }
            // Create history if date changed (Reschedule)
            else if (data.date && currentAppointment.date.getTime() !== data.date.getTime()) {
                await prisma.appointmentHistory.create({
                    data: {
                        appointmentId: id,
                        userId,
                        action: 'RESCHEDULE',
                        oldStatus: currentAppointment.status,
                        newStatus: currentAppointment.status,
                        comment: `Reprogrammé du ${currentAppointment.date.toLocaleString()} au ${data.date.toLocaleString()}`
                    }
                });
            }

            return appointment;
        });

        res.json(result);
    } catch (error) {
        console.error('Error updating appointment:', error);
        res.status(500).json({ message: 'Error updating appointment', error });
    }
};

// Récupérer l'historique d'un rendez-vous
export const getAppointmentHistory = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const history = await prisma.appointmentHistory.findMany({
            where: { appointmentId: id },
            include: {
                user: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching history', error });
    }
};

// Récupérer un rendez-vous par ID
export const getAppointmentById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const appointment = await prisma.appointment.findUnique({
            where: { id },
            include: {
                contact: true,
                commercial: { select: { name: true, id: true } },
                agent: { select: { name: true, id: true } }
            }
        });
        if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
        res.json(appointment);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching appointment', error });
    }
};

// Supprimer un rendez-vous
export const deleteAppointment = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.appointment.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Error deleting appointment', error });
    }
};

// Exporter les rendez-vous en CSV
export const exportAppointments = async (req: AuthRequest, res: Response) => {
    try {
        const { startDate, endDate } = req.query;
        const userId = req.user?.userId;
        const userRole = req.user?.role;

        const where: any = {};

        // Filtrage par période
        if (startDate && endDate) {
            const start = new Date(String(startDate));
            const end = new Date(String(endDate));

            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                where.createdAt = {
                    gte: start,
                    lte: end
                };
            }
        }

        // Logique de visibilité basée sur le rôle
        if (userRole === 'COMMERCIAL') {
            where.commercialId = userId;
        } else if (userRole === 'AGENT') {
            // L'agent ne peut exporter que ses propres RDV créés
            where.agentId = userId;
        }
        // ADMIN peut tout exporter

        const appointments = await prisma.appointment.findMany({
            where,
            include: {
                contact: {
                    select: {
                        uniqueId: true,
                        companyName: true,
                        managerName: true,
                        managerRole: true,
                        phoneFixed: true,
                        phoneMobile: true,
                        address: true,
                        zipCode: true,
                        city: true
                    }
                },
                commercial: {
                    select: { name: true }
                },
                agent: {
                    select: { name: true }
                },
                // Inclure l'historique pour trouver la date du dernier changement de statut
                history: {
                    where: { action: 'STATUS_CHANGE' },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { createdAt: true, newStatus: true }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        // Fonction pour échapper les valeurs CSV
        const escapeCSV = (value: any): string => {
            if (value === null || value === undefined) return '';
            const str = String(value);
            // Si contient virgule, guillemets ou nouvelle ligne, on encadre de guillemets
            if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes(';')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        // Fonction pour formater la date
        const formatDate = (date: Date | null): string => {
            if (!date) return '';
            return date.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        // Fonction pour formater la date courte
        const formatDateShort = (date: Date | null): string => {
            if (!date) return '';
            return date.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        };

        // Statuts en français
        const STATUS_LABELS: Record<string, string> = {
            'SCHEDULED': 'RDV à venir',
            'TO_RESCHEDULE': 'À reprogrammer',
            'TO_RECONTACT': 'À relancer',
            'RESCHEDULED': 'Décalé',
            'SIGNED': 'Signé',
            'CANCELLED': 'Annulé',
            'TO_CALLBACK': 'À rappeler',
            'CONFIRMED': 'Confirmé'
        };

        // En-têtes CSV (séparateur point-virgule pour Excel français)
        const headers = [
            'Date de création',
            'ID',
            'Date du RDV',
            'Commercial assigné',
            'Nom entreprise',
            'Nom du responsable',
            'Fonction',
            'Téléphone fixe',
            'Mobile',
            'Adresse',
            'Code postal',
            'Ville',
            'Statut',
            'Date changement statut',
            'Agent créateur'
        ];

        // Générer les lignes CSV
        const rows = appointments.map(appt => {
            // Récupérer la date du dernier changement de statut
            const lastStatusChange = appt.history && appt.history.length > 0
                ? appt.history[0].createdAt
                : null;

            return [
                escapeCSV(formatDate(appt.createdAt)),
                escapeCSV(appt.contact?.uniqueId || appt.id),
                escapeCSV(formatDate(appt.date)),
                escapeCSV(appt.commercial?.name || ''),
                escapeCSV(appt.contact?.companyName || ''),
                escapeCSV(appt.contact?.managerName || ''),
                escapeCSV(appt.contact?.managerRole || ''),
                escapeCSV(appt.contact?.phoneFixed || ''),
                escapeCSV(appt.contact?.phoneMobile || ''),
                escapeCSV(appt.contact?.address || ''),
                escapeCSV(appt.contact?.zipCode || ''),
                escapeCSV(appt.contact?.city || ''),
                escapeCSV(STATUS_LABELS[appt.status] || appt.status),
                escapeCSV(formatDate(lastStatusChange)),
                escapeCSV(appt.agent?.name || '')
            ];
        });

        // Construire le CSV avec séparateur point-virgule (pour Excel français)
        const csvContent = [
            headers.join(';'),
            ...rows.map(row => row.join(';'))
        ].join('\r\n');

        // Ajouter BOM pour UTF-8 (compatibilité Excel)
        const BOM = '\uFEFF';
        const csvWithBOM = BOM + csvContent;

        // Générer le nom du fichier
        const now = new Date();
        const filename = `Export_RDV_${formatDateShort(now).replace(/\//g, '-')}.csv`;

        // Headers de réponse pour téléchargement
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvWithBOM);

    } catch (error) {
        console.error('Error exporting appointments:', error);
        res.status(500).json({ message: 'Error exporting appointments' });
    }
};
