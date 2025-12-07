import express from 'express';
import { generateGrhExport } from '../controllers/grhController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/export', authenticate, authorize(['ADMIN', 'SUPERVISEUR']), generateGrhExport);

export default router;
