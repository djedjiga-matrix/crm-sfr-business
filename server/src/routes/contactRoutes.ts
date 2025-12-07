import { Router } from 'express';
import { createContact, getContacts, getContactById, updateContact, deleteContact, deleteContacts, getNotifications, getNextContact, searchContactByUniqueId, qualifyContact } from '../controllers/contactController';
import { importContacts } from '../controllers/importController';
import { exportContacts } from '../controllers/exportController';
import { authenticate } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

router.use(authenticate);

router.post('/import', upload.single('file'), importContacts);
router.post('/', createContact);
router.get('/', getContacts);
router.get('/notifications', getNotifications);
router.get('/preview/next', getNextContact);
router.get('/search/:uniqueId', searchContactByUniqueId);
router.get('/:id', getContactById);
router.put('/:id', updateContact);
router.post('/:id/qualify', qualifyContact);
router.delete('/:id', deleteContact);
router.post('/delete-batch', deleteContacts);

router.post('/export', exportContacts);

export default router;
