import { Router } from 'express';
import { handleAircallWebhook, simulateCall, initiateCall } from '../controllers/aircallController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

// Route publique pour le webhook (Aircall doit pouvoir l'appeler sans token JWT de notre app)
// Idéalement, on vérifierait un token secret Aircall
router.post('/webhook', handleAircallWebhook);

// Route protégée pour simuler un appel depuis le frontend (dev)
router.post('/simulate', authenticate, simulateCall);
router.post('/dial', authenticate, initiateCall);

export default router;
