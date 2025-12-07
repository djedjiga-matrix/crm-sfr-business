import { useState } from 'react';
import { Bell, BellOff, AlertCircle } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useToast } from './Toast';

const NotificationSettings = () => {
    const { isSupported, isSubscribed, permission, requestPermission, subscribe, unsubscribe, showLocalNotification } = usePushNotifications();
    const { success, error } = useToast();
    const [loading, setLoading] = useState(false);

    // Préférences locales
    const [preferences, setPreferences] = useState({
        rdvReminders: true,
        newMessages: true,
        callbackAlerts: true,
        dailyReport: false
    });

    const handleEnableNotifications = async () => {
        setLoading(true);
        try {
            if (permission === 'default') {
                const granted = await requestPermission();
                if (!granted) {
                    error('Permission de notification refusée');
                    return;
                }
            }

            const subscription = await subscribe();
            if (subscription) {
                success('Notifications activées !');
            }
        } catch (err) {
            error('Erreur lors de l\'activation');
        } finally {
            setLoading(false);
        }
    };

    const handleDisableNotifications = async () => {
        setLoading(true);
        try {
            await unsubscribe();
            success('Notifications désactivées');
        } catch (err) {
            error('Erreur lors de la désactivation');
        } finally {
            setLoading(false);
        }
    };

    const handleTestNotification = () => {
        showLocalNotification('Test CRM SFR Business', {
            body: 'Les notifications fonctionnent correctement !',
            tag: 'test'
        });
    };

    const handlePreferenceChange = (key: keyof typeof preferences) => {
        setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (!isSupported) {
        return (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl">
                <div className="flex items-center gap-3">
                    <AlertCircle className="text-yellow-500" size={20} />
                    <div>
                        <p className="font-medium text-gray-900 dark:text-white">Notifications non supportées</p>
                        <p className="text-sm text-gray-500">Votre navigateur ne supporte pas les notifications push.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Statut des notifications push */}
            <div className={`p-4 rounded-xl border ${isSubscribed
                ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20'
                : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10'
                }`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {isSubscribed ? (
                            <div className="p-2 bg-green-500 rounded-lg text-white">
                                <Bell size={20} />
                            </div>
                        ) : (
                            <div className="p-2 bg-gray-400 rounded-lg text-white">
                                <BellOff size={20} />
                            </div>
                        )}
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                                Notifications Push
                            </p>
                            <p className="text-sm text-gray-500">
                                {isSubscribed
                                    ? 'Vous recevrez des alertes même quand l\'app est fermée'
                                    : 'Activez pour ne rien manquer'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={isSubscribed ? handleDisableNotifications : handleEnableNotifications}
                        disabled={loading || permission === 'denied'}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${isSubscribed
                            ? 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                            : 'bg-red-600 text-white hover:bg-red-700'
                            } disabled:opacity-50`}
                    >
                        {loading ? 'Chargement...' : isSubscribed ? 'Désactiver' : 'Activer'}
                    </button>
                </div>

                {permission === 'denied' && (
                    <p className="mt-3 text-sm text-red-500">
                        ⚠️ Les notifications sont bloquées dans votre navigateur.
                        Modifiez les permissions du site pour les activer.
                    </p>
                )}
            </div>

            {/* Test */}
            {isSubscribed && (
                <button
                    onClick={handleTestNotification}
                    className="text-sm text-red-600 hover:underline"
                >
                    Envoyer une notification de test
                </button>
            )}

            {/* Préférences détaillées */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Types de notifications</h3>

                <PreferenceSwitch
                    label="Rappels de RDV"
                    description="5 minutes avant chaque rendez-vous"
                    enabled={preferences.rdvReminders}
                    onChange={() => handlePreferenceChange('rdvReminders')}
                />

                <PreferenceSwitch
                    label="Nouveaux messages"
                    description="Quand vous recevez un message chat"
                    enabled={preferences.newMessages}
                    onChange={() => handlePreferenceChange('newMessages')}
                />

                <PreferenceSwitch
                    label="Alertes de rappel"
                    description="Quand un rappel client est imminent"
                    enabled={preferences.callbackAlerts}
                    onChange={() => handlePreferenceChange('callbackAlerts')}
                />

                <PreferenceSwitch
                    label="Rapport quotidien"
                    description="Résumé de vos performances chaque soir"
                    enabled={preferences.dailyReport}
                    onChange={() => handlePreferenceChange('dailyReport')}
                />
            </div>
        </div>
    );
};

// Composant Switch de préférence
const PreferenceSwitch = ({
    label,
    description,
    enabled,
    onChange
}: {
    label: string;
    description: string;
    enabled: boolean;
    onChange: () => void;
}) => (
    <div
        className="flex items-center justify-between p-3 bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 rounded-lg cursor-pointer hover:border-red-500/50 transition-colors"
        onClick={onChange}
    >
        <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{label}</p>
            <p className="text-xs text-gray-500">{description}</p>
        </div>
        <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${enabled ? 'bg-red-600' : 'bg-gray-300 dark:bg-white/20'
            }`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
        </div>
    </div>
);

export default NotificationSettings;
