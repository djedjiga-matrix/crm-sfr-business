import { Router } from 'express';
import { getRecordings, streamRecording, updateRecordingStatus } from '../controllers/recordingController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

// Only Manager (SUPERVISEUR) and ADMIN can access recordings?
// User said: "Accessible uniquement aux rôles : Manager et Superviseur"
// In our roles: ADMIN, SUPERVISEUR.
router.get('/', authenticate, authorize(['ADMIN', 'SUPERVISEUR']), getRecordings);
router.get('/:id/stream', authenticate, authorize(['ADMIN', 'SUPERVISEUR']), streamRecording);
router.patch('/:id/status', authenticate, authorize(['ADMIN', 'SUPERVISEUR']), updateRecordingStatus);

export default router;
