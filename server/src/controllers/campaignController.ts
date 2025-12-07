
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

export const createCampaign = async (req: Request, res: Response) => {
    try {
        const { name, description, status, userIds } = req.body;

        const data: any = {
            name,
            description,
            status: status || 'ACTIVE'
        };

        if (userIds && Array.isArray(userIds)) {
            data.users = {
                connect: userIds.map((userId: string) => ({ id: userId }))
            };
        }

        const campaign = await prisma.campaign.create({
            data
        });

        res.status(201).json(campaign);
    } catch (error) {
        console.error('Error creating campaign:', error);
        res.status(500).json({ error: 'Error creating campaign' });
    }
};

export const getCampaigns = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        const where: any = {};

        if (user && user.role !== 'ADMIN' && user.role !== 'SUPERVISEUR') {
            // Filter by assignments for Agents and Commercials
            // We check both the legacy 'users' relation and the new 'assignments' relation
            where.OR = [
                {
                    users: {
                        some: {
                            id: user.userId
                        }
                    }
                },
                {
                    assignments: {
                        some: {
                            userId: user.userId,
                            active: true
                        }
                    }
                }
            ];
        }

        const campaigns = await prisma.campaign.findMany({
            where,
            include: {
                _count: {
                    select: {
                        contacts: true,
                        users: true
                    }
                },
                users: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(campaigns);
    } catch (error) {
        console.error('Error fetching campaigns:', error);
        res.status(500).json({ error: 'Error fetching campaigns' });
    }
};

export const updateCampaign = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, status, userIds } = req.body;

        const data: any = { name, description, status };

        // If userIds is provided, update the relation
        if (userIds) {
            data.users = {
                set: userIds.map((userId: string) => ({ id: userId }))
            };
        }

        const campaign = await prisma.campaign.update({
            where: { id },
            data,
            include: {
                users: {
                    select: { id: true, name: true }
                }
            }
        });

        res.json(campaign);
    } catch (error) {
        console.error('Error updating campaign:', error);
        res.status(500).json({ error: 'Error updating campaign' });
    }
};

export const deleteCampaign = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.campaign.delete({ where: { id } });
        res.json({ message: 'Campaign deleted' });
    } catch (error) {
        console.error('Error deleting campaign:', error);
        res.status(500).json({ error: 'Error deleting campaign' });
    }
};
