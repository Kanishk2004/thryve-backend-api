import { ChatService } from '../../services/chat/chat.service.js';
import { AsyncHandler } from '../../utils/AsyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import ApiError from '../../utils/ApiError.js';

/**
 * Get all chat sessions for the current user
 */
const getChatSessions = AsyncHandler(async (req, res) => {
	const userId = req.user.id;
	const { page = 1, limit = 20, search } = req.query;

	const result = await ChatService.getUserChatSessions(userId, {
		page: parseInt(page),
		limit: parseInt(limit),
		search
	});

	return res.status(200).json(
		new ApiResponse(200, result.data, result.message)
	);
});

/**
 * Get specific chat session details
 */
const getChatSession = AsyncHandler(async (req, res) => {
	const userId = req.user.id;
	const { id: chatId } = req.params;

	const result = await ChatService.getChatSession(chatId, userId);

	return res.status(200).json(
		new ApiResponse(200, result.data, result.message)
	);
});

/**
 * Create a new chat session
 */
const createChatSession = AsyncHandler(async (req, res) => {
	const userId = req.user.id;
	const { targetUserId, type, name, description } = req.body;

	// Validate input
	if (type === 'DIRECT' && !targetUserId) {
		throw ApiError.badRequest('Target user ID is required for direct chat');
	}

	if (type === 'GROUP' && !name) {
		throw ApiError.badRequest('Group name is required for group chat');
	}

	const result = await ChatService.createChatSession(userId, {
		targetUserId,
		type,
		name,
		description
	});

	// Emit chat creation event via Socket.IO if available
	const io = req.app.get('io');
	if (io && result.data.targetUserId) {
		io.to(`user_${targetUserId}`).emit('chat_created', {
			chatId: result.data.chatId,
			type: result.data.type,
			participant: {
				id: req.user.id,
				username: req.user.username,
				fullName: req.user.fullName,
				avatarURL: req.user.avatarURL
			}
		});
	}

	return res.status(201).json(
		new ApiResponse(201, result.data, result.message)
	);
});

/**
 * Update chat session (group chats only)
 */
const updateChatSession = AsyncHandler(async (req, res) => {
	const userId = req.user.id;
	const { id: chatId } = req.params;
	const { name, description, avatarURL } = req.body;

	const result = await ChatService.updateChatSession(chatId, userId, {
		name,
		description,
		avatarURL
	});

	// Emit update event via Socket.IO
	const io = req.app.get('io');
	if (io) {
		io.to(`chat_${chatId}`).emit('chat_updated', {
			chatId,
			name: result.data.name,
			description: result.data.description,
			avatarURL: result.data.avatarURL,
			updatedBy: {
				id: userId,
				username: req.user.username
			}
		});
	}

	return res.status(200).json(
		new ApiResponse(200, result.data, result.message)
	);
});

/**
 * Delete/leave chat session
 */
const deleteChatSession = AsyncHandler(async (req, res) => {
	const userId = req.user.id;
	const { id: chatId } = req.params;

	const result = await ChatService.deleteChatSession(chatId, userId);

	// Emit leave event via Socket.IO
	const io = req.app.get('io');
	if (io) {
		io.to(`chat_${chatId}`).emit('participant_left', {
			chatId,
			userId,
			username: req.user.username,
			leftAt: new Date().toISOString()
		});
	}

	return res.status(200).json(
		new ApiResponse(200, result.data, result.message)
	);
});

export {
	getChatSessions,
	getChatSession,
	createChatSession,
	updateChatSession,
	deleteChatSession
};
