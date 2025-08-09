import dotenv from 'dotenv';

// Load environment variables FIRST, before any other imports
dotenv.config();

import { app } from './app.js';
import connectDb from './db/index.js';
import { initializeSystemUsers } from './utils/systemUsers.js';

const PORT = process.env.PORT || 3000;

connectDb()
	.then(async () => {
		// Initialize system users after database connection
		await initializeSystemUsers();
		
		app.listen(PORT, () => {
			console.log(`Server is running on port ${PORT}`);
		});
	})
	.catch((err) => {
		console.error('Error connecting to the database:', err);
	});
