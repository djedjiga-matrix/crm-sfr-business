import React, { createContext, useState, useContext, useEffect } from 'react';
import { socketService } from '../services/socket';

import api from '../services/api';

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const storedToken = localStorage.getItem('token');
            if (storedToken) {
                try {
                    // Configurer le header pour cette requête spécifique si nécessaire, 
                    // mais api.ts le fait déjà via l'intercepteur si le token est dans localStorage
                    const response = await api.get('/auth/me');
                    setUser(response.data);
                    setToken(storedToken);

                    // Connecter le socket après authentification réussie
                    socketService.connect();
                } catch (error) {
                    console.error("Session expired or invalid", error);
                    logout();
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    // Envoyer un heartbeat toutes les 30 secondes pour maintenir la session active
    useEffect(() => {
        if (!user) return;

        // Envoyer un heartbeat immédiatement après connexion
        socketService.sendHeartbeat(user.id);

        const heartbeatInterval = setInterval(() => {
            if (socketService.isConnected()) {
                socketService.sendHeartbeat(user.id);
                console.log('[Heartbeat] Sent for user', user.id);
            } else {
                // Tenter de reconnecter si déconnecté
                socketService.connect();
            }
        }, 30000); // Toutes les 30 secondes

        return () => {
            clearInterval(heartbeatInterval);
        };
    }, [user]);

    const login = (newToken: string, newUser: User) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
    };

    const logout = () => {
        if (user) {
            socketService.emit('user_logout', { userId: user.id });
        }

        // Give a small delay for the socket event to be sent before clearing session
        setTimeout(() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
        }, 100);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
