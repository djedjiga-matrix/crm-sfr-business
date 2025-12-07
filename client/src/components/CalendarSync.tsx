import { useState, useEffect } from 'react';
import { Calendar, Check, RefreshCw, Link2, Unlink } from 'lucide-react';
import api from '../services/api';
import { useToast } from './Toast';

interface CalendarSyncProps {
    className?: string;
}

const CalendarSync = ({ className = '' }: CalendarSyncProps) => {
    const [googleConnected, setGoogleConnected] = useState(false);
    const [outlookConnected] = useState(false); // Prévu pour le futur
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const { success, error } = useToast();

    useEffect(() => {
        checkStatus();

        // Vérifier si on revient d'une connexion OAuth
        const params = new URLSearchParams(window.location.search);
        if (params.get('google_connected') === 'true') {
            setGoogleConnected(true);
            success('Google Calendar connecté !');
            // Nettoyer l'URL
            window.history.replaceState({}, '', window.location.pathname);
        }
        if (params.get('google_error') === 'true') {
            error('Erreur de connexion Google Calendar');
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    const checkStatus = async () => {
        try {
            const response = await api.get('/calendar/status');
            setGoogleConnected(response.data.connected);
        } catch (err) {
            console.error('Error checking calendar status:', err);
        } finally {
            setLoading(false);
        }
    };

    const connectGoogle = async () => {
        try {
            const response = await api.get('/calendar/connect');
            // Rediriger vers la page d'autorisation Google
            window.location.href = response.data.authUrl;
        } catch (err) {
            error('Erreur lors de la connexion');
        }
    };

    const disconnectGoogle = async () => {
        try {
            await api.post('/calendar/disconnect');
            setGoogleConnected(false);
            success('Google Calendar déconnecté');
        } catch (err) {
            error('Erreur lors de la déconnexion');
        }
    };

    const syncAll = async () => {
        setSyncing(true);
        try {
            // Sync logic here
            await new Promise(resolve => setTimeout(resolve, 2000)); // Simulated
            success('Synchronisation terminée !');
        } catch (err) {
            error('Erreur de synchronisation');
        } finally {
            setSyncing(false);
        }
    };

    if (loading) {
        return (
            <div className={`animate-pulse bg-gray-100 dark:bg-white/5 rounded-xl p-6 ${className}`}>
                <div className="h-6 w-32 bg-gray-200 dark:bg-white/10 rounded mb-4" />
                <div className="h-10 bg-gray-200 dark:bg-white/10 rounded" />
            </div>
        );
    }

    return (
        <div className={`bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 rounded-xl p-6 ${className}`}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-lg text-red-600 dark:text-red-500">
                        <Calendar size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Synchronisation Calendrier</h3>
                        <p className="text-xs text-gray-500">Connectez vos calendriers externes</p>
                    </div>
                </div>
                {(googleConnected || outlookConnected) && (
                    <button
                        onClick={syncAll}
                        disabled={syncing}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-sm transition-colors"
                    >
                        <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                        {syncing ? 'Sync...' : 'Tout synchroniser'}
                    </button>
                )}
            </div>

            <div className="space-y-4">
                {/* Google Calendar */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                        <img
                            src="https://www.gstatic.com/images/branding/product/1x/calendar_2020q4_48dp.png"
                            alt="Google Calendar"
                            className="w-8 h-8"
                        />
                        <div>
                            <div className="font-medium text-gray-900 dark:text-white">Google Calendar</div>
                            <div className="text-xs text-gray-500">
                                {googleConnected ? 'Connecté' : 'Non connecté'}
                            </div>
                        </div>
                    </div>
                    {googleConnected ? (
                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                <Check size={14} />
                                Actif
                            </span>
                            <button
                                onClick={disconnectGoogle}
                                className="p-2 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-colors group"
                                title="Déconnecter"
                            >
                                <Unlink size={16} className="text-gray-400 group-hover:text-red-500" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={connectGoogle}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <Link2 size={14} />
                            Connecter
                        </button>
                    )}
                </div>

                {/* Microsoft Outlook */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-lg opacity-60">
                    <div className="flex items-center gap-3">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                            <path d="M7 3H21V21H7V3Z" fill="#0364B8" />
                            <path d="M7 3L3 7V17L7 21V3Z" fill="#0078D4" />
                            <path d="M14 8C11.79 8 10 9.79 10 12C10 14.21 11.79 16 14 16C16.21 16 18 14.21 18 12C18 9.79 16.21 8 14 8Z" fill="white" />
                        </svg>
                        <div>
                            <div className="font-medium text-gray-900 dark:text-white">Microsoft Outlook</div>
                            <div className="text-xs text-gray-500">Bientôt disponible</div>
                        </div>
                    </div>
                    <span className="px-2 py-1 bg-gray-200 dark:bg-white/10 rounded text-xs text-gray-500">
                        Prochainement
                    </span>
                </div>
            </div>

            {/* Info */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-100 dark:border-blue-500/20">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                    <strong>💡 Astuce :</strong> Les RDV créés seront automatiquement ajoutés à votre calendrier connecté.
                </p>
            </div>
        </div>
    );
};

export default CalendarSync;
