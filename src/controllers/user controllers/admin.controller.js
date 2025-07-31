import { AsyncHandler } from '../../utils/AsyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { prisma } from '../../db/index.js';
import { deleteFromCloudinary } from '../../utils/cloudinary.js';
import { ADMIN_ACTIONS, logAdminAction } from '../../utils/adminActions.js';

const getAllUsers = AsyncHandler(async (req, res) => {
	const { page = 1, limit = 10, role, verified, isActive } = req.query;

	// Convert pagination params
	const pageNum = parseInt(page);
	const limitNum = parseInt(limit);
	const skip = (pageNum - 1) * limitNum;

	// Validate pagination
	if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
		return res
			.status(400)
			.json(new ApiResponse(400, null, 'Invalid pagination parameters'));
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

	return res.status(200).json(
		new ApiResponse(
			200,
			{
				users,
				pagination: {
					currentPage: pageNum,
					totalPages,
					totalUsers,
					hasNext: pageNum < totalPages,
					hasPrev: pageNum > 1,
				},
			},
			`Found ${users.length} of ${totalUsers} users`
		)
	);
});

const getUserById = AsyncHandler(async (req, res) => {
	const { id } = req.params;

	// Validate user ID
	if (!id) {
		return res
			.status(400)
			.json(new ApiResponse(400, null, 'User ID is required'));
	}

	// Fetch user by ID
	const user = await prisma.user.findUnique({
		where: { id },
	});

	if (!user) {
		return res.status(404).json(new ApiResponse(404, null, 'User not found'));
	}

	return res
		.status(200)
		.json(new ApiResponse(200, user, 'User retrieved successfully'));
});

const updateUserByAdmin = AsyncHandler(async (req, res) => {
	const { id } = req.params; // From auth middleware
	const {
		isEmailVerified,
		fullName,
		username,
		gender,
		dateOfBirth,
		isAnonymous,
		bio,
	} = req.body;

	// Build update object dynamically with only provided fields
	const updateData = {};

	if (username !== undefined) {
		if (username.length < 3) {
			return res
				.status(400)
				.json(new ApiResponse(400, 'Username must be at least 3 characters'));
		}
		// Check if username is already taken by another user
		const existingUser = await prisma.user.findFirst({
			where: {
				username,
				NOT: { id: id }, // Exclude current user
			},
		});
		if (existingUser) {
			return res
				.status(409)
				.json(new ApiResponse(409, 'Username already exists'));
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
		where: { id: id },
		data: updateData,
	});

	await logAdminAction(
		req.user.id, // Admin ID from auth middleware
		ADMIN_ACTIONS.USER_UPDATED,
		id,
		`Updated user details: ${JSON.stringify(updateData)}`
	);

	return res
		.status(200)
		.json(new ApiResponse(200, updatedUser, 'Profile updated successfully'));
});

const changeRole = AsyncHandler(async (req, res) => {
	const { id } = req.params; // User ID to change role for
	const { role } = req.body;

	// Validate role
	if (
		!role ||
		!['ADMIN', 'DOCTOR', 'USER', 'MENTOR'].includes(role.toUpperCase())
	) {
		return res.status(400).json(new ApiResponse(400, null, 'Invalid role'));
	}

	// Update user role
	const updatedUser = await prisma.user.update({
		where: { id },
		data: { role: role.toUpperCase() },
	});

	await logAdminAction(
		req.user.id, // Admin ID from auth middleware
		ADMIN_ACTIONS.USER_ROLE_CHANGED,
		id,
		`Updated role to ${role.toUpperCase()}`
	);

	return res
		.status(200)
		.json(new ApiResponse(200, updatedUser, 'User role updated successfully'));
});

const deleteUserByAdmin = AsyncHandler(async (req, res) => {
	const { id } = req.params;
	const adminId = req.user.id; // Admin performing the action

	// Validate user ID
	if (!id) {
		return res
			.status(400)
			.json(new ApiResponse(400, null, 'User ID is required'));
	}

	// Prevent admin from deleting themselves
	if (id === adminId) {
		return res
			.status(403)
			.json(new ApiResponse(403, null, 'You cannot delete your own account'));
	}

	// Check if user exists and get their details
	const user = await prisma.user.findUnique({
		where: { id },
		select: {
			id: true,
			username: true,
			email: true,
			role: true,
			avatarPublicId: true,
		},
	});

	if (!user) {
		return res.status(404).json(new ApiResponse(404, null, 'User not found'));
	}

	// Prevent deletion of other admins (optional - depends on your business logic)
	if (user.role === 'ADMIN') {
		return res
			.status(403)
			.json(new ApiResponse(403, null, 'Cannot delete another admin account'));
	}

	// Delete user's avatar from Cloudinary if it's not the default
	if (user.avatarPublicId && user.avatarPublicId !== 'user_profile.png') {
		await deleteFromCloudinary(user.avatarPublicId).catch((error) => {
			console.error('Failed to delete avatar from Cloudinary:', error);
		});
	}

	// Delete user from database
	await prisma.user.delete({ where: { id } });

	await logAdminAction(
		adminId,
		ADMIN_ACTIONS.USER_DELETED,
		id,
		`Deleted user: ${user.username} (${user.email})`
	);

	// Log the admin action (optional - for audit purposes)
	console.log(
		`Admin ${req.user.username} (${adminId}) deleted user ${user.username} (${id})`
	);

	return res.status(200).json(
		new ApiResponse(
			200,
			{
				deletedUser: {
					id: user.id,
					username: user.username,
					email: user.email,
				},
			},
			'User deleted successfully'
		)
	);
});

const toggleUserBan = AsyncHandler(async (req, res) => {
	const { id } = req.params;
	const adminId = req.user.id; // Admin performing the action
	const { reason } = req.body; // Optional reason for ban/unban

	// Validate user ID
	if (!id) {
		return res
			.status(400)
			.json(new ApiResponse(400, null, 'User ID is required'));
	}

	// Check if user exists
	const user = await prisma.user.findUnique({
		where: { id },
		select: {
			id: true,
			username: true,
			email: true,
			isActive: true,
		},
	});

	if (!user) {
		return res.status(404).json(new ApiResponse(404, null, 'User not found'));
	}

	// Toggle ban status
	const updatedUser = await prisma.user.update({
		where: { id },
		data: { isActive: !user.isActive },
	});

	await logAdminAction(
		adminId,
		user.isActive ? ADMIN_ACTIONS.USER_BANNED : ADMIN_ACTIONS.USER_UNBANNED,
		id,
		`Reason: ${reason || 'No reason provided'}`
	);

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				updatedUser,
				user.isActive
					? 'User banned successfully'
					: 'User unbanned successfully'
			)
		);
});

export {
	getAllUsers,
	getUserById,
	updateUserByAdmin,
	changeRole,
	deleteUserByAdmin,
	toggleUserBan,
};
