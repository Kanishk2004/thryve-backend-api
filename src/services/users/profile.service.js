import { prisma } from '../../db/index.js';
import ApiError from '../../utils/ApiError.js';
import {
	deleteFromCloudinary,
	uploadToCloudinary,
} from '../../utils/cloudinary.js';

export class ProfileService {
	static async getProfile(userId) {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				email: true,
				isEmailVerified: true,
				username: true,
				role: true,
				bio: true,
				avatarURL: true,
				createdAt: true,
			},
		});

		if (!user) {
			throw ApiError.notFound('User not found');
		}

		return { user, message: 'User profile fetched successfully' };
	}

	static async updateAvatar(userId, localFilePath, avatarPublicId) {
		const cloudinaryUrl = await uploadToCloudinary(localFilePath);

		if (!cloudinaryUrl) {
			throw ApiError.internalServer('Failed to upload avatar');
		}

		if (avatarPublicId) {
			await deleteFromCloudinary(avatarPublicId); // Delete old avatar from Cloudinary
		}

		const user = await prisma.user.update({
			where: { id: userId },
			data: {
				avatarURL: cloudinaryUrl.secure_url,
				avatarPublicId: cloudinaryUrl.public_id,
			},
		});

		return { user, message: 'Avatar updated successfully' };
	}

	static async updateProfile(userId, profileData) {
		const { username, bio, fullName, gender, dateOfBirth } = profileData;

		const updateData = {};

		if (username !== undefined) {
			if (username.length < 3) {
				throw ApiError.badRequest('Username must be at least 3 characters');
			}
			const existingUser = await prisma.user.findFirst({
				where: {
					username,
					NOT: { id: userId },
				},
			});
			if (existingUser) {
				throw ApiError.conflict('Username is already taken');
			}
			updateData.username = username;
		}
		if (bio !== undefined) updateData.bio = bio;
		if (fullName !== undefined) updateData.fullName = fullName;
		if (gender !== undefined) updateData.gender = gender;
		if (dateOfBirth !== undefined) {
			// Convert string to Date if needed
			updateData.dateOfBirth = new Date(dateOfBirth);
		}

		// Check if there are any fields to update
		if (Object.keys(updateData).length === 0) {
			return res
				.status(400)
				.json(new ApiResponse(400, null, 'No fields to update'));
		}

		const updatedUser = await prisma.user.update({
			where: { id: userId },
			data: updateData,
			select: {
				id: true,
				email: true,
				isEmailVerified: true,
				username: true,
				role: true,
				bio: true,
				fullName: true,
				gender: true,
				dateOfBirth: true,
				avatarURL: true,
				createdAt: true,
			},
		});
		return { user: updatedUser, message: 'Profile updated successfully' };
	}

	static async deleteAccount(user) {
		if (!user) {
			throw ApiError.unauthorized('User not authenticated');
		}

		const { id, avatarPublicId } = user;

		if (avatarPublicId !== 'user_profile.png') {
			await deleteFromCloudinary(avatarPublicId);
		}

		await prisma.user.delete({
			where: { id },
		});
		return { message: 'Account deleted successfully' };
	}

	static async changeUserName(userId, newUsername) {
		if (!newUsername || newUsername.length < 3) {
			throw ApiError.badRequest('Invalid username');
		}

		const existingUser = await prisma.user.findFirst({
			where: {
				username: newUsername,
				NOT: { id: userId }, // Exclude current user
			},
		});

		if (existingUser) {
			throw ApiError.conflict('Username already exists');
		}

		const updatedUser = await prisma.user.update({
			where: { id: userId },
			data: { username: newUsername },
			select: {
				id: true,
				email: true,
				isEmailVerified: true,
				username: true,
				role: true,
				bio: true,
				createdAt: true,
			},
		});

		return { user: updatedUser, message: 'Username updated successfully' };
	}

	static async togglePrivacyMode(userId) {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				email: true,
				isEmailVerified: true,
				username: true,
				role: true,
				bio: true,
				isAnonymous: true,
				createdAt: true,
			},
		});

		if (!user) {
			throw ApiError.notFound('User not found');
		}

		// Toggle privacy mode
		user.isAnonymous = !user.isAnonymous;

		await prisma.user.update({
			where: { id: userId },
			data: { isAnonymous: user.isAnonymous },
		});

		return {
			user,
			message: `Privacy mode updated to ${
				user.isAnonymous ? 'Anonymous' : 'Public'
			}`,
		};
	}

	static async getPublicProfile(userId) {
		if (!userId) {
			throw ApiError.badRequest('User ID is required');
		}

		const user = await prisma.user.findUnique({
			where: {
				id: userId,
			},
			select: {
				id: true,
				username: true,
				fullName: true,
				bio: true,
				avatarURL: true,
				isAnonymous: true,
				isActive: true,
			},
		});

		if (!user) {
			throw ApiError.notFound('User not found');
		}

		// Check if user is active
		if (!user.isActive) {
			throw ApiError.notFound('User not found');
		}

		if (user.isAnonymous) {
			return { user: null, message: 'User does not exist or is anonymous' };
		}

		// Remove isActive from the response
		const { isActive, ...userResponse } = user;

		return { user: userResponse, message: 'Public profile fetched successfully' };
	}

	static async searchUser(query, page, limit) {
		if (!query || query.trim().length < 2) {
			throw ApiError.badRequest('Search query must be at least 2 characters');
		}
		const pageNum = parseInt(page) || 1;
		const limitNum = parseInt(limit) || 10;
		const skip = (pageNum - 1) * limitNum;

		if (pageNum < 1 || limitNum < 1 || limitNum > 50) {
			throw ApiError.badRequest('Invalid pagination parameters');
		}
		const searchTerm = query.trim();

		// Search for users (case-insensitive, partial match)
		const users = await prisma.user.findMany({
			where: {
				AND: [
					{ isAnonymous: false }, // Only non-anonymous users
					{ isActive: true }, // Only active users
					{
						OR: [
							{
								username: {
									contains: searchTerm,
									mode: 'insensitive', // Case-insensitive search
								},
							},
							{
								fullName: {
									contains: searchTerm,
									mode: 'insensitive',
								},
							},
						],
					},
				],
			},
			select: {
				id: true,
				username: true,
				fullName: true,
				bio: true,
				avatarURL: true,
				isEmailVerified: true, // Show verified badge
			},
			orderBy: [
				{ isEmailVerified: 'desc' }, // Verified users first
				{ username: 'asc' }, // Then alphabetical
			],
			skip,
			take: limitNum,
		});

		// Get total count for pagination
		const totalUsers = await prisma.user.count({
			where: {
				AND: [
					{ isAnonymous: false },
					{
						OR: [
							{
								username: {
									contains: searchTerm,
									mode: 'insensitive',
								},
							},
							{
								fullName: {
									contains: searchTerm,
									mode: 'insensitive',
								},
							},
						],
					},
				],
			},
		});

		const totalPages = Math.ceil(totalUsers / limitNum);

		return {
			users,
			pagination: {
				currentPage: pageNum,
				totalPages,
				totalUsers,
				hasNext: pageNum < totalPages,
				hasPrev: pageNum > 1,
			},
			message: `Found ${users.length} users matching "${searchTerm}"`,
		};
	}
}
