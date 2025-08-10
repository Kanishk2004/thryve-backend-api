import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/index.js';
import ApiError from '../utils/ApiError.js';

/**
 * Initialize Socket.IO server with authentication and event handlers
 */
export const initializeSocket = (server) => {
	const io = new Server(server, {
		cors: {
			origin: process.env.FRONTEND_URL || "*",
			methods: ["GET", "POST"],
			credentials: true
		},
		pingTimeout: 60000,
		pingInterval: 25000
	});

	// Authentication middleware for socket connections
	io.use(async (socket, next) => {
		try {
			const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
			
			if (!token) {
				return next(new Error('Authentication token required'));
			}

			const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
			
			// Get user from database
			const user = await prisma.user.findUnique({
				where: { id: decoded.id },
				select: {
					id: true,
					username: true,
					fullName: true,
					avatarURL: true,
					isActive: true
				}
			});

			if (!user || !user.isActive) {
				return next(new Error('User not found or inactive'));
			}

			socket.userId = user.id;
			socket.user = user;
			next();
		} catch (error) {
			console.error('Socket authentication error:', error.message);
			return next(new Error('Invalid token'));
		}
	});

	// Connection event
	io.on('connection', async (socket) => {
		console.log(`User ${socket.user.username} connected (${socket.id})`);

		// Update user presence
		await updateUserPresence(socket.userId, true, socket.id);

		// Join user to their personal room for private notifications
		socket.join(`user_${socket.userId}`);

		// Load user's active chat sessions and join their rooms
		await joinUserChatRooms(socket);

		// Import and register event handlers
		const { registerChatHandlers } = await import('./handlers/chat.handler.js');
		const { registerPresenceHandlers } = await import('./handlers/presence.handler.js');
		const { registerTypingHandlers } = await import('./handlers/typing.handler.js');

		registerChatHandlers(io, socket);
		registerPresenceHandlers(io, socket);
		registerTypingHandlers(io, socket);

		// Handle disconnection
		socket.on('disconnect', async () => {
			console.log(`User ${socket.user.username} disconnected (${socket.id})`);
			
			// Update user presence
			await updateUserPresence(socket.userId, false);
			
			// Notify relevant chat rooms about user going offline
			const userChatRooms = await getUserChatRooms(socket.userId);
			userChatRooms.forEach(chatId => {
				socket.to(`chat_${chatId}`).emit('user_offline', {
					userId: socket.userId,
					lastSeen: new Date().toISOString()
				});
			});
		});

		// Error handling
		socket.on('error', (error) => {
			console.error(`Socket error for user ${socket.user.username}:`, error);
		});
	});

	return io;
};

/**
 * Update user presence in database
 */
async function updateUserPresence(userId, isOnline, socketId = null) {
	try {
		await prisma.userPresence.upsert({
			where: { userId },
			update: {
				isOnline,
				lastSeen: new Date(),
				socketId: isOnline ? socketId : null
			},
			create: {
				userId,
				isOnline,
				lastSeen: new Date(),
				socketId: isOnline ? socketId : null
			}
		});
	} catch (error) {
		console.error('Error updating user presence:', error);
	}
}

/**
 * Join user to all their active chat room
 */
async function joinUserChatRooms(socket) {
	try {
		const chatSessions = await getUserChatRooms(socket.userId);
		
		chatSessions.forEach(chatId => {
			socket.join(`chat_${chatId}`);
		});

		console.log(`User ${socket.user.username} joined ${chatSessions.length} chat rooms`);
	} catch (error) {
		console.error('Error joining chat rooms:', error);
	}
}

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
 * Helper function to emit to specific chat room
 */
export const emitToChatRoom = (io, chatId, event, data) => {
	io.to(`chat_${chatId}`).emit(event, data);
};

/**
 * Helper function to emit to specific user
 */
export const emitToUser = (io, userId, event, data) => {
	io.to(`user_${userId}`).emit(event, data);
};

/**
 * Get online users in a chat room
 */
export const getOnlineUsersInChat = async (chatId) => {
	try {
		// Get all participants in the chat
		const participants = await prisma.chatSession.findUnique({
			where: { id: chatId },
			include: {
				user1: { include: { presence: true } },
				user2: { include: { presence: true } },
				participants: {
					where: { isActive: true },
					include: {
						user: { include: { presence: true } }
					}
				}
			}
		});

		if (!participants) return [];

		const onlineUsers = [];

		// Check direct chat participants
		if (participants.user1?.presence?.isOnline) {
			onlineUsers.push({
				id: participants.user1.id,
				username: participants.user1.username,
				avatarURL: participants.user1.avatarURL
			});
		}

		if (participants.user2?.presence?.isOnline) {
			onlineUsers.push({
				id: participants.user2.id,
				username: participants.user2.username,
				avatarURL: participants.user2.avatarURL
			});
		}

		// Check group chat participants
		participants.participants?.forEach(participant => {
			if (participant.user.presence?.isOnline) {
				onlineUsers.push({
					id: participant.user.id,
					username: participant.user.username,
					avatarURL: participant.user.avatarURL
				});
			}
		});

		return onlineUsers;
	} catch (error) {
		console.error('Error getting online users in chat:', error);
		return [];
	}
};
