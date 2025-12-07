import { io, Socket } from 'socket.io-client';

class SocketService {
    private socket: Socket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    connect() {
        if (this.socket?.connected) return;

        // Récupérer le token d'authentification
        const token = localStorage.getItem('token');

        if (!token) {
            console.warn('[Socket] Cannot connect without authentication token');
            return;
        }

        const url = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3000`;

        // Créer la connexion avec authentification
        this.socket = io(url, {
            auth: {
                token: token
            },
            // Options de reconnexion
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            // Timeout
            timeout: 20000,
        });

        this.socket.on('connect', () => {
            console.log('[Socket] ✅ Connected to WebSocket');
            this.reconnectAttempts = 0;
        });

        this.socket.on('disconnect', (reason) => {
            console.log(`[Socket] Disconnected: ${reason}`);

            // Si déconnecté par le serveur (token invalide, etc.)
            if (reason === 'io server disconnect') {
                console.warn('[Socket] Server disconnected us - may need to re-authenticate');
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error('[Socket] Connection error:', error.message);
            this.reconnectAttempts++;

            // Si l'erreur est liée à l'authentification, ne pas réessayer indéfiniment
            if (error.message.includes('Authentication') || error.message.includes('token')) {
                console.error('[Socket] Authentication failed - stopping reconnection');
                this.socket?.disconnect();

                // Optionnel: Rediriger vers la page de login
                // window.location.href = '/login';
            }

            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('[Socket] Max reconnection attempts reached');
            }
        });

        // Écouter les mises à jour de statut utilisateur
        this.socket.on('user_status_update', (data: { userId: string; status: string }) => {
            // Événement global pour les composants qui en ont besoin
            window.dispatchEvent(new CustomEvent('user-status-update', { detail: data }));
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    // Reconnecter avec un nouveau token (après refresh token par exemple)
    reconnectWithNewToken() {
        this.disconnect();
        this.reconnectAttempts = 0;
        this.connect();
    }

    getSocket(): Socket | null {
        return this.socket;
    }

    isConnected(): boolean {
        return this.socket?.connected ?? false;
    }

    emit(event: string, data: any) {
        if (!this.socket?.connected) {
            console.warn(`[Socket] Cannot emit '${event}' - not connected`);
            return;
        }
        this.socket.emit(event, data);
    }

    on(event: string, callback: (data: any) => void) {
        this.socket?.on(event, callback);
    }

    off(event: string, callback?: (data: any) => void) {
        if (callback) {
            this.socket?.off(event, callback);
        } else {
            this.socket?.off(event);
        }
    }

    // Méthode pour envoyer un heartbeat
    sendHeartbeat(userId: string) {
        this.emit('heartbeat', { userId });
    }

    // Méthodes helper pour les événements communs
    emitUserLogin(userId: string) {
        this.emit('user_login', { userId });
    }

    emitUserLogout(userId: string) {
        this.emit('user_logout', { userId });
    }

    emitStatusChange(userId: string, status: string) {
        this.emit('user_status_change', { userId, status });
    }

    joinMonitoring() {
        this.emit('join_monitoring', {});
    }

    joinChat(groupId: string) {
        this.emit('join_chat', groupId);
    }

    leaveChat(groupId: string) {
        this.emit('leave_chat', groupId);
    }
}

// Singleton instance
export const socketService = new SocketService();
