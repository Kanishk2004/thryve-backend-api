import bcrypt from 'bcryptjs';
import { prisma } from '../../db/index.js';
import {
	emailVerificationToken,
	generateAccessToken,
	generateRefreshToken,
	resetPasswordToken,
	verifyEmailToken,
	verifyRefreshToken,
	verifyResetPasswordToken,
} from '../../utils/jwt.js';
import { sendPasswordResetEmail } from '../../utils/sendEmail.js';
import ApiError from '../../utils/ApiError.js';

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
			throw ApiError.badRequest('Please provide a valid email');
		}

		if (username.length < 3) {
			throw ApiError.badRequest('Username must be at least 3 characters');
		}

		if (password.length < 6) {
			throw ApiError.badRequest('Password must be at least 6 characters');
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
			throw ApiError.conflict(`${field} already exists`);
		}
	}

	static async hashPassword(password) {
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		if (!hashedPassword) {
			throw ApiError.internalServer('Error hashing password');
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
		const accessToken = generateAccessToken(user);
		const refreshToken = generateRefreshToken(user);

		if (!refreshToken) {
			throw ApiError.internalServer('Error generating refresh token');
		}

		return { accessToken, refreshToken };
	}

	static async updateUserTokens(userId, refreshToken) {
		const refreshTokenExpiry = this.getRefreshTokenExpiry();

		await prisma.user.update({
			where: { id: userId },
			data: {
				refreshToken,
				refreshTokenExpiry,
			},
		});
	}

	static getRefreshTokenExpiry() {
		return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
	}

	static async login({ email, password }) {
		const user = await prisma.user.findUnique({
			where: { email },
			select: {
				id: true,
				username: true,
				email: true,
				password: true, // Need for comparison, will exclude from response
				fullName: true,
				isEmailVerified: true,
				avatarURL: true,
				role: true,
				createdAt: true,
			},
		});

		if (!user) {
			throw ApiError.unauthorized('Invalid email or password');
		}

		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			throw ApiError.unauthorized('Invalid email or password');
		}

		// Remove password from user object for response
		const { password: userPassword, ...userWithoutPassword } = user;

		const tokens = await this.generateUserTokens(user);
		await this.updateUserTokens(user.id, tokens.refreshToken);
		return {
			userWithoutPassword,
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
		};
	}

	static async logout(userId) {
		await prisma.user.update({
			where: { id: userId },
			data: {
				refreshToken: null,
				refreshTokenExpiry: null,
			},
		});
	}

	static async refreshTokens(refreshToken) {
		if (!refreshToken) {
			throw ApiError.badRequest('Refresh token is required');
		}

		// Verify JWT first
		const decoded = verifyRefreshToken(refreshToken);
		if (!decoded) {
			throw ApiError.unauthorized('Invalid refresh token format');
		}

		// Use transaction for atomic token rotation
		try {
			const result = await prisma.$transaction(async (tx) => {
				// Find and validate user in one query
				const user = await tx.user.findFirst({
					where: {
						id: decoded.id,
						refreshToken,
						refreshTokenExpiry: { gt: new Date() },
					},
					select: {
						id: true,
						username: true,
						email: true,
						role: true,
					},
				});

				if (!user) {
					throw ApiError.unauthorized('Invalid or expired refresh token');
				}

				// Generate new tokens
				const newAccessToken = generateAccessToken(user);
				const newRefreshToken = generateRefreshToken(user);

				// Update user with new refresh token atomically
				await tx.user.update({
					where: { id: user.id },
					data: {
						refreshToken: newRefreshToken,
						refreshTokenExpiry: this.getRefreshTokenExpiry(),
					},
				});

				return {
					user,
					accessToken: newAccessToken,
					refreshToken: newRefreshToken,
				};
			});

			return result;
		} catch (error) {
			// Handle transaction errors
			if (error instanceof ApiError) {
				throw error; // Re-throw our custom errors
			}
			throw ApiError.internalServer('Failed to refresh tokens');
		}
	}

	static async sendVerificationEmail(user) {
		const { email } = user;
		const jwtToken = emailVerificationToken(user);

		try {
			await sendEmail(email, jwtToken);
		} catch (error) {
			console.error('Failed to send verification email:', error);
			throw ApiError.internalServer('Failed to send verification email');
		}
		return {
			message: 'Verification email sent successfully',
		};
	}

	static async verifyEmail(token) {
		// Input validation
		if (!token) {
			throw ApiError.badRequest('Email verification token is required');
		}

		// Verify JWT token
		const decoded = verifyEmailToken(token);
		if (!decoded) {
			throw ApiError.unauthorized('Invalid or expired email verification token');
		}

		// Use transaction for atomic operation with validation
		try {
			const result = await prisma.$transaction(async (tx) => {
				// Check if user exists and get current verification status
				const user = await tx.user.findUnique({
					where: { id: decoded.id },
					select: {
						id: true,
						email: true,
						username: true,
						isEmailVerified: true,
					},
				});

				if (!user) {
					throw ApiError.notFound('User not found');
				}

				// Check if email is already verified
				if (user.isEmailVerified) {
					throw ApiError.conflict('Email is already verified');
				}

				// Update user verification status
				const updatedUser = await tx.user.update({
					where: { id: decoded.id },
					data: { isEmailVerified: true },
					select: {
						id: true,
						username: true,
						email: true,
						isEmailVerified: true,
						role: true,
						createdAt: true,
					},
				});

				return updatedUser;
			});

			return {
				user: result,
			};
		} catch (error) {
			// Handle specific errors
			if (error instanceof ApiError) {
				throw error;
			}
			throw ApiError.internalServer('Failed to verify email');
		}
	}

	static async forgotPassword(email) {
		// Reuse email validation logic from validateUser
		if (!email) {
			throw ApiError.badRequest('Email is required');
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			throw ApiError.badRequest('Please provide a valid email');
		}

		try {
			// Check if user exists (but don't expose this information)
			const user = await prisma.user.findUnique({
				where: { email },
				select: {
					id: true,
					email: true,
					username: true,
				},
			});

			// Generate and send reset email only if user exists
			// But always return the same message for security (prevents email enumeration)
			if (user) {
				const resetToken = resetPasswordToken(user);

				try {
					await sendPasswordResetEmail(email, resetToken);
				} catch (emailError) {
					console.error('Failed to send password reset email:', emailError);
					throw ApiError.internalServer('Failed to send password reset email');
				}
			}

			// SECURITY: Always return the same message regardless of whether user exists
			return {
				message:
					'If an account with that email exists, we have sent a password reset link',
			};
		} catch (error) {
			// Handle specific errors while preserving security
			if (error instanceof ApiError) {
				throw error;
			}
			throw ApiError.internalServer('Failed to process password reset request');
		}
	}

	static async resetPassword(token, newPassword) {
		if (!token || !newPassword) {
			throw ApiError.badRequest('Token and new password are required');
		}
		const decoded = verifyResetPasswordToken(token);
		if (!decoded) {
			throw ApiError.unauthorized('Invalid or expired reset password token');
		}

		// Hash new password
		const hashedPassword = await this.hashPassword(newPassword);

		if (!hashedPassword) {
			throw ApiError.internalServer('Error hashing new password');
		}

		// Update user password
		await prisma.user.update({
			where: { id: decoded.id },
			data: { password: hashedPassword },
		});

		return {
			message: 'Password reset successfully',
		};
	}

	static async changePassword(userId, currentPassword, newPassword) {
		if (!currentPassword || !newPassword) {
			throw ApiError.badRequest('Current and new passwords are required');
		}
		if (!userId) {
			throw ApiError.badRequest('User ID not found');
		}
		const user = await prisma.user.findUnique({ where: { id: userId } });
		if (!user) {
			throw ApiError.notFound('User not found');
		}

		const isMatch = await bcrypt.compare(currentPassword, user.password);
		if (!isMatch) {
			throw ApiError.unauthorized('Current password is incorrect');
		}

		const hashedNewPassword = await this.hashPassword(newPassword);

		if (!hashedNewPassword) {
			throw ApiError.internalServer('Error hashing new password');
		}

		await prisma.user.update({
			where: { id: user.id },
			data: { password: hashedNewPassword },
		});

		return {
			message: 'Password changed successfully',
		};
	}
}
