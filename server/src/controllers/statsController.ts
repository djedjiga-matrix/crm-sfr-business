import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import { startOfDay, endOfDay, parseISO, isValid, differenceInHours, eachDayOfInterval, eachHourOfInterval, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

export const getStats = async (req: AuthRequest, res: Response) => {
    try {
        // 1. Déterminer la plage de dates
        let start = startOfDay(new Date());
        let end = endOfDay(new Date());

        if (req.query.startDate && typeof req.query.startDate === 'string') {
            const parsedStart = parseISO(req.query.startDate);
            if (isValid(parsedStart)) start = parsedStart;
        }

        if (req.query.endDate && typeof req.query.endDate === 'string') {
            const parsedEnd = parseISO(req.query.endDate);
            if (isValid(parsedEnd)) end = parsedEnd;
        }

        // S'assurer que end est après start
        if (end < start) {
            end = endOfDay(start);
        }

        // Agent filter from query params (for admin/superviseur filtering)
        const filterAgentId = req.query.agentId as string | undefined;

        // Filtres utilisateur basés sur le rôle OU le filtre agent explicite
        let whereUser: any = {};
        let whereCommercial: any = {};
        let whereAgent: any = {};

        if (filterAgentId) {
            // Si un filtre agent est spécifié, l'utiliser
            whereUser = { userId: filterAgentId };
            whereAgent = { agentId: filterAgentId };
        } else if (req.user?.role === 'COMMERCIAL') {
            whereUser = { userId: req.user.userId };
            whereCommercial = { commercialId: req.user.userId };
        } else if (req.user?.role === 'AGENT') {
            whereUser = { userId: req.user.userId };
            whereAgent = { agentId: req.user.userId };
        }

        // 2. Récupérer les appels pour la période
        const calls = await prisma.call.findMany({
            where: {
                ...whereUser,
                calledAt: {
                    gte: start,
                    lte: end
                }
            },
            select: { calledAt: true }
        });

        // 3. Récupérer les RDV pris (créés) pendant la période
        const appointments = await prisma.appointment.findMany({
            where: {
                ...whereCommercial,
                ...whereAgent,
                createdAt: {
                    gte: start,
                    lte: end
                }
            },
            select: {
                id: true,
                createdAt: true,
                status: true
            }
        });

        // 4. Calculer les RDV signés parmi les RDV de la période
        // On compte les RDV créés dans la période qui ont un statut "SIGNED"
        const signedAppointments = appointments.filter(a => a.status === 'SIGNED').length;

        // 5. Pour le taux de conversion hebdomadaire:
        // RDV signés cette semaine / RDV pris cette semaine
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Lundi
        const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 }); // Dimanche

        // RDV pris cette semaine (tous les RDV créés cette semaine)
        const weeklyAppointments = await prisma.appointment.findMany({
            where: {
                ...whereCommercial,
                ...whereAgent,
                createdAt: {
                    gte: weekStart,
                    lte: weekEnd
                }
            },
            select: { id: true, status: true }
        });

        const weeklyAppointmentsCount = weeklyAppointments.length;
        const weeklySignedCount = weeklyAppointments.filter(a => a.status === 'SIGNED').length;

        // Taux de conversion = RDV signés / RDV pris (en %)
        const conversionRate = weeklyAppointmentsCount > 0
            ? ((weeklySignedCount / weeklyAppointmentsCount) * 100).toFixed(1)
            : '0.0';

        // 6. Nouveaux contacts
        const newContacts = await prisma.contact.count({
            where: {
                createdAt: {
                    gte: start,
                    lte: end
                }
            }
        });

        // 7. Totaux globaux
        const appointmentsTotalAllTime = await prisma.appointment.count({
            where: { ...whereCommercial, ...whereAgent }
        });

        const callsCount = calls.length;
        const appointmentsCount = appointments.length;

        // 8. Générer les données du graphique
        const diffHours = differenceInHours(end, start);
        let graphData = [];

        if (diffHours <= 24) {
            // Group by Hour
            const hours = eachHourOfInterval({ start, end });
            graphData = hours.map(hour => {
                const hourLabel = format(hour, 'HH:mm');
                const nextHour = new Date(hour);
                nextHour.setHours(hour.getHours() + 1);

                const callsInHour = calls.filter(c => c.calledAt >= hour && c.calledAt < nextHour).length;
                const rdvInHour = appointments.filter(a => a.createdAt >= hour && a.createdAt < nextHour).length;

                return {
                    name: hourLabel,
                    appels: callsInHour,
                    rdv: rdvInHour
                };
            });
        } else {
            // Group by Day
            const days = eachDayOfInterval({ start, end });
            graphData = days.map(day => {
                const dayLabel = format(day, 'EEE dd', { locale: fr });
                const nextDay = new Date(day);
                nextDay.setDate(day.getDate() + 1);

                const callsInDay = calls.filter(c => c.calledAt >= day && c.calledAt < nextDay).length;
                const rdvInDay = appointments.filter(a => a.createdAt >= day && a.createdAt < nextDay).length;

                return {
                    name: dayLabel.toUpperCase(),
                    appels: callsInDay,
                    rdv: rdvInDay
                };
            });
        }

        res.json({
            callsToday: callsCount,
            appointmentsTotal: appointmentsTotalAllTime,
            appointmentsToday: appointmentsCount,
            newContactsToday: newContacts,
            conversionRate,
            // Nouvelles données pour le taux de conversion détaillé
            conversionDetails: {
                weeklyAppointments: weeklyAppointmentsCount,
                weeklySigned: weeklySignedCount,
                weekStart: weekStart.toISOString(),
                weekEnd: weekEnd.toISOString()
            },
            // Aussi pour la période sélectionnée
            periodSignedAppointments: signedAppointments,
            graphData
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ message: 'Error fetching stats' });
    }
};
