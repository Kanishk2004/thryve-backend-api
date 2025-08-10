import { emitToChatRoom } from '../index.js';

/**
 * Register typing indicator socket event handlers
 */
export const registerTypingHandlers = (io, socket) => {
	
	// User started typing
	socket.on('typing_start', async (data) => {
		try {
			const { chatId } = data;
			
			// Verify user has access to this chat (basic check)
			// In production, you might want to verify against database
			
			// Emit to all other users in the chat room except sender
			socket.to(`chat_${chatId}`).emit('user_typing', {
				userId: socket.userId,
				username: socket.user.username,
				chatId,
				isTyping: true
			});

		} catch (error) {
			console.error('Error handling typing start:', error);
		}
	});

	// User stopped typing
	socket.on('typing_stop', async (data) => {
		try {
			const { chatId } = data;
			
			// Emit to all other users in the chat room except sender
			socket.to(`chat_${chatId}`).emit('user_stopped_typing', {
				userId: socket.userId,
				username: socket.user.username,
				chatId,
				isTyping: false
			});

		} catch (error) {
			console.error('Error handling typing stop:', error);
		}
	});

	// Typing indicator with timeout (more advanced)
	socket.on('typing_indicator', async (data) => {
		try {
			const { chatId, isTyping } = data;
			
			// Clear any existing typing timeout for this user/chat
			const timeoutKey = `${socket.userId}_${chatId}`;
			if (socket.typingTimeouts && socket.typingTimeouts[timeoutKey]) {
				clearTimeout(socket.typingTimeouts[timeoutKey]);
				delete socket.typingTimeouts[timeoutKey];
			}

			if (isTyping) {
				// User started typing
				socket.to(`chat_${chatId}`).emit('user_typing', {
					userId: socket.userId,
					username: socket.user.username,
					avatarURL: socket.user.avatarURL,
					chatId,
					isTyping: true
				});

				// Set timeout to automatically stop typing indicator after 3 seconds
				if (!socket.typingTimeouts) {
					socket.typingTimeouts = {};
				}

				socket.typingTimeouts[timeoutKey] = setTimeout(() => {
					socket.to(`chat_${chatId}`).emit('user_stopped_typing', {
						userId: socket.userId,
						username: socket.user.username,
						chatId,
						isTyping: false
					});
					delete socket.typingTimeouts[timeoutKey];
				}, 3000); // 3 seconds timeout

			} else {
				// User explicitly stopped typing
				socket.to(`chat_${chatId}`).emit('user_stopped_typing', {
					userId: socket.userId,
					username: socket.user.username,
					chatId,
					isTyping: false
				});
			}

		} catch (error) {
			console.error('Error handling typing indicator:', error);
		}
	});

	// Clear all typing indicators when user disconnects
	socket.on('disconnect', () => {
		try {
			// Clear all typing timeouts
			if (socket.typingTimeouts) {
				Object.values(socket.typingTimeouts).forEach(timeout => {
					clearTimeout(timeout);
				});
				socket.typingTimeouts = {};
			}

			// You could also emit to all relevant chat rooms that this user stopped typing
			// but it's handled by the presence system when user goes offline

		} catch (error) {
			console.error('Error clearing typing indicators on disconnect:', error);
		}
	});

};
