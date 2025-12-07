import express from 'express';
import { authenticate } from '../middleware/authMiddleware';
import {
    getGroups,
    createGroup,
    getGroupDetails,
    getMessages,
    sendMessage,
    addReaction,
    getChatHistory,
    markGroupAsRead
} from '../controllers/chatController';

const router = express.Router();

router.use(authenticate);

// Groups
router.get('/groups', getGroups);
router.post('/groups', createGroup);
router.get('/groups/:id', getGroupDetails);
router.post('/groups/:groupId/read', markGroupAsRead);

// Messages
router.get('/groups/:groupId/messages', getMessages);
router.post('/groups/:groupId/messages', sendMessage);
router.post('/messages/:messageId/reactions', addReaction);

// Admin
router.get('/admin/history', getChatHistory);

export default router;
