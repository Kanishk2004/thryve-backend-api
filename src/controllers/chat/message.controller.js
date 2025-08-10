import { MessageService } from '../../services/chat/message.service.js';
import { AsyncHandler } from '../../utils/AsyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import ApiError from '../../utils/ApiError.js';

/**
 * Get message history for a chat session
 */
const getChatMessages = AsyncHandler(async (req, res) => {
	const userId = req.user.id;
	const { id: chatId } = req.params;
	const { page = 1, limit = 50, before, after } = req.query;

	const result = await MessageService.getChatMessages(chatId, userId, {
		page: parseInt(page),
		limit: parseInt(limit),
		before,
		after
	});

	return res.status(200).json(
		new ApiResponse(200, result.data, result.message)
	);
});

/**
 * Send a message via HTTP (alternative to Socket.IO)
 */
const sendMessage = AsyncHandler(async (req, res) => {
	const userId = req.user.id;
	const { id: chatId } = req.params;
	const { content, type, replyToId, mediaURL, mediaType, mediaSize } = req.body;

	const result = await MessageService.sendMessage(chatId, userId, {
		content,
		type,
		replyToId,
		mediaURL,
		mediaType,
		mediaSize
	});

	// Emit message via Socket.IO if available
	const io = req.app.get('io');
	if (io) {
		io.to(`chat_${chatId}`).emit('message_received', {
			id: result.data.id,
			chatId: result.data.chatId,
			content: result.data.content,
			type: result.data.type,
			mediaURL: result.data.mediaURL,
			mediaType: result.data.mediaType,
			mediaSize: result.data.mediaSize,
			sender: result.data.sender,
			replyTo: result.data.replyTo,
			createdAt: result.data.createdAt,
			deliveredAt: result.data.deliveredAt
		});
	}

	return res.status(201).json(
		new ApiResponse(201, result.data, result.message)
	);
});

/**
 * Edit a message
 */
const editMessage = AsyncHandler(async (req, res) => {
	const userId = req.user.id;
	const { id: messageId } = req.params;
	const { content } = req.body;

	if (!content || content.trim().length === 0) {
		throw ApiError.badRequest('Message content is required');
	}

	const result = await MessageService.editMessage(messageId, userId, content.trim());

	// Emit edit event via Socket.IO
	const io = req.app.get('io');
	if (io) {
		// Get chat ID from the updated message
		const chatId = result.data.chatId;
		io.to(`chat_${chatId}`).emit('message_edited', {
			id: result.data.id,
			content: result.data.content,
			isEdited: result.data.isEdited,
			editedAt: result.data.editedAt
		});
	}

	return res.status(200).json(
		new ApiResponse(200, result.data, result.message)
	);
});

/**
 * Delete a message
 */
const deleteMessage = AsyncHandler(async (req, res) => {
	const userId = req.user.id;
	const { id: messageId } = req.params;

	const result = await MessageService.deleteMessage(messageId, userId);

	// Emit delete event via Socket.IO
	const io = req.app.get('io');
	if (io) {
		io.to(`chat_${result.data.chatId}`).emit('message_deleted', {
			messageId: result.data.messageId,
			deletedBy: userId
		});
	}

	return res.status(200).json(
		new ApiResponse(200, result.data, result.message)
	);
});

/**
 * Mark messages as read
 */
const markMessagesAsRead = AsyncHandler(async (req, res) => {
	const userId = req.user.id;
	const { id: chatId } = req.params;
	const { messageIds } = req.body;

	if (!Array.isArray(messageIds) || messageIds.length === 0) {
		throw ApiError.badRequest('Message IDs array is required');
	}

	const result = await MessageService.markMessagesAsRead(chatId, userId, messageIds);

	// Emit read receipts via Socket.IO
	const io = req.app.get('io');
	if (io) {
		io.to(`chat_${chatId}`).emit('messages_read', {
			messageIds: result.data.messageIds,
			readBy: {
				id: userId,
				username: req.user.username
			},
			readAt: result.data.readAt
		});
	}

	return res.status(200).json(
		new ApiResponse(200, result.data, result.message)
	);
});

/**
 * Get unread message count for a chat
 */
const getUnreadCount = AsyncHandler(async (req, res) => {
	const userId = req.user.id;
	const { id: chatId } = req.params;

	const result = await MessageService.getUnreadCount(chatId, userId);

	return res.status(200).json(
		new ApiResponse(200, result.data, result.message)
	);
});

/**
 * Search messages in a chat
 */
const searchMessages = AsyncHandler(async (req, res) => {
	const userId = req.user.id;
	const { id: chatId } = req.params;
	const { q: searchQuery, page = 1, limit = 20 } = req.query;

	if (!searchQuery || searchQuery.trim().length === 0) {
		throw ApiError.badRequest('Search query is required');
	}

	const result = await MessageService.searchMessages(chatId, userId, searchQuery.trim(), {
		page: parseInt(page),
		limit: parseInt(limit)
	});

	return res.status(200).json(
		new ApiResponse(200, result.data, result.message)
	);
});

export {
	getChatMessages,
	sendMessage,
	editMessage,
	deleteMessage,
	markMessagesAsRead,
	getUnreadCount,
	searchMessages
};
