import { Router } from 'express';
import { getDatabases, toggleDatabaseStatus, recycleDatabase, updateRecycleSettings, assignUsersToDatabase } from '../controllers/databaseController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

// Only admins can manage databases
router.get('/', authorize(['ADMIN', 'SUPERVISEUR']), getDatabases);
router.put('/:id/status', authorize(['ADMIN', 'SUPERVISEUR']), toggleDatabaseStatus);
router.put('/:id/recycle-settings', authorize(['ADMIN']), updateRecycleSettings);
router.post('/:id/recycle', authorize(['ADMIN']), recycleDatabase);
router.put('/:id/assign', authorize(['ADMIN', 'SUPERVISEUR']), assignUsersToDatabase);

export default router;
