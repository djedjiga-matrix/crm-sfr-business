
import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/userController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

// Toutes les routes utilisateurs nécessitent d'être authentifié et d'être ADMIN
router.use(authenticate);
// Routes accessibles aux ADMIN et AGENTS (lecture seule pour les agents)
router.get('/', authorize(['ADMIN', 'AGENT', 'SUPERVISEUR', 'COMMERCIAL']), getUsers);

// Routes réservées aux ADMIN
router.post('/', authorize(['ADMIN']), createUser);
router.put('/:id', authorize(['ADMIN']), updateUser);
router.delete('/:id', authorize(['ADMIN']), deleteUser);

export default router;
