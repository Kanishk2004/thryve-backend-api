import { prisma } from '../../db/index.js';
import { emitToChatRoom, emitToUser } from '../index.js';

/**
 * Register chat-related socket event handlers
 */
export const registerChatHandlers = (io, socket) => {
	
	// Join a specific chat room
	socket.on('join_chat', async (data) => {
		try {
			const { chatId } = data;
			
			// Verify user has access to this chat
			const hasAccess = await verifyUserChatAccess(socket.userId, chatId);
			if (!hasAccess) {
				socket.emit('error', { message: 'Access denied to this chat' });
				return;
			}

			socket.join(`chat_${chatId}`);
			
			// Notify others in the chat
			socket.to(`chat_${chatId}`).emit('user_joined_chat', {
				userId: socket.userId,
				username: socket.user.username,
				chatId
			});

			// Send confirmation
			socket.emit('chat_joined', { chatId });
			
		} catch (error) {
			console.error('Error joining chat:', error);
			socket.emit('error', { message: 'Failed to join chat' });
		}
	});

	// Leave a specific chat room
	socket.on('leave_chat', async (data) => {
		try {
			const { chatId } = data;
			
			socket.leave(`chat_${chatId}`);
			
			// Notify others in the chat
			socket.to(`chat_${chatId}`).emit('user_left_chat', {
				userId: socket.userId,
				username: socket.user.username,
				chatId
			});

			socket.emit('chat_left', { chatId });
			
		} catch (error) {
			console.error('Error leaving chat:', error);
			socket.emit('error', { message: 'Failed to leave chat' });
		}
	});

	// Send a message
	socket.on('send_message', async (data) => {
		try {
			const { chatId, content, type = 'TEXT', replyToId, mediaURL, mediaType, mediaSize } = data;
			
			// Verify user has access to this chat
			const hasAccess = await verifyUserChatAccess(socket.userId, chatId);
			if (!hasAccess) {
				socket.emit('error', { message: 'Access denied to this chat' });
				return;
			}

			// Validate message content
			if (!content && !mediaURL) {
				socket.emit('error', { message: 'Message content or media required' });
				return;
			}

			// Create message in database
			const message = await prisma.chatMessage.create({
				data: {
					chatId,
					senderId: socket.userId,
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

			// Emit message to all participants in the chat
			const messageData = {
				id: message.id,
				chatId: message.chatId,
				content: message.content,
				type: message.type,
				mediaURL: message.mediaURL,
				mediaType: message.mediaType,
				mediaSize: message.mediaSize,
				sender: message.sender,
				replyTo: message.replyTo,
				createdAt: message.createdAt,
				deliveredAt: message.deliveredAt
			};

			// Emit to chat room
			emitToChatRoom(io, chatId, 'message_received', messageData);

			// Send delivery confirmation to sender
			socket.emit('message_sent', {
				tempId: data.tempId, // For client-side message correlation
				messageId: message.id,
				deliveredAt: message.deliveredAt
			});

		} catch (error) {
			console.error('Error sending message:', error);
			socket.emit('error', { message: 'Failed to send message' });
		}
	});

	// Edit a message
	socket.on('edit_message', async (data) => {
		try {
			const { messageId, newContent } = data;
			
			// Verify user owns this message
			const message = await prisma.chatMessage.findUnique({
				where: { id: messageId },
				select: { senderId: true, chatId: true, createdAt: true }
			});

			if (!message || message.senderId !== socket.userId) {
				socket.emit('error', { message: 'Cannot edit this message' });
				return;
			}

			// Check if message is too old to edit (e.g., 15 minutes)
			const editTimeLimit = 15 * 60 * 1000; // 15 minutes
			if (Date.now() - new Date(message.createdAt).getTime() > editTimeLimit) {
				socket.emit('error', { message: 'Message too old to edit' });
				return;
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

			// Emit update to chat room
			emitToChatRoom(io, message.chatId, 'message_edited', {
				id: updatedMessage.id,
				content: updatedMessage.content,
				isEdited: updatedMessage.isEdited,
				editedAt: updatedMessage.editedAt
			});

		} catch (error) {
			console.error('Error editing message:', error);
			socket.emit('error', { message: 'Failed to edit message' });
		}
	});

	// Delete a message
	socket.on('delete_message', async (data) => {
		try {
			const { messageId } = data;
			
			// Verify user owns this message or has admin privileges
			const message = await prisma.chatMessage.findUnique({
				where: { id: messageId },
				include: {
					chatSession: {
						include: {
							participants: {
								where: { userId: socket.userId }
							}
						}
					}
				}
			});

			if (!message) {
				socket.emit('error', { message: 'Message not found' });
				return;
			}

			const isOwner = message.senderId === socket.userId;
			const isAdmin = message.chatSession.participants.some(p => 
				p.userId === socket.userId && p.role === 'ADMIN'
			);

			if (!isOwner && !isAdmin) {
				socket.emit('error', { message: 'Cannot delete this message' });
				return;
			}

			// Delete message
			await prisma.chatMessage.delete({
				where: { id: messageId }
			});

			// Emit deletion to chat room
			emitToChatRoom(io, message.chatId, 'message_deleted', {
				messageId,
				deletedBy: socket.userId
			});

		} catch (error) {
			console.error('Error deleting message:', error);
			socket.emit('error', { message: 'Failed to delete message' });
		}
	});

	// Mark messages as read
	socket.on('mark_as_read', async (data) => {
		try {
			const { chatId, messageIds } = data;
			
			// Verify user has access to this chat
			const hasAccess = await verifyUserChatAccess(socket.userId, chatId);
			if (!hasAccess) {
				socket.emit('error', { message: 'Access denied to this chat' });
				return;
			}

			// Mark messages as read
			const readRecords = await Promise.all(
				messageIds.map(messageId =>
					prisma.messageRead.upsert({
						where: {
							messageId_userId: {
								messageId,
								userId: socket.userId
							}
						},
						update: { readAt: new Date() },
						create: {
							messageId,
							userId: socket.userId,
							readAt: new Date()
						}
					})
				)
			);

			// Emit read receipts to chat room
			emitToChatRoom(io, chatId, 'messages_read', {
				messageIds,
				readBy: {
					id: socket.userId,
					username: socket.user.username
				},
				readAt: new Date().toISOString()
			});

		} catch (error) {
			console.error('Error marking messages as read:', error);
			socket.emit('error', { message: 'Failed to mark messages as read' });
		}
	});

	// Create a new chat session
	socket.on('create_chat', async (data) => {
		try {
			const { targetUserId, type = 'DIRECT', name, description } = data;
			
			if (type === 'DIRECT') {
				// Check if direct chat already exists
				const existingChat = await prisma.chatSession.findFirst({
					where: {
						type: 'DIRECT',
						OR: [
							{ user1Id: socket.userId, user2Id: targetUserId },
							{ user1Id: targetUserId, user2Id: socket.userId }
						]
					}
				});

				if (existingChat) {
					socket.emit('chat_created', {
						chatId: existingChat.id,
						isExisting: true
					});
					return;
				}

				// Create new direct chat
				const newChat = await prisma.chatSession.create({
					data: {
						type: 'DIRECT',
						user1Id: socket.userId,
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

				// Join both users to the chat room
				socket.join(`chat_${newChat.id}`);
				
				// Notify target user about new chat
				emitToUser(io, targetUserId, 'chat_created', {
					chatId: newChat.id,
					type: 'DIRECT',
					participant: newChat.user1
				});

				socket.emit('chat_created', {
					chatId: newChat.id,
					type: 'DIRECT',
					participant: newChat.user2,
					isExisting: false
				});

			} else if (type === 'GROUP') {
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
						userId: socket.userId,
						role: 'ADMIN'
					}
				});

				socket.join(`chat_${newChat.id}`);

				socket.emit('chat_created', {
					chatId: newChat.id,
					type: 'GROUP',
					name,
					description,
					isExisting: false
				});
			}

		} catch (error) {
			console.error('Error creating chat:', error);
			socket.emit('error', { message: 'Failed to create chat' });
		}
	});

};

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
