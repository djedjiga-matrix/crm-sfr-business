/**
 * Service de synchronisation avec Google Calendar
 * 
 * Pour utiliser ce service, vous devez :
 * 1. Créer un projet dans Google Cloud Console
 * 2. Activer l'API Google Calendar
 * 3. Créer des identifiants OAuth 2.0
 * 4. Configurer les variables d'environnement
 */

import axios from 'axios';

interface GoogleTokens {
    access_token: string;
    refresh_token: string;
    expiry_date: number;
}

interface CalendarEvent {
    id?: string;
    summary: string;
    description?: string;
    location?: string;
    start: {
        dateTime: string;
        timeZone: string;
    };
    end: {
        dateTime: string;
        timeZone: string;
    };
    attendees?: Array<{
        email: string;
        displayName?: string;
    }>;
    reminders?: {
        useDefault: boolean;
        overrides?: Array<{
            method: 'email' | 'popup';
            minutes: number;
        }>;
    };
}

// Configuration OAuth2
const GOOGLE_CONFIG = {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/calendar/callback',
    scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
    ]
};

/**
 * Génère l'URL d'autorisation OAuth2
 */
export const getAuthUrl = (userId: string): string => {
    const params = new URLSearchParams({
        client_id: GOOGLE_CONFIG.clientId,
        redirect_uri: GOOGLE_CONFIG.redirectUri,
        response_type: 'code',
        scope: GOOGLE_CONFIG.scopes.join(' '),
        access_type: 'offline',
        prompt: 'consent',
        state: userId // Pour identifier l'utilisateur au retour
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

/**
 * Échange le code d'autorisation contre des tokens
 */
export const exchangeCodeForTokens = async (code: string): Promise<GoogleTokens> => {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: GOOGLE_CONFIG.clientId,
        client_secret: GOOGLE_CONFIG.clientSecret,
        redirect_uri: GOOGLE_CONFIG.redirectUri,
        grant_type: 'authorization_code'
    });

    return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expiry_date: Date.now() + (response.data.expires_in * 1000)
    };
};

/**
 * Rafraîchit le token d'accès
 */
export const refreshAccessToken = async (refreshToken: string): Promise<GoogleTokens> => {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
        refresh_token: refreshToken,
        client_id: GOOGLE_CONFIG.clientId,
        client_secret: GOOGLE_CONFIG.clientSecret,
        grant_type: 'refresh_token'
    });

    return {
        access_token: response.data.access_token,
        refresh_token: refreshToken,
        expiry_date: Date.now() + (response.data.expires_in * 1000)
    };
};

/**
 * Crée un événement dans Google Calendar
 */
export const createCalendarEvent = async (
    accessToken: string,
    event: CalendarEvent,
    calendarId: string = 'primary'
): Promise<CalendarEvent> => {
    const response = await axios.post(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
        event,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        }
    );

    return response.data;
};

/**
 * Met à jour un événement Google Calendar
 */
export const updateCalendarEvent = async (
    accessToken: string,
    eventId: string,
    event: Partial<CalendarEvent>,
    calendarId: string = 'primary'
): Promise<CalendarEvent> => {
    const response = await axios.patch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
        event,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        }
    );

    return response.data;
};

/**
 * Supprime un événement Google Calendar
 */
export const deleteCalendarEvent = async (
    accessToken: string,
    eventId: string,
    calendarId: string = 'primary'
): Promise<void> => {
    await axios.delete(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }
    );
};

/**
 * Liste les événements du calendrier
 */
export const listCalendarEvents = async (
    accessToken: string,
    options: {
        timeMin?: string;
        timeMax?: string;
        maxResults?: number;
        calendarId?: string;
    } = {}
): Promise<CalendarEvent[]> => {
    const {
        timeMin = new Date().toISOString(),
        timeMax,
        maxResults = 50,
        calendarId = 'primary'
    } = options;

    const params = new URLSearchParams({
        timeMin,
        maxResults: String(maxResults),
        singleEvents: 'true',
        orderBy: 'startTime'
    });

    if (timeMax) {
        params.append('timeMax', timeMax);
    }

    const response = await axios.get(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params.toString()}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }
    );

    return response.data.items || [];
};

/**
 * Convertit un RDV CRM en événement Google Calendar
 */
export const appointmentToGoogleEvent = (appointment: {
    contactName: string;
    companyName: string;
    scheduledAt: Date;
    durationMinutes: number;
    address?: string;
    notes?: string;
    contactEmail?: string;
    commercialEmail?: string;
}): CalendarEvent => {
    const start = new Date(appointment.scheduledAt);
    const end = new Date(start.getTime() + appointment.durationMinutes * 60000);

    const attendees = [];
    if (appointment.contactEmail) {
        attendees.push({ email: appointment.contactEmail, displayName: appointment.contactName });
    }
    if (appointment.commercialEmail) {
        attendees.push({ email: appointment.commercialEmail });
    }

    return {
        summary: `RDV: ${appointment.companyName} - ${appointment.contactName}`,
        description: appointment.notes || `Rendez-vous commercial avec ${appointment.contactName} de ${appointment.companyName}`,
        location: appointment.address,
        start: {
            dateTime: start.toISOString(),
            timeZone: 'Europe/Paris'
        },
        end: {
            dateTime: end.toISOString(),
            timeZone: 'Europe/Paris'
        },
        attendees: attendees.length > 0 ? attendees : undefined,
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'popup', minutes: 30 },
                { method: 'email', minutes: 1440 } // 24h avant
            ]
        }
    };
};

export default {
    getAuthUrl,
    exchangeCodeForTokens,
    refreshAccessToken,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    listCalendarEvents,
    appointmentToGoogleEvent
};
