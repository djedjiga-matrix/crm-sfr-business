import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import prisma from './prisma';
import { verifyToken } from './utils/jwt';

// Interface pour les sockets authentifiés
interface AuthenticatedSocket extends Socket {
    userId?: string;
    userRole?: string;
}

// Middleware d'authentification pour Socket.IO
const socketAuthMiddleware = (socket: AuthenticatedSocket, next: (err?: ExtendedError) => void) => {
    try {
        // Récupérer le token depuis les options de connexion
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;

        if (!token) {
            console.log(`[SOCKET AUTH] ❌ Connection rejected - No token provided (${socket.id})`);
            return next(new Error('Authentication required'));
        }

        // Vérifier le token JWT
        const decoded = verifyToken(token as string);

        if (!decoded || !decoded.userId) {
            console.log(`[SOCKET AUTH] ❌ Connection rejected - Invalid token (${socket.id})`);
            return next(new Error('Invalid token'));
        }

        // Attacher les infos utilisateur au socket
        socket.userId = decoded.userId;
        socket.userRole = decoded.role;

        console.log(`[SOCKET AUTH] ✅ Authenticated: ${decoded.userId} (${decoded.role}) - ${socket.id}`);
        next();

    } catch (error: any) {
        console.log(`[SOCKET AUTH] ❌ Token verification failed: ${error.message} (${socket.id})`);
        return next(new Error('Authentication failed'));
    }
};

export const initSocket = (httpServer: HttpServer) => {
    // Configuration CORS
    const corsOrigin = process.env.NODE_ENV === 'production'
        ? process.env.CLIENT_URL || 'https://crm.votre-domaine.com'
        : true;

    const io = new Server(httpServer, {
        cors: {
            origin: corsOrigin,
            methods: ["GET", "POST"],
            credentials: true
        },
        // Ping timeout pour détecter les déconnexions
        pingTimeout: 30000,
        pingInterval: 25000
    });

    // Appliquer le middleware d'authentification
    io.use(socketAuthMiddleware);

    // Cleanup inactive sessions every 30 seconds (augmenté pour réduire la charge)
    setInterval(async () => {
        try {
            const timeoutThreshold = new Date(Date.now() - 60000); // 60 seconds timeout

            const timedOutSessions = await prisma.userSession.findMany({
                where: {
                    status: { not: 'DISCONNECTED' },
                    lastActivity: { lt: timeoutThreshold }
                }
            });

            for (const session of timedOutSessions) {
                await prisma.userSession.update({
                    where: { id: session.id },
                    data: { status: 'DISCONNECTED', logoutTime: new Date() }
                });

                io.emit('user_status_update', {
                    userId: session.userId,
                    status: 'DISCONNECTED'
                });
                console.log(`[SOCKET] Session timed out for user ${session.userId}`);
            }
        } catch (error) {
            console.error('[SOCKET] Error in session cleanup:', error);
        }
    }, 30000);

    io.on('connection', async (socket: AuthenticatedSocket) => {
        console.log(`[SOCKET] Client connected: ${socket.id} (User: ${socket.userId})`);

        // Joindre automatiquement la room de l'utilisateur
        if (socket.userId) {
            socket.join(socket.userId);

            // Créer ou mettre à jour la session automatiquement à la connexion
            try {
                // Vérifier s'il existe déjà une session active
                const existingSession = await prisma.userSession.findFirst({
                    where: { userId: socket.userId, logoutTime: null }
                });

                if (existingSession) {
                    // Mettre à jour la session existante
                    await prisma.userSession.update({
                        where: { id: existingSession.id },
                        data: {
                            lastActivity: new Date(),
                            status: 'CONNECTED_ACTIVE'
                        }
                    });
                    console.log(`[SOCKET] Session updated for user ${socket.userId}`);
                } else {
                    // Créer une nouvelle session
                    await prisma.userSession.create({
                        data: {
                            userId: socket.userId,
                            status: 'CONNECTED_ACTIVE',
                            ipAddress: socket.handshake.address,
                            lastActivity: new Date()
                        }
                    });
                    console.log(`[SOCKET] New session created for user ${socket.userId}`);
                }

                // Notifier les autres clients de la connexion
                io.emit('user_status_update', {
                    userId: socket.userId,
                    status: 'CONNECTED_ACTIVE'
                });
            } catch (error) {
                console.error('[SOCKET] Error creating session:', error);
            }
        }

        socket.on('join_monitoring', () => {
            // Seuls les admins et superviseurs peuvent rejoindre le monitoring
            if (socket.userRole === 'ADMIN' || socket.userRole === 'SUPERVISEUR') {
                socket.join('monitoring');
                console.log(`[SOCKET] ${socket.userId} joined monitoring room`);
            } else {
                console.log(`[SOCKET] ❌ ${socket.userId} unauthorized for monitoring`);
            }
        });

        socket.on('heartbeat', async (data: { userId: string }) => {
            // Vérifier que l'utilisateur ne peut envoyer des heartbeats que pour lui-même
            if (data.userId !== socket.userId) {
                console.log(`[SOCKET] ❌ Heartbeat rejected - userId mismatch`);
                return;
            }

            try {
                await prisma.userSession.updateMany({
                    where: { userId: data.userId, logoutTime: null },
                    data: { lastActivity: new Date() }
                });
            } catch (error) {
                // Silent fail for heartbeats
            }
        });

        socket.on('user_login', async (data: { userId: string }) => {
            // Vérifier que l'utilisateur s'enregistre lui-même
            if (data.userId !== socket.userId) {
                console.log(`[SOCKET] ❌ Login rejected - userId mismatch`);
                return;
            }

            try {
                // Close previous active sessions
                await prisma.userSession.updateMany({
                    where: { userId: data.userId, logoutTime: null },
                    data: { logoutTime: new Date(), status: 'DISCONNECTED' }
                });

                // Create new session
                await prisma.userSession.create({
                    data: {
                        userId: data.userId,
                        status: 'CONNECTED_ACTIVE',
                        ipAddress: socket.handshake.address
                    }
                });

                io.emit('user_status_update', { userId: data.userId, status: 'CONNECTED_ACTIVE' });
                console.log(`[SOCKET] User ${data.userId} logged in`);
            } catch (error) {
                console.error('[SOCKET] Error handling login:', error);
            }
        });

        socket.on('user_logout', async (data: { userId: string }) => {
            // Vérifier l'identité
            if (data.userId !== socket.userId) {
                console.log(`[SOCKET] ❌ Logout rejected - userId mismatch`);
                return;
            }

            try {
                await prisma.userSession.updateMany({
                    where: { userId: data.userId, logoutTime: null },
                    data: { status: 'DISCONNECTED', logoutTime: new Date() }
                });

                io.emit('user_status_update', { userId: data.userId, status: 'DISCONNECTED' });
                console.log(`[SOCKET] User ${data.userId} logged out`);
            } catch (error) {
                console.error('[SOCKET] Error handling logout:', error);
            }
        });

        socket.on('user_status_change', async (data: { userId: string, status: string }) => {
            // Vérifier l'identité ou autoriser les admins
            if (data.userId !== socket.userId && socket.userRole !== 'ADMIN') {
                console.log(`[SOCKET] ❌ Status change rejected - unauthorized`);
                return;
            }

            try {
                await prisma.userSession.updateMany({
                    where: { userId: data.userId, logoutTime: null },
                    data: { status: data.status, lastActivity: new Date() }
                });
                io.emit('user_status_update', data);
            } catch (error) {
                console.error('[SOCKET] Error updating status:', error);
            }
        });

        socket.on('start_pause', async (data: { userId: string, type: string, duration: number }) => {
            if (data.userId !== socket.userId) {
                console.log(`[SOCKET] ❌ Start pause rejected - userId mismatch`);
                return;
            }

            try {
                await prisma.userPause.create({
                    data: {
                        userId: data.userId,
                        type: data.type,
                        expectedDuration: data.duration
                    }
                });

                await prisma.userSession.updateMany({
                    where: { userId: data.userId, logoutTime: null },
                    data: { status: 'PAUSED', lastActivity: new Date() }
                });

                io.emit('user_status_update', { userId: data.userId, status: 'PAUSED', pauseType: data.type });
            } catch (error) {
                console.error('[SOCKET] Error starting pause:', error);
            }
        });

        socket.on('end_pause', async (data: { userId: string }) => {
            if (data.userId !== socket.userId) {
                console.log(`[SOCKET] ❌ End pause rejected - userId mismatch`);
                return;
            }

            try {
                // Find active pause and close it
                const activePause = await prisma.userPause.findFirst({
                    where: { userId: data.userId, endTime: null },
                    orderBy: { startTime: 'desc' }
                });

                if (activePause) {
                    await prisma.userPause.update({
                        where: { id: activePause.id },
                        data: {
                            endTime: new Date(),
                            duration: Math.floor((new Date().getTime() - activePause.startTime.getTime()) / 1000)
                        }
                    });
                }

                await prisma.userSession.updateMany({
                    where: { userId: data.userId, logoutTime: null },
                    data: { status: 'CONNECTED_ACTIVE', lastActivity: new Date() }
                });

                io.emit('user_status_update', { userId: data.userId, status: 'CONNECTED_ACTIVE' });
            } catch (error) {
                console.error('[SOCKET] Error ending pause:', error);
            }
        });

        socket.on('disconnect', async () => {
            console.log(`[SOCKET] Client disconnected: ${socket.id} (User: ${socket.userId})`);

            // Optionnel: Marquer la session comme déconnectée lors de la déconnexion socket
            // Désactivé par défaut car le heartbeat gère déjà cela
            // if (socket.userId) {
            //     await prisma.userSession.updateMany({
            //         where: { userId: socket.userId, logoutTime: null },
            //         data: { status: 'DISCONNECTED', logoutTime: new Date() }
            //     });
            // }
        });

        // --- Chat Events ---
        socket.on('join_user_room', (userId: string) => {
            // Un utilisateur ne peut rejoindre que sa propre room
            if (userId === socket.userId) {
                socket.join(userId);
            }
        });

        socket.on('join_chat', async (groupId: string) => {
            // Vérifier que l'utilisateur est membre du groupe
            if (!socket.userId) return;

            try {
                const membership = await prisma.chatGroupMember.findUnique({
                    where: {
                        groupId_userId: {
                            groupId: groupId,
                            userId: socket.userId
                        }
                    }
                });

                if (membership) {
                    socket.join(groupId);
                } else {
                    console.log(`[SOCKET] ❌ User ${socket.userId} not authorized to join chat ${groupId}`);
                }
            } catch (error) {
                console.error('[SOCKET] Error joining chat:', error);
            }
        });

        socket.on('leave_chat', (groupId: string) => {
            socket.leave(groupId);
        });

        socket.on('typing', (data: { groupId: string, userId: string, isTyping: boolean }) => {
            // Vérifier l'identité
            if (data.userId === socket.userId) {
                socket.to(data.groupId).emit('user_typing', data);
            }
        });
    });

    // Gestionnaire d'erreur de connexion
    io.engine.on('connection_error', (err: any) => {
        console.log(`[SOCKET] Connection error: ${err.code} - ${err.message}`);
    });

    return io;
};
