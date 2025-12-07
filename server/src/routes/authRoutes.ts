import { Router } from 'express';
import { login, getMe } from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';
import { authRateLimit } from '../middleware/rateLimitMiddleware';

const router = Router();

// Rate limit sur le login pour éviter les attaques par force brute
router.post('/login', authRateLimit, login);
// NOTE: Route /register supprimée pour des raisons de sécurité
// La création d'utilisateurs se fait via la page Admin (/api/users avec authentification)
router.get('/me', authenticate, getMe);

export default router;

