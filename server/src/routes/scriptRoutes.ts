import { Router } from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware';
import {
    getScripts,
    getScriptByStatus,
    upsertScript,
    deleteScript,
    getGlobalObjections,
    updateGlobalObjections,
    seedDefaultScripts
} from '../controllers/scriptController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all scripts (for admin)
router.get('/', getScripts);

// Get script by status (for preview mode)
router.get('/status/:status', getScriptByStatus);

// Get global objections
router.get('/objections', getGlobalObjections);

// Admin only routes
router.post('/', authorize(['ADMIN', 'SUPERVISEUR']), upsertScript);
router.put('/:id', authorize(['ADMIN', 'SUPERVISEUR']), upsertScript);
router.delete('/:id', authorize(['ADMIN', 'SUPERVISEUR']), deleteScript);

// Update global objections (admin only)
router.put('/objections/global', authorize(['ADMIN', 'SUPERVISEUR']), updateGlobalObjections);

// Seed default scripts (admin only)
router.post('/seed', authorize(['ADMIN', 'SUPERVISEUR']), seedDefaultScripts);

export default router;
