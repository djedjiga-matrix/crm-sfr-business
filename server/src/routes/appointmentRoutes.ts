import { Router } from 'express';
import { createAppointment, getAppointments, updateAppointment, deleteAppointment, getAppointmentHistory, getAppointmentById, exportAppointments } from '../controllers/appointmentController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.post('/', createAppointment);
router.get('/', getAppointments);
router.get('/export', exportAppointments); // Export CSV - avant /:id pour éviter conflit
router.put('/:id', updateAppointment);
router.get('/:id/history', getAppointmentHistory);
router.get('/:id', getAppointmentById);
router.delete('/:id', deleteAppointment);

export default router;
