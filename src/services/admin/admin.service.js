import prisma from '../../db/index.js';
import { ADMIN_ACTIONS, logAdminAction } from '../../utils/adminActions.js';
import ApiError from '../../utils/ApiError.js';

export class AdminService {
	static async getAllUsers(query) {
		const { page = 1, limit = 10, role, verified, isActive } = query;

		const pageNum = parseInt(page);
		const limitNum = parseInt(limit);
		const skip = (pageNum - 1) * limitNum;

		// Validate pagination
		if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
			return ApiError.badRequest(
				'Invalid pagination parameters. Page must be >= 1 and limit must be between 1 and 100.'
			);
		}

		// Build filter object
		const where = {};
		if (role && ['ADMIN', 'MODERATOR', 'USER'].includes(role.toUpperCase())) {
			where.role = role.toUpperCase();
		}
		if (verified !== undefined) {
			where.isEmailVerified = verified === 'true';
		}
		if (isActive !== undefined) {
			where.isActive = isActive === 'true';
		}

		const users = await prisma.user.findMany({
			where,
			select: {
				id: true,
				username: true,
				email: true,
				role: true,
				isEmailVerified: true,
				createdAt: true,
			},
			orderBy: { createdAt: 'desc' },
			skip,
			take: limitNum,
		});

		// Get total count for pagination
		const totalUsers = await prisma.user.count({ where });
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
			message: `Found ${users.length} of ${totalUsers} users`,
		};
	}

	static async getUserById(userId) {
		if (!userId) {
			return ApiError.badRequest('User ID is required');
		}

		const user = await prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			return ApiError.notFound('User not found');
		}

		return { user, message: 'User retrieved successfully' };
	}

	static async updateUser(userId, data, adminId) {
		const {
			isEmailVerified,
			fullName,
			username,
			gender,
			dateOfBirth,
			isAnonymous,
			bio,
		} = data;

		const updateData = {};

		if (username !== undefined) {
			if (username.length < 3) {
				return ApiError.badRequest('Username must be at least 3 characters');
			}
			// Check if username is already taken by another user
			const existingUser = await prisma.user.findFirst({
				where: {
					id: userId,
					NOT: { id: adminId }, // Exclude current user
				},
			});
			if (existingUser) {
				return ApiError.conflict('Username is already taken');
			}
			updateData.username = username;
		}

		if (bio !== undefined) updateData.bio = bio;
		if (isEmailVerified !== undefined) {
			updateData.isEmailVerified = isEmailVerified;
		}
		if (isAnonymous !== undefined) updateData.isAnonymous = isAnonymous;
		if (fullName !== undefined) updateData.fullName = fullName;
		if (gender !== undefined) updateData.gender = gender;
		if (dateOfBirth !== undefined) {
			updateData.dateOfBirth = new Date(dateOfBirth);
		}

		// Check if there are any fields to update
		if (Object.keys(updateData).length === 0) {
			return ApiError.badRequest('No fields to update');
		}

		const updatedUser = await prisma.user.update({
			where: { id: id },
			data: updateData,
		});

		await logAdminAction(
			adminId,
			ADMIN_ACTIONS.USER_UPDATED,
			id,
			`Updated user details: ${JSON.stringify(updateData)}`
		);

		return { updatedUser, message: 'User updated successfully' };
	}

	static async changeRole(userId, role, adminId) {
		if (
			!role ||
			!['ADMIN', 'DOCTOR', 'USER', 'MENTOR'].includes(role.toUpperCase())
		) {
			return ApiError.badRequest('Invalid role');
		}

		// Update user role
		const updatedUser = await prisma.user.update({
			where: { id: userId },
			data: { role: role.toUpperCase() },
		});

		await logAdminAction(
			adminId,
			ADMIN_ACTIONS.USER_ROLE_CHANGED,
			userId,
			`Updated role to ${role.toUpperCase()}`
		);

		return { updatedUser, message: 'User role updated successfully' };
	}

	static async deleteUser(userId, adminId) {
		// Validate user ID
		if (!userId) {
			return ApiError.badRequest('User ID is required');
		}

		// Prevent admin from deleting themselves
		if (userId === adminId) {
			return ApiError.forbidden('You cannot delete your own account');
		}

		// Check if user exists and get their details
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				username: true,
				email: true,
				role: true,
				avatarPublicId: true,
			},
		});

		if (!user) {
			return ApiError.notFound('User not found');
		}

		// Prevent deletion of other admins (optional - depends on your business logic)
		if (user.role === 'ADMIN') {
			return ApiError.forbidden('Cannot delete another admin account');
		}

		// Delete user's avatar from Cloudinary if it's not the default
		if (user.avatarPublicId && user.avatarPublicId !== 'user_profile.png') {
			await deleteFromCloudinary(user.avatarPublicId).catch((error) => {
				console.error('Failed to delete avatar from Cloudinary:', error);
			});
		}

		// Delete user from database
		await prisma.user.delete({ where: { id: userId } });

		await logAdminAction(
			adminId,
			ADMIN_ACTIONS.USER_DELETED,
			userId,
			`Deleted user: ${user.username} (${user.email})`
		);

		// Log the admin action (optional - for audit purposes)
		console.log(`Admin ${adminId} deleted user ${user.username} (${userId})`);

		return {
			deletedUser: {
				id: user.id,
				username: user.username,
				email: user.email,
			},
			message: 'User deleted successfully',
		};
	}

	static async toggleUserBan(userId, adminId, reason) {
		// Validate user ID
		if (!userId) {
			return ApiError.badRequest('User ID is required');
		}

		// Check if user exists
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				username: true,
				email: true,
				isActive: true,
			},
		});

		if (!user) {
			return ApiError.notFound('User not found');
		}

		// Toggle ban status
		const updatedUser = await prisma.user.update({
			where: { id: userId },
			data: { isActive: !user.isActive },
		});

		await logAdminAction(
			adminId,
			user.isActive ? ADMIN_ACTIONS.USER_BANNED : ADMIN_ACTIONS.USER_UNBANNED,
			id,
			`Reason: ${reason || 'No reason provided'}`
		);
		return {
			updatedUser,
			message: user.isActive
				? 'User banned successfully'
				: 'User unbanned successfully',
		};
	}
}
