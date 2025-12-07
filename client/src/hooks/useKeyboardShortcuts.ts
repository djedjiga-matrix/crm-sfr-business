import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface KeyboardShortcut {
    key: string;
    ctrlKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    action: () => void;
    description: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        // Ignorer si on est dans un input/textarea
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            // Mais autoriser Escape
            if (event.key !== 'Escape') {
                return;
            }
        }

        for (const shortcut of shortcuts) {
            const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
            const ctrlMatch = shortcut.ctrlKey ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
            const altMatch = shortcut.altKey ? event.altKey : !event.altKey;
            const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;

            if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
                event.preventDefault();
                shortcut.action();
                break;
            }
        }
    }, [shortcuts]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
};

// Hook pour les raccourcis globaux de navigation
export const useGlobalShortcuts = (openSearch: () => void) => {
    const navigate = useNavigate();

    const shortcuts: KeyboardShortcut[] = [
        {
            key: 'k',
            ctrlKey: true,
            action: openSearch,
            description: 'Ouvrir la recherche globale'
        },
        {
            key: 'd',
            altKey: true,
            action: () => navigate('/'),
            description: 'Aller au Dashboard'
        },
        {
            key: 'c',
            altKey: true,
            action: () => navigate('/contacts'),
            description: 'Aller aux Contacts'
        },
        {
            key: 'p',
            altKey: true,
            action: () => navigate('/preview'),
            description: 'Mode Preview'
        },
        {
            key: 'a',
            altKey: true,
            action: () => navigate('/calendar'),
            description: 'Agenda'
        }
    ];

    useKeyboardShortcuts(shortcuts);
};

// Afficher l'aide des raccourcis
export const shortcutsList = [
    { keys: 'Ctrl+K', description: 'Recherche globale' },
    { keys: 'Alt+D', description: 'Dashboard' },
    { keys: 'Alt+C', description: 'Contacts' },
    { keys: 'Alt+P', description: 'Mode Preview' },
    { keys: 'Alt+A', description: 'Agenda' },
    { keys: 'Escape', description: 'Fermer modal' },
    { keys: '?', description: 'Aide raccourcis' },
];
