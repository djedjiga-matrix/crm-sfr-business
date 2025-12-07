import { useState, useEffect, useCallback } from 'react';

interface PushNotificationState {
    isSupported: boolean;
    isSubscribed: boolean;
    permission: NotificationPermission | 'default';
}

export const usePushNotifications = () => {
    const [state, setState] = useState<PushNotificationState>({
        isSupported: false,
        isSubscribed: false,
        permission: 'default'
    });

    useEffect(() => {
        // Vérifier le support
        const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
        setState(prev => ({
            ...prev,
            isSupported,
            permission: isSupported ? Notification.permission : 'default'
        }));

        // Vérifier si déjà abonné
        if (isSupported && Notification.permission === 'granted') {
            checkSubscription();
        }
    }, []);

    const checkSubscription = async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setState(prev => ({ ...prev, isSubscribed: !!subscription }));
        } catch (error) {
            console.error('Error checking subscription:', error);
        }
    };

    const requestPermission = useCallback(async () => {
        if (!state.isSupported) return false;

        try {
            const permission = await Notification.requestPermission();
            setState(prev => ({ ...prev, permission }));
            return permission === 'granted';
        } catch (error) {
            console.error('Error requesting permission:', error);
            return false;
        }
    }, [state.isSupported]);

    const subscribe = useCallback(async () => {
        if (!state.isSupported || state.permission !== 'granted') return null;

        try {
            const registration = await navigator.serviceWorker.ready;

            // Clé publique VAPID (à remplacer par la vraie en production)
            const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource
            });

            // Envoyer l'abonnement au serveur
            // await api.post('/push/subscribe', subscription.toJSON());

            setState(prev => ({ ...prev, isSubscribed: true }));
            return subscription;
        } catch (error) {
            console.error('Error subscribing:', error);
            return null;
        }
    }, [state.isSupported, state.permission]);

    const unsubscribe = useCallback(async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                await subscription.unsubscribe();
                // await api.post('/push/unsubscribe', { endpoint: subscription.endpoint });
                setState(prev => ({ ...prev, isSubscribed: false }));
            }
        } catch (error) {
            console.error('Error unsubscribing:', error);
        }
    }, []);

    // Envoyer une notification locale (pour test)
    const showLocalNotification = useCallback(async (title: string, options?: NotificationOptions) => {
        if (state.permission !== 'granted') return;

        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification(title, {
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-72x72.png',
                ...options
            });
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }, [state.permission]);

    return {
        ...state,
        requestPermission,
        subscribe,
        unsubscribe,
        showLocalNotification
    };
};

// Helper pour convertir la clé VAPID
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Enregistrer le Service Worker
export const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('[PWA] Service Worker registered:', registration.scope);
            return registration;
        } catch (error) {
            console.error('[PWA] Service Worker registration failed:', error);
            return null;
        }
    }
    return null;
};
