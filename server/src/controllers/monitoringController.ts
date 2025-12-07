import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getMonitoringState = async (req: Request, res: Response) => {
    try {
        const now = new Date();
        const recentThreshold = new Date(now.getTime() - 60 * 1000); // 60 secondes

        // Get all users with their latest session and activity
        const users = await prisma.user.findMany({
            where: { status: 'ACTIVE' },
            include: {
                sessions: {
                    where: {
                        OR: [
                            { logoutTime: null }, // Sessions actives
                            { lastActivity: { gte: recentThreshold } } // OU activité récente
                        ]
                    },
                    orderBy: { loginTime: 'desc' },
                    take: 1
                },
                pauses: {
                    where: { endTime: null },
                    orderBy: { startTime: 'desc' },
                    take: 1
                },
                dailyStats: {
                    where: {
                        date: {
                            gte: new Date(new Date().setHours(0, 0, 0, 0))
                        }
                    }
                },
                campaigns: true,
                zones: true
            }
        });

        const monitoringData = users.map(user => {
            const activeSession = user.sessions[0];
            const activePause = user.pauses[0];
            const stats = user.dailyStats[0];

            let status = 'DISCONNECTED';
            if (activeSession) {
                // Vérifier si la session est vraiment active (lastActivity récente)
                const lastActivityTime = activeSession.lastActivity ? new Date(activeSession.lastActivity).getTime() : 0;
                const isRecentlyActive = (now.getTime() - lastActivityTime) < 60000; // 60 secondes

                if (activeSession.logoutTime === null && isRecentlyActive) {
                    status = activeSession.status;
                    // Override status if paused
                    if (activePause) {
                        status = 'PAUSED';
                    }
                } else if (isRecentlyActive) {
                    status = 'CONNECTED_INACTIVE'; // Récemment actif mais pas de session ouverte
                }
            }

            return {
                id: user.id,
                name: user.name,
                role: user.role,
                status: status,
                campaign: user.campaigns[0]?.name || 'Aucune',
                zone: user.zones[0]?.departmentCode || '',
                loginTime: activeSession?.loginTime,
                lastActivity: activeSession?.lastActivity,
                pauseType: activePause?.type,
                pauseStartTime: activePause?.startTime,
                stats: {
                    contacts: stats?.contactsTreated || 0,
                    appointments: stats?.appointmentsTaken || 0,
                    calls: stats?.callsMade || 0,
                    workTime: stats?.workTime || 0
                }
            };
        });

        res.json(monitoringData);
    } catch (error) {
        console.error('Error fetching monitoring state:', error);
        res.status(500).json({ message: 'Error fetching monitoring state' });
    }
};

export const getUserHistory = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const history = await prisma.userActivity.findMany({
            where: { userId },
            orderBy: { timestamp: 'desc' },
            take: 50
        });
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user history' });
    }
};
