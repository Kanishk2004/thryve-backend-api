import { prisma } from '../../db/index.js';
import { emitToChatRoom, getOnlineUsersInChat } from '../index.js';

/**
 * Register presence-related socket event handlers
 */
export const registerPresenceHandlers = (io, socket) => {
	
	// User manually sets online status
	socket.on('user_online', async () => {
		try {
			await prisma.userPresence.upsert({
				where: { userId: socket.userId },
				update: {
					isOnline: true,
					lastSeen: new Date(),
					socketId: socket.id
				},
				create: {
					userId: socket.userId,
					isOnline: true,
					lastSeen: new Date(),
					socketId: socket.id
				}
			});

			// Get user's chat rooms and notify them
			const userChatRooms = await getUserChatRooms(socket.userId);
			
			userChatRooms.forEach(chatId => {
				socket.to(`chat_${chatId}`).emit('user_online', {
					userId: socket.userId,
					username: socket.user.username,
					avatarURL: socket.user.avatarURL,
					timestamp: new Date().toISOString()
				});
			});

		} catch (error) {
			console.error('Error setting user online:', error);
			socket.emit('error', { message: 'Failed to update online status' });
		}
	});

	// User manually sets offline status
	socket.on('user_offline', async () => {
		try {
			await prisma.userPresence.upsert({
				where: { userId: socket.userId },
				update: {
					isOnline: false,
					lastSeen: new Date(),
					socketId: null
				},
				create: {
					userId: socket.userId,
					isOnline: false,
					lastSeen: new Date(),
					socketId: null
				}
			});

			// Get user's chat rooms and notify them
			const userChatRooms = await getUserChatRooms(socket.userId);
			
			userChatRooms.forEach(chatId => {
				socket.to(`chat_${chatId}`).emit('user_offline', {
					userId: socket.userId,
					username: socket.user.username,
					lastSeen: new Date().toISOString()
				});
			});

		} catch (error) {
			console.error('Error setting user offline:', error);
		}
	});

	// Get online users in a specific chat
	socket.on('get_online_users', async (data) => {
		try {
			const { chatId } = data;
			
			// Verify user has access to this chat
			const hasAccess = await verifyUserChatAccess(socket.userId, chatId);
			if (!hasAccess) {
				socket.emit('error', { message: 'Access denied to this chat' });
				return;
			}

			const onlineUsers = await getOnlineUsersInChat(chatId);
			
			socket.emit('online_users', {
				chatId,
				onlineUsers,
				count: onlineUsers.length
			});

		} catch (error) {
			console.error('Error getting online users:', error);
			socket.emit('error', { message: 'Failed to get online users' });
		}
	});

	// Send presence update to all relevant chats
	socket.on('presence_update', async (data) => {
		try {
			const { status } = data; // 'online', 'away', 'busy', 'offline'
			
			const isOnline = status === 'online';
			
			await prisma.userPresence.upsert({
				where: { userId: socket.userId },
				update: {
					isOnline,
					lastSeen: new Date()
				},
				create: {
					userId: socket.userId,
					isOnline,
					lastSeen: new Date(),
					socketId: isOnline ? socket.id : null
				}
			});

			// Get user's chat rooms and notify them
			const userChatRooms = await getUserChatRooms(socket.userId);
			
			const presenceData = {
				userId: socket.userId,
				username: socket.user.username,
				status,
				timestamp: new Date().toISOString()
			};

			userChatRooms.forEach(chatId => {
				socket.to(`chat_${chatId}`).emit('presence_update', presenceData);
			});

		} catch (error) {
			console.error('Error updating presence:', error);
			socket.emit('error', { message: 'Failed to update presence' });
		}
	});

};

/**
 * Get all chat room IDs for a user
 */
async function getUserChatRooms(userId) {
	try {
		// Get direct chats where user is participant
		const directChats = await prisma.chatSession.findMany({
			where: {
				AND: [
					{ isActive: true },
					{
						OR: [
							{ user1Id: userId },
							{ user2Id: userId }
						]
					}
				]
			},
			select: { id: true }
		});

		// Get group chats where user is participant
		const groupChats = await prisma.chatSession.findMany({
			where: {
				AND: [
					{ type: 'GROUP' },
					{ isActive: true },
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
			},
			select: { id: true }
		});

		return [...directChats, ...groupChats].map(chat => chat.id);
	} catch (error) {
		console.error('Error getting user chat rooms:', error);
		return [];
	}
}

/**
 * Verify if user has access to a specific chat
 */
async function verifyUserChatAccess(userId, chatId) {
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
