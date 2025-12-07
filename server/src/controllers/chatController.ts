import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/authMiddleware';

// --- Groups ---

export const getGroups = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const groups = await prisma.chatGroup.findMany({
            where: {
                OR: [
                    { privacy: 'PUBLIC' },
                    { members: { some: { userId } } }
                ],
                archived: false
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, role: true }
                        }
                    }
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const groupsWithUnread = await Promise.all(groups.map(async (g) => {
            const unreadCount = await prisma.chatMessage.count({
                where: {
                    groupId: g.id,
                    senderId: { not: userId },
                    reads: {
                        none: { userId }
                    }
                }
            });
            return { ...g, unreadCount };
        }));

        res.json(groupsWithUnread);
    } catch (error) {
        console.error('Error fetching groups:', error);
        res.status(500).json({ message: 'Error fetching groups' });
    }
};

export const markGroupAsRead = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { groupId } = req.params;

        // Find all unread messages in this group
        const unreadMessages = await prisma.chatMessage.findMany({
            where: {
                groupId,
                senderId: { not: userId },
                reads: { none: { userId } }
            },
            select: { id: true }
        });

        if (unreadMessages.length > 0) {
            await prisma.chatMessageRead.createMany({
                data: unreadMessages.map(m => ({
                    messageId: m.id,
                    userId
                })),
                skipDuplicates: true
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking group as read:', error);
        res.status(500).json({ message: 'Error marking group as read' });
    }
};

export const createGroup = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { name, type, description, privacy, members } = req.body;

        const group = await prisma.chatGroup.create({
            data: {
                name,
                type,
                description,
                privacy,
                createdBy: userId,
                members: {
                    create: [
                        { userId, role: 'ADMIN' },
                        ...(members || [])
                            .filter((mId: string) => mId !== userId)
                            .map((mId: string) => ({ userId: mId, role: 'MEMBER' }))
                    ]
                }
            },
            include: {
                members: true
            }
        });

        res.status(201).json(group);
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ message: 'Error creating group' });
    }
};

export const getGroupDetails = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const group = await prisma.chatGroup.findUnique({
            where: { id },
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, role: true }
                        }
                    }
                }
            }
        });

        if (!group) return res.status(404).json({ message: 'Group not found' });
        res.json(group);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching group details' });
    }
};

// --- Messages ---

export const getMessages = async (req: AuthRequest, res: Response) => {
    try {
        const { groupId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;

        const messages = await prisma.chatMessage.findMany({
            where: { groupId },
            include: {
                sender: {
                    select: { id: true, name: true, role: true }
                },
                attachments: true,
                reactions: {
                    include: {
                        user: { select: { id: true, name: true } }
                    }
                },
                parentMessage: {
                    include: {
                        sender: { select: { name: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip
        });

        res.json(messages.reverse()); // Return oldest first for chat view
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Error fetching messages' });
    }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { groupId } = req.params;
        const { content, type, parentMessageId, urgent } = req.body;

        const message = await prisma.chatMessage.create({
            data: {
                groupId,
                senderId: userId,
                content,
                type,
                parentMessageId,
                urgent
            },
            include: {
                sender: {
                    select: { id: true, name: true, role: true }
                },
                attachments: true,
                reactions: true,
                parentMessage: true
            }
        });

        // Socket.io emission will be handled here or in the route handler via req.app.get('io')
        const io = req.app.get('io');
        if (io) {
            io.to(groupId).emit('message_received', message);
        }

        res.status(201).json(message);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Error sending message' });
    }
};

export const addReaction = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { messageId } = req.params;
        const { emoji } = req.body;

        // Check if reaction already exists
        const existing = await prisma.chatReaction.findUnique({
            where: {
                messageId_userId_emoji: {
                    messageId,
                    userId,
                    emoji
                }
            }
        });

        if (existing) {
            await prisma.chatReaction.delete({
                where: { id: existing.id }
            });
            res.json({ action: 'removed' });
        } else {
            const reaction = await prisma.chatReaction.create({
                data: {
                    messageId,
                    userId,
                    emoji
                },
                include: {
                    user: { select: { id: true, name: true } }
                }
            });

            // Get message to find group ID for socket
            const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
            const io = req.app.get('io');
            if (io && message) {
                io.to(message.groupId).emit('reaction_added', { messageId, reaction });
            }

            res.json(reaction);
        }
    } catch (error) {
        res.status(500).json({ message: 'Error adding reaction' });
    }
};

// --- Admin ---

export const getChatHistory = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });

        const { startDate, endDate, groupId, userId, query } = req.query;

        const whereClause: any = {};

        if (startDate && endDate) {
            whereClause.createdAt = {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string)
            };
        }

        if (groupId) whereClause.groupId = groupId;
        if (userId) whereClause.senderId = userId;
        if (query) whereClause.content = { contains: query as string, mode: 'insensitive' };

        const messages = await prisma.chatMessage.findMany({
            where: whereClause,
            include: {
                group: { select: { name: true } },
                sender: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 100 // Limit for performance
        });

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching history' });
    }
};
