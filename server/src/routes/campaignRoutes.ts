
import { Router } from 'express';
import { createCampaign, getCampaigns, updateCampaign, deleteCampaign } from '../controllers/campaignController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

// Only admins can manage campaigns
router.post('/', authorize(['ADMIN']), createCampaign);
router.get('/', getCampaigns); // Agents might need to see campaigns too? Or only their assigned ones?
router.put('/:id', authorize(['ADMIN']), updateCampaign);
router.delete('/:id', authorize(['ADMIN']), deleteCampaign);

export default router;
