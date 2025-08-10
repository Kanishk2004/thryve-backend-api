import { prisma } from '../../db/index.js';
import ApiError from '../../utils/ApiError.js';

export class MessageService {
	/**
	 * Get message history for a chat session
	 */
	static async getChatMessages(chatId, userId, options = {}) {
		const { page = 1, limit = 50, before, after } = options;
		const skip = (page - 1) * limit;

		// Verify user has access to this chat
		const hasAccess = await this.verifyUserChatAccess(userId, chatId);
		if (!hasAccess) {
			throw ApiError.forbidden('Access denied to this chat');
		}

		const whereClause = {
			chatId
		};

		// Add cursor-based pagination if provided
		if (before) {
			whereClause.createdAt = { lt: new Date(before) };
		}
		if (after) {
			whereClause.createdAt = { gt: new Date(after) };
		}

		const [messages, totalCount] = await Promise.all([
			prisma.chatMessage.findMany({
				where: whereClause,
				include: {
					sender: {
						select: {
							id: true,
							username: true,
							fullName: true,
							avatarURL: true
						}
					},
					replyTo: {
						include: {
							sender: {
								select: {
									id: true,
									username: true,
									fullName: true
								}
							}
						}
					},
					readBy: {
						include: {
							user: {
								select: {
									id: true,
									username: true,
									fullName: true
								}
							}
						}
					}
				},
				orderBy: { createdAt: 'desc' },
				skip,
				take: limit
			}),
			prisma.chatMessage.count({ where: { chatId } })
		]);

		// Mark messages as delivered for the requesting user
		const undeliveredMessages = messages.filter(msg => 
			msg.senderId !== userId && !msg.deliveredAt
		);

		if (undeliveredMessages.length > 0) {
			await prisma.chatMessage.updateMany({
				where: {
					id: { in: undeliveredMessages.map(msg => msg.id) }
				},
				data: { deliveredAt: new Date() }
			});
		}

		const totalPages = Math.ceil(totalCount / limit);

		return {
			data: {
				messages: messages.reverse(), // Reverse to get chronological order
				pagination: {
					currentPage: page,
					totalPages,
					totalMessages: totalCount,
					hasNext: page < totalPages,
					hasPrev: page > 1
				}
			},
			message: `Retrieved ${messages.length} messages`
		};
	}

	/**
	 * Send a message (for HTTP endpoint)
	 */
	static async sendMessage(chatId, userId, messageData) {
		const { content, type = 'TEXT', replyToId, mediaURL, mediaType, mediaSize } = messageData;

		// Verify user has access to this chat
		const hasAccess = await this.verifyUserChatAccess(userId, chatId);
		if (!hasAccess) {
			throw ApiError.forbidden('Access denied to this chat');
		}

		// Validate message content
		if (!content && !mediaURL) {
			throw ApiError.badRequest('Message content or media required');
		}

		// Validate reply-to message if provided
		if (replyToId) {
			const replyToMessage = await prisma.chatMessage.findUnique({
				where: { id: replyToId, chatId }
			});

			if (!replyToMessage) {
				throw ApiError.badRequest('Reply-to message not found in this chat');
			}
		}

		// Create message
		const message = await prisma.chatMessage.create({
			data: {
				chatId,
				senderId: userId,
				type,
				content,
				mediaURL,
				mediaType,
				mediaSize,
				replyToId,
				deliveredAt: new Date()
			},
			include: {
				sender: {
					select: {
						id: true,
						username: true,
						fullName: true,
						avatarURL: true
					}
				},
				replyTo: {
					include: {
						sender: {
							select: {
								id: true,
								username: true,
								fullName: true
							}
						}
					}
				}
			}
		});

		// Update chat session last activity
		await prisma.chatSession.update({
			where: { id: chatId },
			data: { lastActivity: new Date() }
		});

		return {
			data: message,
			message: 'Message sent successfully'
		};
	}

	/**
	 * Edit a message
	 */
	static async editMessage(messageId, userId, newContent) {
		// Get message and verify ownership
		const message = await prisma.chatMessage.findUnique({
			where: { id: messageId },
			select: { 
				id: true,
				senderId: true, 
				chatId: true, 
				createdAt: true,
				type: true
			}
		});

		if (!message) {
			throw ApiError.notFound('Message not found');
		}

		if (message.senderId !== userId) {
			throw ApiError.forbidden('Can only edit your own messages');
		}

		if (message.type !== 'TEXT') {
			throw ApiError.badRequest('Can only edit text messages');
		}

		// Check if message is too old to edit (15 minutes)
		const editTimeLimit = 15 * 60 * 1000;
		if (Date.now() - new Date(message.createdAt).getTime() > editTimeLimit) {
			throw ApiError.badRequest('Message too old to edit');
		}

		// Update message
		const updatedMessage = await prisma.chatMessage.update({
			where: { id: messageId },
			data: {
				content: newContent,
				isEdited: true,
				editedAt: new Date()
			},
			include: {
				sender: {
					select: {
						id: true,
						username: true,
						fullName: true,
						avatarURL: true
					}
				}
			}
		});

		return {
			data: updatedMessage,
			message: 'Message edited successfully'
		};
	}

	/**
	 * Delete a message
	 */
	static async deleteMessage(messageId, userId) {
		// Get message and verify ownership/permissions
		const message = await prisma.chatMessage.findUnique({
			where: { id: messageId },
			include: {
				chatSession: {
					include: {
						participants: {
							where: { userId }
						}
					}
				}
			}
		});

		if (!message) {
			throw ApiError.notFound('Message not found');
		}

		const isOwner = message.senderId === userId;
		const isAdmin = message.chatSession.participants.some(p => 
			p.userId === userId && p.role === 'ADMIN'
		);

		if (!isOwner && !isAdmin) {
			throw ApiError.forbidden('Cannot delete this message');
		}

		// Delete message and all related data
		await prisma.chatMessage.delete({
			where: { id: messageId }
		});

		return {
			data: { messageId, chatId: message.chatId },
			message: 'Message deleted successfully'
		};
	}

	/**
	 * Mark messages as read
	 */
	static async markMessagesAsRead(chatId, userId, messageIds) {
		// Verify user has access to this chat
		const hasAccess = await this.verifyUserChatAccess(userId, chatId);
		if (!hasAccess) {
			throw ApiError.forbidden('Access denied to this chat');
		}

		// Verify all messages belong to this chat
		const messageCount = await prisma.chatMessage.count({
			where: {
				id: { in: messageIds },
				chatId
			}
		});

		if (messageCount !== messageIds.length) {
			throw ApiError.badRequest('Some messages do not belong to this chat');
		}

		// Mark messages as read
		const readRecords = await Promise.all(
			messageIds.map(messageId =>
				prisma.messageRead.upsert({
					where: {
						messageId_userId: {
							messageId,
							userId
						}
					},
					update: { readAt: new Date() },
					create: {
						messageId,
						userId,
						readAt: new Date()
					}
				})
			)
		);

		return {
			data: {
				messageIds,
				readAt: new Date().toISOString(),
				readBy: userId
			},
			message: `Marked ${messageIds.length} messages as read`
		};
	}

	/**
	 * Get unread message count for a chat
	 */
	static async getUnreadCount(chatId, userId) {
		const hasAccess = await this.verifyUserChatAccess(userId, chatId);
		if (!hasAccess) {
			throw ApiError.forbidden('Access denied to this chat');
		}

		const unreadCount = await prisma.chatMessage.count({
			where: {
				chatId,
				senderId: { not: userId }, // Don't count own messages
				readBy: {
					none: { userId }
				}
			}
		});

		return {
			data: { chatId, unreadCount },
			message: 'Unread count retrieved successfully'
		};
	}

	/**
	 * Search messages in a chat
	 */
	static async searchMessages(chatId, userId, searchQuery, options = {}) {
		const { page = 1, limit = 20 } = options;
		const skip = (page - 1) * limit;

		// Verify user has access to this chat
		const hasAccess = await this.verifyUserChatAccess(userId, chatId);
		if (!hasAccess) {
			throw ApiError.forbidden('Access denied to this chat');
		}

		const whereClause = {
			chatId,
			content: {
				contains: searchQuery,
				mode: 'insensitive'
			}
		};

		const [messages, totalCount] = await Promise.all([
			prisma.chatMessage.findMany({
				where: whereClause,
				include: {
					sender: {
						select: {
							id: true,
							username: true,
							fullName: true,
							avatarURL: true
						}
					}
				},
				orderBy: { createdAt: 'desc' },
				skip,
				take: limit
			}),
			prisma.chatMessage.count({ where: whereClause })
		]);

		const totalPages = Math.ceil(totalCount / limit);

		return {
			data: {
				messages,
				searchQuery,
				pagination: {
					currentPage: page,
					totalPages,
					totalResults: totalCount,
					hasNext: page < totalPages,
					hasPrev: page > 1
				}
			},
			message: `Found ${messages.length} messages matching "${searchQuery}"`
		};
	}

	/**
	 * Verify if user has access to a specific chat
	 */
	static async verifyUserChatAccess(userId, chatId) {
		try {
			const chat = await prisma.chatSession.findUnique({
				where: { id: chatId },
				include: {
					participants: {
						where: { userId, isActive: true }
					}
				}
			});

			if (!chat || !chat.isActive) {
				return false;
			}

			// For direct chats
			if (chat.type === 'DIRECT') {
				return chat.user1Id === userId || chat.user2Id === userId;
			}

			// For group chats
			if (chat.type === 'GROUP') {
				return chat.participants.length > 0;
			}

			return false;
		} catch (error) {
			console.error('Error verifying chat access:', error);
			return false;
		}
	}
}
