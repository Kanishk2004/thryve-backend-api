import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import {
	getChatSessions,
	getChatSession,
	createChatSession,
	updateChatSession,
	deleteChatSession
} from '../controllers/chat/chat.controller.js';
import {
	getChatMessages,
	sendMessage,
	editMessage,
	deleteMessage,
	markMessagesAsRead,
	getUnreadCount,
	searchMessages
} from '../controllers/chat/message.controller.js';

const router = Router();

// All chat routes require authentication
router.use(authenticateToken);

// Chat Session Routes
router
	.route('/sessions')
	.get(getChatSessions)          // GET /api/v1/chat/sessions - Get all user's chat sessions
	.post(createChatSession);      // POST /api/v1/chat/sessions - Create new chat session

router
	.route('/sessions/:id')
	.get(getChatSession)           // GET /api/v1/chat/sessions/:id - Get specific chat session
	.put(updateChatSession)        // PUT /api/v1/chat/sessions/:id - Update chat session (groups only)
	.delete(deleteChatSession);    // DELETE /api/v1/chat/sessions/:id - Delete/leave chat session

// Message Routes
router
	.route('/sessions/:id/messages')
	.get(getChatMessages)          // GET /api/v1/chat/sessions/:id/messages - Get message history
	.post(sendMessage);            // POST /api/v1/chat/sessions/:id/messages - Send message (HTTP fallback)

router
	.route('/messages/:id')
	.put(editMessage)              // PUT /api/v1/chat/messages/:id - Edit message
	.delete(deleteMessage);        // DELETE /api/v1/chat/messages/:id - Delete message

// Message Management Routes
router
	.route('/sessions/:id/read')
	.post(markMessagesAsRead);     // POST /api/v1/chat/sessions/:id/read - Mark messages as read

router
	.route('/sessions/:id/unread')
	.get(getUnreadCount);          // GET /api/v1/chat/sessions/:id/unread - Get unread count

router
	.route('/sessions/:id/search')
	.get(searchMessages);          // GET /api/v1/chat/sessions/:id/search - Search messages

export default router;
