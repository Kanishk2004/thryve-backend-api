import dotenv from 'dotenv';

// Load environment variables FIRST, before any other imports
dotenv.config();

import { createServer } from 'http';
import { app } from './app.js';
import connectDb from './db/index.js';
import { initializeSystemUsers } from './utils/systemUsers.js';
import { initializeSocket } from './socket/index.js';

const PORT = process.env.PORT || 3000;

connectDb()
	.then(async () => {
		// Initialize system users after database connection
		await initializeSystemUsers();
		
		// Create HTTP server
		const server = createServer(app);
		
		// Initialize Socket.IO
		const io = initializeSocket(server);
		console.log('✅ Socket.IO server initialized');
		
		// Make io available globally for use in controllers
		app.set('io', io);
		
		server.listen(PORT, () => {
			console.log(`Server is running on port ${PORT}`);
		});
	})
	.catch((err) => {
		console.error('Error connecting to the database:', err);
	});
