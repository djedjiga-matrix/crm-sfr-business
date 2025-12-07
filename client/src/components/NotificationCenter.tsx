import { useEffect, useState } from 'react';
import api from '../services/api';
import { Bell, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Contact {
    id: string;
    companyName: string;
    nextCallDate: string;
}

const NotificationCenter = () => {
    const [notifications, setNotifications] = useState<Contact[]>([]);
    const navigate = useNavigate();

    const checkUpcomingCalls = async () => {
        try {
            // Utiliser l'endpoint dédié aux notifications qui filtre par statut CALLBACK_LATER et FOLLOW_UP
            const response = await api.get('/contacts/notifications');

            const upcomingContacts = response.data;
            if (upcomingContacts && upcomingContacts.length > 0) {
                // Filter out notifications we've already shown/dismissed in this session
                const dismissedIds = JSON.parse(sessionStorage.getItem('dismissedNotifications') || '[]');
                const newNotifications = upcomingContacts.filter((c: Contact) => !dismissedIds.includes(c.id));

                if (newNotifications.length > 0) {
                    setNotifications(newNotifications);
                    // Play sound only if there are actual new notifications
                    const audio = new Audio('/notification.mp3');
                    audio.play().catch(() => { });
                } else {
                    setNotifications([]);
                }
            } else {
                setNotifications([]);
            }
        } catch (error) {
            console.error('Error checking notifications:', error);
        }
    };

    const handleDismiss = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        const dismissedIds = JSON.parse(sessionStorage.getItem('dismissedNotifications') || '[]');
        if (!dismissedIds.includes(id)) {
            dismissedIds.push(id);
            sessionStorage.setItem('dismissedNotifications', JSON.stringify(dismissedIds));
        }
    };

    useEffect(() => {
        // Check immediately
        checkUpcomingCalls();

        // Then check every minute
        const interval = setInterval(checkUpcomingCalls, 60000);
        return () => clearInterval(interval);
    }, []);

    if (notifications.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3">
            {notifications.map(contact => (
                <div key={contact.id} className="glass-card w-80 p-4 rounded-xl border-l-4 border-l-red-500 shadow-[0_0_20px_rgba(0,0,0,0.5)] animate-slide-in relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => handleDismiss(contact.id)}
                            className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-red-500/10 rounded-lg text-red-500 animate-pulse">
                            <Bell size={18} />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1">Rappel Appel</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                Appeler <strong className="text-gray-900 dark:text-white">{contact.companyName}</strong> à <span className="font-mono text-red-600 dark:text-red-400">{new Date(contact.nextCallDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </p>
                            <button
                                onClick={() => {
                                    navigate(`/contacts/${contact.id}`);
                                    handleDismiss(contact.id);
                                }}
                                className="flex items-center gap-1 text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-widest transition-colors"
                            >
                                Voir Contact <ArrowRight size={10} />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default NotificationCenter;
