import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';
import googleCalendarService from '../services/googleCalendarService';
import prisma from '../prisma';

const router = Router();

router.use(authenticate);

/**
 * Initier la connexion à Google Calendar
 */
router.get('/connect', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const authUrl = googleCalendarService.getAuthUrl(userId);
        res.json({ authUrl });
    } catch (error) {
        console.error('Error generating auth URL:', error);
        res.status(500).json({ message: 'Error generating auth URL' });
    }
});

/**
 * Callback OAuth2 de Google
 */
router.get('/callback', async (req: AuthRequest, res: Response) => {
    try {
        const { code, state: userId } = req.query;

        if (!code || typeof code !== 'string') {
            return res.status(400).json({ message: 'Missing authorization code' });
        }

        // Échanger le code contre des tokens
        const tokens = await googleCalendarService.exchangeCodeForTokens(code);

        // Sauvegarder les tokens pour l'utilisateur
        // Note: Dans un vrai système, stocker les tokens de manière sécurisée (chiffrés)
        await prisma.user.update({
            where: { id: userId as string },
            data: {
                // Ajouter ces champs au schéma si nécessaire
                // googleAccessToken: tokens.access_token,
                // googleRefreshToken: tokens.refresh_token,
                // googleTokenExpiry: new Date(tokens.expiry_date)
            } as any
        });

        // Rediriger vers le frontend avec succès
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        res.redirect(`${clientUrl}/calendar?google_connected=true`);
    } catch (error) {
        console.error('Error in Google callback:', error);
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        res.redirect(`${clientUrl}/calendar?google_error=true`);
    }
});

/**
 * Vérifier le statut de connexion Google Calendar
 */
router.get('/status', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;

        // Vérifier si l'utilisateur a des tokens Google
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                // googleAccessToken: true,
                // googleRefreshToken: true
            }
        });

        // Pour l'instant, retourne false car les champs ne sont pas encore dans le schéma
        res.json({
            connected: false,
            message: 'Google Calendar integration requires schema update'
        });
    } catch (error) {
        console.error('Error checking Google status:', error);
        res.status(500).json({ message: 'Error checking status' });
    }
});

/**
 * Déconnecter Google Calendar
 */
router.post('/disconnect', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;

        // Supprimer les tokens
        await prisma.user.update({
            where: { id: userId },
            data: {
                // googleAccessToken: null,
                // googleRefreshToken: null,
                // googleTokenExpiry: null
            } as any
        });

        res.json({ message: 'Google Calendar disconnected' });
    } catch (error) {
        console.error('Error disconnecting Google:', error);
        res.status(500).json({ message: 'Error disconnecting' });
    }
});

/**
 * Synchroniser un RDV avec Google Calendar
 */
router.post('/sync/:appointmentId', async (req: AuthRequest, res: Response) => {
    try {
        const { appointmentId } = req.params;
        const userId = req.user!.userId;

        // Récupérer le RDV
        const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: {
                contact: true,
                commercial: true
            }
        });

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Vérifier les tokens Google de l'utilisateur
        // Note: Implémenter la logique complète quand les champs sont ajoutés au schéma

        res.json({
            message: 'Sync endpoint ready',
            note: 'Complete setup requires adding Google token fields to User schema'
        });
    } catch (error) {
        console.error('Error syncing appointment:', error);
        res.status(500).json({ message: 'Error syncing appointment' });
    }
});

export default router;
