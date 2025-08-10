import { prisma } from '../../db/index.js';
import ApiError from '../../utils/ApiError.js';

export class ChatService {
	/**
	 * Get all chat sessions for a user
	 */
	static async getUserChatSessions(userId, options = {}) {
		const { page = 1, limit = 20, search } = options;
		const skip = (page - 1) * limit;

		const whereClause = {
			AND: [
				{ isActive: true },
				{
					OR: [
						// Direct chats
						{ user1Id: userId },
						{ user2Id: userId },
						// Group chats
						{
							participants: {
								some: {
									AND: [
										{ userId },
										{ isActive: true }
									]
								}
							}
						}
					]
				}
			]
		};

		// Add search filter if provided
		if (search) {
			whereClause.AND.push({
				OR: [
					{ name: { contains: search, mode: 'insensitive' } },
					{
						user1: {
							OR: [
								{ username: { contains: search, mode: 'insensitive' } },
								{ fullName: { contains: search, mode: 'insensitive' } }
							]
						}
					},
					{
						user2: {
							OR: [
								{ username: { contains: search, mode: 'insensitive' } },
								{ fullName: { contains: search, mode: 'insensitive' } }
							]
						}
					}
				]
			});
		}

		const [chatSessions, totalCount] = await Promise.all([
			prisma.chatSession.findMany({
				where: whereClause,
				include: {
					user1: {
						select: {
							id: true,
							username: true,
							fullName: true,
							avatarURL: true,
							presence: {
								select: { isOnline: true, lastSeen: true }
							}
						}
					},
					user2: {
						select: {
							id: true,
							username: true,
							fullName: true,
							avatarURL: true,
							presence: {
								select: { isOnline: true, lastSeen: true }
							}
						}
					},
					participants: {
						where: { isActive: true },
						include: {
							user: {
								select: {
									id: true,
									username: true,
									fullName: true,
									avatarURL: true,
									presence: {
										select: { isOnline: true, lastSeen: true }
									}
								}
							}
						}
					},
					messages: {
						orderBy: { createdAt: 'desc' },
						take: 1,
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
					_count: {
						select: {
							messages: {
								where: {
									readBy: {
										none: { userId }
									}
								}
							}
						}
					}
				},
				orderBy: { lastActivity: 'desc' },
				skip,
				take: limit
			}),
			prisma.chatSession.count({ where: whereClause })
		]);

		// Format chat sessions for response
		const formattedSessions = chatSessions.map(session => {
			let chatInfo = {
				id: session.id,
				type: session.type,
				lastActivity: session.lastActivity,
				unreadCount: session._count.messages,
				lastMessage: session.messages[0] || null
			};

			if (session.type === 'DIRECT') {
				// Get the other participant
				const otherUser = session.user1Id === userId ? session.user2 : session.user1;
				chatInfo = {
					...chatInfo,
					name: otherUser.fullName || otherUser.username,
					avatarURL: otherUser.avatarURL,
					participant: otherUser,
					isOnline: otherUser.presence?.isOnline || false,
					lastSeen: otherUser.presence?.lastSeen
				};
			} else {
				// Group chat
				chatInfo = {
					...chatInfo,
					name: session.name,
					description: session.description,
					avatarURL: session.avatarURL,
					participants: session.participants.map(p => p.user),
					participantCount: session.participants.length
				};
			}

			return chatInfo;
		});

		const totalPages = Math.ceil(totalCount / limit);

		return {
			data: {
				chatSessions: formattedSessions,
				pagination: {
					currentPage: page,
					totalPages,
					totalChats: totalCount,
					hasNext: page < totalPages,
					hasPrev: page > 1
				}
			},
			message: `Retrieved ${formattedSessions.length} chat sessions`
		};
	}

	/**
	 * Get specific chat session details
	 */
	static async getChatSession(chatId, userId) {
		const session = await prisma.chatSession.findUnique({
			where: { id: chatId },
			include: {
				user1: {
					select: {
						id: true,
						username: true,
						fullName: true,
						avatarURL: true,
						presence: {
							select: { isOnline: true, lastSeen: true }
						}
					}
				},
				user2: {
					select: {
						id: true,
						username: true,
						fullName: true,
						avatarURL: true,
						presence: {
							select: { isOnline: true, lastSeen: true }
						}
					}
				},
				participants: {
					where: { isActive: true },
					include: {
						user: {
							select: {
								id: true,
								username: true,
								fullName: true,
								avatarURL: true,
								presence: {
									select: { isOnline: true, lastSeen: true }
								}
							}
						}
					}
				}
			}
		});

		if (!session || !session.isActive) {
			throw ApiError.notFound('Chat session not found');
		}

		// Verify user has access
		const hasAccess = this.verifyUserChatAccess(userId, session);
		if (!hasAccess) {
			throw ApiError.forbidden('Access denied to this chat');
		}

		// Format response
		let chatInfo = {
			id: session.id,
			type: session.type,
			createdAt: session.createdAt,
			lastActivity: session.lastActivity
		};

		if (session.type === 'DIRECT') {
			const otherUser = session.user1Id === userId ? session.user2 : session.user1;
			chatInfo = {
				...chatInfo,
				participant: otherUser
			};
		} else {
			chatInfo = {
				...chatInfo,
				name: session.name,
				description: session.description,
				avatarURL: session.avatarURL,
				participants: session.participants.map(p => ({
					...p.user,
					role: p.role,
					joinedAt: p.joinedAt
				}))
			};
		}

		return {
			data: chatInfo,
			message: 'Chat session retrieved successfully'
		};
	}

	/**
	 * Create a new chat session
	 */
	static async createChatSession(userId, data) {
		const { targetUserId, type = 'DIRECT', name, description } = data;

		if (type === 'DIRECT') {
			if (!targetUserId) {
				throw ApiError.badRequest('Target user ID is required for direct chat');
			}

			if (targetUserId === userId) {
				throw ApiError.badRequest('Cannot create chat with yourself');
			}

			// Check if target user exists and is active
			const targetUser = await prisma.user.findUnique({
				where: { id: targetUserId },
				select: { id: true, isActive: true }
			});

			if (!targetUser || !targetUser.isActive) {
				throw ApiError.notFound('Target user not found or inactive');
			}

			// Check if direct chat already exists
			const existingChat = await prisma.chatSession.findFirst({
				where: {
					type: 'DIRECT',
					OR: [
						{ user1Id: userId, user2Id: targetUserId },
						{ user1Id: targetUserId, user2Id: userId }
					]
				}
			});

			if (existingChat) {
				return {
					data: { chatId: existingChat.id, isExisting: true },
					message: 'Chat session already exists'
				};
			}

			// Create new direct chat
			const newChat = await prisma.chatSession.create({
				data: {
					type: 'DIRECT',
					user1Id: userId,
					user2Id: targetUserId
				},
				include: {
					user1: {
						select: {
							id: true,
							username: true,
							fullName: true,
							avatarURL: true
						}
					},
					user2: {
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
				data: {
					chatId: newChat.id,
					type: 'DIRECT',
					participant: newChat.user2,
					isExisting: false
				},
				message: 'Direct chat created successfully'
			};

		} else if (type === 'GROUP') {
			if (!name) {
				throw ApiError.badRequest('Group name is required');
			}

			// Create group chat
			const newChat = await prisma.chatSession.create({
				data: {
					type: 'GROUP',
					name,
					description
				}
			});

			// Add creator as admin participant
			await prisma.chatParticipant.create({
				data: {
					chatId: newChat.id,
					userId,
					role: 'ADMIN'
				}
			});

			return {
				data: {
					chatId: newChat.id,
					type: 'GROUP',
					name,
					description,
					isExisting: false
				},
				message: 'Group chat created successfully'
			};
		}

		throw ApiError.badRequest('Invalid chat type');
	}

	/**
	 * Update chat session (for group chats)
	 */
	static async updateChatSession(chatId, userId, updateData) {
		const session = await prisma.chatSession.findUnique({
			where: { id: chatId },
			include: {
				participants: {
					where: { userId, isActive: true }
				}
			}
		});

		if (!session || !session.isActive) {
			throw ApiError.notFound('Chat session not found');
		}

		if (session.type !== 'GROUP') {
			throw ApiError.badRequest('Cannot update direct chat sessions');
		}

		// Check if user is admin
		const userParticipant = session.participants[0];
		if (!userParticipant || userParticipant.role !== 'ADMIN') {
			throw ApiError.forbidden('Only admins can update group settings');
		}

		const { name, description, avatarURL } = updateData;

		const updatedSession = await prisma.chatSession.update({
			where: { id: chatId },
			data: {
				...(name && { name }),
				...(description !== undefined && { description }),
				...(avatarURL && { avatarURL })
			}
		});

		return {
			data: updatedSession,
			message: 'Group chat updated successfully'
		};
	}

	/**
	 * Delete/leave chat session
	 */
	static async deleteChatSession(chatId, userId) {
		const session = await prisma.chatSession.findUnique({
			where: { id: chatId },
			include: {
				participants: {
					where: { userId, isActive: true }
				}
			}
		});

		if (!session) {
			throw ApiError.notFound('Chat session not found');
		}

		const hasAccess = this.verifyUserChatAccess(userId, session);
		if (!hasAccess) {
			throw ApiError.forbidden('Access denied to this chat');
		}

		if (session.type === 'DIRECT') {
			// For direct chats, just mark as inactive
			await prisma.chatSession.update({
				where: { id: chatId },
				data: { isActive: false }
			});

			return {
				data: null,
				message: 'Chat session deleted successfully'
			};
		} else {
			// For group chats, remove user as participant
			await prisma.chatParticipant.updateMany({
				where: { chatId, userId },
				data: { isActive: false }
			});

			// Check if there are any active participants left
			const activeParticipants = await prisma.chatParticipant.count({
				where: { chatId, isActive: true }
			});

			if (activeParticipants === 0) {
				// No participants left, mark chat as inactive
				await prisma.chatSession.update({
					where: { id: chatId },
					data: { isActive: false }
				});
			}

			return {
				data: null,
				message: 'Left group chat successfully'
			};
		}
	}

	/**
	 * Verify if user has access to a chat session
	 */
	static verifyUserChatAccess(userId, session) {
		if (session.type === 'DIRECT') {
			return session.user1Id === userId || session.user2Id === userId;
		} else {
			return session.participants.some(p => p.userId === userId && p.isActive);
		}
	}
}
