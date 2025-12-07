import { Router } from 'express';
import { getAuditLogs, getAuditStats, exportAuditLogs } from '../controllers/auditController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

// Seuls les admins peuvent consulter les logs d'audit
router.get('/', authorize(['ADMIN']), getAuditLogs);
router.get('/stats', authorize(['ADMIN']), getAuditStats);
router.get('/export', authorize(['ADMIN']), exportAuditLogs);

export default router;
