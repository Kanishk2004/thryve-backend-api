import bcrypt from 'bcryptjs';
import { prisma } from '../../db/index.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt.js';

export class AuthService {
	static async registerUser({ username, email, password }) {
		await this.validateUser({ username, email, password });
		await this.checkUserExists({ email, username });
		const hashedPassword = await this.hashPassword(password);
		const user = await this.createUser({
			username,
			email,
			password: hashedPassword,
		});
		const tokens = await this.generateUserTokens(user);
		await this.updateUserTokens(user.id, tokens.refreshToken);
		return {
			user,
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
		};
	}

	static async validateUser({ username, email, password }) {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

		if (!emailRegex.test(email)) {
			throw new Error('Please provide a valid email');
		}

		if (username.length < 3) {
			throw new Error('Username must be at least 3 characters');
		}

		if (password.length < 6) {
			throw new Error('Password must be at least 6 characters');
		}
	}

	static async checkUserExists({ email, username }) {
		const existingUser = await prisma.user.findFirst({
			where: {
				OR: [{ email }, { username }],
			},
		});

		if (existingUser) {
			const field = existingUser.email === email ? 'Email' : 'Username';
			throw new Error(`${field} already exists`);
		}
	}

	static async hashPassword(password) {
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		if (!hashedPassword) {
			throw new Error('Error hashing password');
		}

		return hashedPassword;
	}

	static async createUser({ username, email, password }) {
		return await prisma.user.create({
			data: { username, email, password },
			select: {
				id: true,
				username: true,
				email: true,
				isEmailVerified: true,
				avatarURL: true,
				role: true,
				createdAt: true,
			},
		});
	}

	static async generateUserTokens(user) {
		console.log('Generating tokens for user:', user.id);
		console.log('ACCESS_TOKEN_SECRET exists:', !!process.env.ACCESS_TOKEN_SECRET);
		console.log('REFRESH_TOKEN_SECRET exists:', !!process.env.REFRESH_TOKEN_SECRET);
		
		const accessToken = generateAccessToken(user);
		const refreshToken = generateRefreshToken(user);

		if (!refreshToken) {
			throw new Error('Error generating refresh token');
		}

		return { accessToken, refreshToken };
	}

	static async updateUserTokens(userId, refreshToken) {
		const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

		await prisma.user.update({
			where: { id: userId },
			data: {
				refreshToken,
				refreshTokenExpiry,
			},
		});
	}
}
