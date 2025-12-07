import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import { sendInvitationEmail } from '../services/emailService';

// Obtenir tous les utilisateurs
export const getUsers = async (req: AuthRequest, res: Response) => {
    try {
        const userRole = req.user?.role;
        const where: any = {};

        // Si c'est un agent, il ne doit voir que les commerciaux (pour la prise de RDV)
        if (userRole === 'AGENT') {
            where.role = 'COMMERCIAL';
        }
        // Si c'est un superviseur, il voit son équipe (implémentation simplifiée: voit tout le monde pour l'instant ou filtrer par équipe)
        // Pour l'instant, on laisse le superviseur voir tout le monde comme l'admin, ou on filtrera plus tard.

        const users = await prisma.user.findMany({
            where,
            include: {
                zones: true,
                assignments: {
                    include: {
                        campaign: true,
                        database: true
                    }
                },
                supervisedTeams: {
                    include: {
                        member: true
                    }
                },
                memberOfTeams: {
                    include: {
                        supervisor: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Map to safe user object
        const safeUsers = users.map(user => ({
            id: user.id,
            email: user.email,
            username: user.username,
            name: user.name,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            role: user.role,
            status: user.status,
            createdAt: user.createdAt,
            quotaDaily: user.quotaDaily,
            assignmentMode: user.assignmentMode,
            zones: user.zones,
            assignments: user.assignments,
            supervisedTeams: user.supervisedTeams,
            memberOfTeams: user.memberOfTeams
        }));

        res.json(safeUsers);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Créer un utilisateur
export const createUser = async (req: AuthRequest, res: Response) => {
    try {
        const {
            email, password, username, firstName, lastName, phone,
            role, status,
            forcePasswordChange,
            quotaDaily, assignmentMode,
            zones, // Array of department codes
            assignments, // Array of { campaignId, databaseId }
            supervisedUserIds // Array of userIds to supervise
        } = req.body;

        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { username: username || undefined }
                ]
            }
        });

        if (existingUser) {
            return res.status(400).json({ message: 'User with this email or username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const fullName = `${firstName} ${lastName}`.trim();

        const result = await prisma.$transaction(async (prisma) => {
            // 1. Create User
            const user = await prisma.user.create({
                data: {
                    email,
                    username,
                    password: hashedPassword,
                    name: fullName,
                    firstName,
                    lastName,
                    phone,
                    role: role || 'AGENT',
                    status: status || 'ACTIVE',
                    forcePasswordChange: forcePasswordChange ?? true,
                    quotaDaily: quotaDaily ? parseInt(quotaDaily) : null,
                    assignmentMode,
                },
            });

            // 2. Create Zones (for Commercials)
            if (zones && zones.length > 0) {
                await prisma.commercialZone.createMany({
                    data: zones.map((code: string) => ({
                        userId: user.id,
                        departmentCode: code
                    }))
                });
            }

            // 3. Create Assignments (Campaigns/Databases)
            if (assignments && assignments.length > 0) {
                await prisma.userAssignment.createMany({
                    data: assignments.map((a: any) => ({
                        userId: user.id,
                        campaignId: a.campaignId,
                        databaseId: a.databaseId || null,
                        active: true
                    }))
                });

                // Also link legacy relations for compatibility
                const campaignIds = assignments.map((a: any) => a.campaignId);
                const databaseIds = assignments.map((a: any) => a.databaseId).filter(Boolean);

                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        campaigns: { connect: campaignIds.map((id: string) => ({ id })) },
                        assignedDatabases: { connect: databaseIds.map((id: string) => ({ id })) }
                    }
                });
            }

            // 4. Create Supervision Links
            if (supervisedUserIds && supervisedUserIds.length > 0) {
                await prisma.teamMember.createMany({
                    data: supervisedUserIds.map((memberId: string) => ({
                        supervisorId: user.id,
                        memberId
                    }))
                });
            }

            return user;
        });

        // Send email after transaction success
        const loginLink = process.env.CLIENT_URL || 'http://localhost:5173/login';
        // Note: We don't have the plain password here to send, but the template says "communicated by admin".
        // If we wanted to send a generated password, we would have needed to generate it before hashing.
        // For now, we follow the template.
        sendInvitationEmail(result.email, result.username || result.email, result.role, loginLink).catch(console.error);

        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Mettre à jour un utilisateur
export const updateUser = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const {
            email, username, firstName, lastName, phone,
            role, status, password,
            forcePasswordChange,
            quotaDaily, assignmentMode,
            zones,
            assignments,
            supervisedUserIds
        } = req.body;

        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const data: any = {
            email, username, firstName, lastName, phone,
            role, status,
            quotaDaily: quotaDaily ? parseInt(quotaDaily) : null,
            assignmentMode
        };

        if (firstName || lastName) {
            data.name = `${firstName || user.firstName} ${lastName || user.lastName}`.trim();
        }

        if (password) {
            data.password = await bcrypt.hash(password, 10);
        }

        if (forcePasswordChange !== undefined) {
            data.forcePasswordChange = forcePasswordChange;
        }

        await prisma.$transaction(async (prisma) => {
            // 1. Update User Basic Info
            await prisma.user.update({
                where: { id },
                data
            });

            // 2. Update Zones
            if (zones) {
                await prisma.commercialZone.deleteMany({ where: { userId: id } });
                if (zones.length > 0) {
                    await prisma.commercialZone.createMany({
                        data: zones.map((code: string) => ({
                            userId: id,
                            departmentCode: code
                        }))
                    });
                }
            }

            // 3. Update Assignments
            if (assignments) {
                await prisma.userAssignment.deleteMany({ where: { userId: id } });
                if (assignments.length > 0) {
                    await prisma.userAssignment.createMany({
                        data: assignments.map((a: any) => ({
                            userId: id,
                            campaignId: a.campaignId,
                            databaseId: a.databaseId || null,
                            active: true
                        }))
                    });

                    // Sync legacy relations
                    const campaignIds = assignments.map((a: any) => a.campaignId);
                    const databaseIds = assignments.map((a: any) => a.databaseId).filter(Boolean);

                    // Reset legacy
                    await prisma.user.update({
                        where: { id },
                        data: {
                            campaigns: { set: [] },
                            assignedDatabases: { set: [] }
                        }
                    });

                    // Connect new
                    await prisma.user.update({
                        where: { id },
                        data: {
                            campaigns: { connect: campaignIds.map((cid: string) => ({ id: cid })) },
                            assignedDatabases: { connect: databaseIds.map((did: string) => ({ id: did })) }
                        }
                    });
                }
            }

            // 4. Update Supervision
            if (supervisedUserIds) {
                await prisma.teamMember.deleteMany({ where: { supervisorId: id } });
                if (supervisedUserIds.length > 0) {
                    await prisma.teamMember.createMany({
                        data: supervisedUserIds.map((memberId: string) => ({
                            supervisorId: id,
                            memberId
                        }))
                    });
                }
            }
        });

        const updatedUser = await prisma.user.findUnique({
            where: { id },
            include: {
                zones: true,
                assignments: { include: { campaign: true, database: true } },
                supervisedTeams: true
            }
        });

        res.json(updatedUser);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Supprimer un utilisateur
export const deleteUser = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.user.delete({ where: { id } });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
