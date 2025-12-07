import { Router } from 'express';
import { getDatabases, toggleDatabaseStatus, recycleDatabase, updateRecycleSettings } from '../controllers/databaseController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

// Only admins can manage databases
router.get('/', authorize(['ADMIN']), getDatabases);
router.put('/:id/status', authorize(['ADMIN']), toggleDatabaseStatus);
router.put('/:id/recycle-settings', authorize(['ADMIN']), updateRecycleSettings);
router.post('/:id/recycle', authorize(['ADMIN']), recycleDatabase);

export default router;
