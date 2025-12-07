import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import api from '../services/api';

interface ChatContextType {
    socket: Socket | null;
    groups: any[];
    currentGroup: any | null;
    messages: any[];
    setCurrentGroup: (group: any) => void;
    sendMessage: (content: string, type?: string) => Promise<void>;
    fetchGroups: () => Promise<void>;
    joinGroup: (groupId: string) => void;
    leaveGroup: (groupId: string) => void;
    markAsRead: (groupId: string) => Promise<void>;
    isConnected: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
};

export const ChatProvider = ({ children }: { children: ReactNode }) => {
    const { user, token } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [groups, setGroups] = useState<any[]>([]);
    const [currentGroup, setCurrentGroup] = useState<any | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [notification, setNotification] = useState<{ id: string, sender: string, content: string } | null>(null);

    const currentGroupRef = React.useRef(currentGroup);

    useEffect(() => {
        currentGroupRef.current = currentGroup;
    }, [currentGroup]);

    const playNotificationSound = () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);

            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        } catch (error) {
            console.error('Error playing sound:', error);
        }
    };

    // Initialize Socket
    useEffect(() => {
        if (user && token) {
            const newSocket = io('http://localhost:3000', {
                auth: { token }
            });

            newSocket.on('connect', () => {
                setIsConnected(true);
                newSocket.emit('join_user_room', user.id);
            });

            newSocket.on('disconnect', () => {
                setIsConnected(false);
            });

            newSocket.on('message_received', (message: any) => {
                // Play sound and show toast if message is not from me
                if (message.senderId !== user.id) {
                    playNotificationSound();
                    setNotification({
                        id: message.id,
                        sender: message.sender?.name || 'Inconnu',
                        content: message.content
                    });

                    // Hide toast after 4 seconds
                    setTimeout(() => setNotification(null), 4000);
                }

                setMessages(prev => {
                    // Only add if it belongs to current group
                    if (currentGroupRef.current && message.groupId === currentGroupRef.current.id) {
                        // Check for duplicates
                        if (prev.some(m => m.id === message.id)) return prev;
                        return [...prev, message];
                    }
                    return prev;
                });

                // Also update last message in group list
                setGroups(prev => prev.map(g => {
                    if (g.id === message.groupId) {
                        const isCurrentGroup = currentGroupRef.current && currentGroupRef.current.id === g.id;
                        return {
                            ...g,
                            messages: [message],
                            unreadCount: isCurrentGroup ? 0 : (g.unreadCount || 0) + 1
                        };
                    }
                    return g;
                }));

                // If we are in the group, mark as read immediately
                if (currentGroupRef.current && message.groupId === currentGroupRef.current.id) {
                    markAsRead(message.groupId);
                }
            });

            setSocket(newSocket);

            return () => {
                newSocket.disconnect();
            };
        }
    }, [user, token]);



    const fetchGroups = async () => {
        try {
            const response = await api.get('/chat/groups');
            setGroups(response.data);
        } catch (error) {
            console.error('Error fetching groups:', error);
        }
    };

    const fetchMessages = async (groupId: string) => {
        try {
            const response = await api.get(`/chat/groups/${groupId}/messages`);
            setMessages(response.data);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    // Load groups on mount
    useEffect(() => {
        if (user) {
            fetchGroups();
        }
    }, [user]);

    // Load messages when current group changes
    useEffect(() => {
        if (currentGroup) {
            fetchMessages(currentGroup.id);
            if (socket) {
                socket.emit('join_chat', currentGroup.id);
            }
            // Mark as read when entering group
            markAsRead(currentGroup.id);
        }
        return () => {
            if (currentGroup && socket) {
                socket.emit('leave_chat', currentGroup.id);
            }
        };
    }, [currentGroup, socket]);

    const sendMessage = async (content: string, type: string = 'TEXT') => {
        if (!currentGroup) return;
        try {
            await api.post(`/chat/groups/${currentGroup.id}/messages`, {
                content,
                type
            });
            // Message will be added via socket event 'message_received'
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const joinGroup = (groupId: string) => {
        if (socket) socket.emit('join_chat', groupId);
    };

    const leaveGroup = (groupId: string) => {
        if (socket) socket.emit('leave_chat', groupId);
    };

    const markAsRead = async (groupId: string) => {
        try {
            await api.post(`/chat/groups/${groupId}/read`);
            // Update local state to reflect read status
            setGroups(prev => prev.map(g => {
                if (g.id === groupId) {
                    return { ...g, unreadCount: 0 };
                }
                return g;
            }));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    return (
        <ChatContext.Provider value={{
            socket,
            groups,
            currentGroup,
            messages,
            setCurrentGroup,
            sendMessage,
            fetchGroups,
            joinGroup,
            leaveGroup,
            markAsRead,
            isConnected
        }}>
            {children}
            {/* Global Toast Notification */}
            {notification && (
                <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-top-5 duration-300">
                    <div className="bg-white dark:bg-[#18181b] border-l-4 border-red-600 shadow-2xl rounded-lg p-4 w-80 flex items-start gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full text-red-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2-2z"></path></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{notification.sender}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{notification.content}</p>
                        </div>
                        <button
                            onClick={() => setNotification(null)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                </div>
            )}
        </ChatContext.Provider>
    );
};
