import { Router } from 'express';
import {
    getExportFields,
    getExportTemplates,
    createExportTemplate,
    updateExportTemplate,
    deleteExportTemplate,
    exportWithTemplate
} from '../controllers/exportTemplateController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

// Get available fields for export
router.get('/fields', getExportFields);

// Templates CRUD
router.get('/', getExportTemplates);
router.post('/', authorize(['ADMIN', 'SUPERVISEUR']), createExportTemplate);
router.put('/:id', authorize(['ADMIN', 'SUPERVISEUR']), updateExportTemplate);
router.delete('/:id', authorize(['ADMIN', 'SUPERVISEUR']), deleteExportTemplate);

// Export with template
router.post('/execute', authorize(['ADMIN', 'SUPERVISEUR', 'AGENT']), exportWithTemplate);

export default router;
