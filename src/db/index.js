import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

const connectDb = async () => {
	try {
		await prisma.$connect();
		console.log('Connected to Neon DB successfully!');
	} catch (error) {
		console.error('Failed to connect to DB:', error);
		process.exit(1);
	}
};

export default connectDb;
