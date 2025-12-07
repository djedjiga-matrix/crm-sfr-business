import { Router } from 'express';
import { getCalls, qualifyCall } from '../controllers/callController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', getCalls);
router.post('/:id/qualify', qualifyCall);

export default router;
