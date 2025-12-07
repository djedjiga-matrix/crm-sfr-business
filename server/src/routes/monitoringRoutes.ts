import express from 'express';
import { getMonitoringState, getUserHistory } from '../controllers/monitoringController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', authenticate, authorize(['ADMIN', 'SUPERVISEUR']), getMonitoringState);
router.get('/history/:userId', authenticate, authorize(['ADMIN', 'SUPERVISEUR']), getUserHistory);

export default router;
