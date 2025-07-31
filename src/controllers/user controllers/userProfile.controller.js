import { AsyncHandler } from '../../utils/AsyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { prisma } from '../../db/index.js';
import {
	deleteFromCloudinary,
	uploadToCloudinary,
} from '../../utils/cloudinary.js';

const getProfile = AsyncHandler(async (req, res) => {
	const userId = req.user.id; // From auth middleware

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
		return res.status(404).json(new ApiResponse(404, 'User not found'));
	}

	return res
		.status(200)
		.json(new ApiResponse(200, user, 'User profile fetched'));
});

const updateAvatar = AsyncHandler(async (req, res) => {
	const userId = req.user.id; // From auth middleware
	// Logic to update profile picture
	const localFilePath = req.file?.path; // Path to the uploaded file
	if (!localFilePath) {
		return res
			.status(400)
			.json(new ApiResponse(400, null, 'No file uploaded or file is invalid'));
	}
	const cloudinaryUrl = await uploadToCloudinary(localFilePath);

	if (!cloudinaryUrl) {
		return res
			.status(500)
			.json(new ApiResponse(500, null, 'Error uploading image to Cloudinary'));
	}

	const oldAvatarId = req.user?.avatarPublicId; // Get old avatar public ID from user object
	if (oldAvatarId) {
		await deleteFromCloudinary(oldAvatarId); // Delete old avatar from Cloudinary
	}

	await prisma.user.update({
		where: { id: userId },
		data: {
			avatarURL: cloudinaryUrl.secure_url,
			avatarPublicId: cloudinaryUrl.public_id,
		},
	});

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				{ avatarURL: cloudinaryUrl.secure_url },
				'Avatar updated successfully'
			)
		);
});

const updateProfile = AsyncHandler(async (req, res) => {
	const userId = req.user.id; // From auth middleware
	const { username, bio, fullName, gender, dateOfBirth } = req.body;

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
				NOT: { id: userId }, // Exclude current user
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

	return res
		.status(200)
		.json(new ApiResponse(200, updatedUser, 'Profile updated successfully'));
});

const deleteAccount = AsyncHandler(async (req, res) => {
	const { id, avatarPublicId } = req.user; // From auth middleware

	if (avatarPublicId !== 'user_profile.png') {
		await deleteFromCloudinary(avatarPublicId);
	}

	await prisma.user.delete({
		where: { id },
	});

	// Clear authentication cookies
	res.clearCookie('refreshToken', {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
	});

	return res
		.status(200)
		.json(new ApiResponse(200, null, 'Account deleted successfully'));
});

const changeUserName = AsyncHandler(async (req, res) => {
	const userId = req.user.id; // From auth middleware
	const { newUsername } = req.body;

	if (!newUsername || newUsername.length < 3) {
		return res.status(400).json(new ApiResponse(400, null, 'Invalid username'));
	}

	// Check if username is already taken by another user
	const existingUser = await prisma.user.findFirst({
		where: {
			username: newUsername,
			NOT: { id: userId }, // Exclude current user
		},
	});
	if (existingUser) {
		return res
			.status(409)
			.json(new ApiResponse(409, null, 'Username already exists'));
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

	return res
		.status(200)
		.json(new ApiResponse(200, updatedUser, 'Username updated successfully'));
});

const togglePrivacyMode = AsyncHandler(async (req, res) => {
	const userId = req.user.id; // From auth middleware

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
		return res.status(404).json(new ApiResponse(404, null, 'User not found'));
	}

	// Toggle privacy mode
	user.isAnonymous = !user.isAnonymous;

	await prisma.user.update({
		where: { id: userId },
		data: { isAnonymous: user.isAnonymous },
	});

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				user,
				`Privacy mode updated to ${user.isAnonymous ? 'Anonymous' : 'Public'}`
			)
		);
});

const getPublicProfile = AsyncHandler(async (req, res) => {
	const { id } = req.params;

	if (!id) {
		return res
			.status(400)
			.json(new ApiResponse(400, null, 'User ID is required'));
	}

	const user = await prisma.user.findUnique({
		where: {
			AND: [{ id }, { isActive: true }],
		},
		select: {
			id: true,
			username: true,
			fullName: true,
			bio: true,
			avatarURL: true,
			isAnonymous: true,
		},
	});

	if (!user) {
		return res.status(404).json(new ApiResponse(404, null, 'User not found'));
	}

	if (user.isAnonymous) {
		return res
			.status(403)
			.json(
				new ApiResponse(
					403,
					null,
					'This profile does not exist or is anonymous'
				)
			);
	}

	return res
		.status(200)
		.json(new ApiResponse(200, user, 'User profile retrieved successfully'));
});

const searchUser = AsyncHandler(async (req, res) => {
	const { query, page = 1, limit = 10 } = req.query;

	// Validate search query
	if (!query || query.trim().length < 2) {
		return res
			.status(400)
			.json(
				new ApiResponse(400, null, 'Search query must be at least 2 characters')
			);
	}

	// Convert pagination params
	const pageNum = parseInt(page);
	const limitNum = parseInt(limit);
	const skip = (pageNum - 1) * limitNum;

	// Validate pagination
	if (pageNum < 1 || limitNum < 1 || limitNum > 50) {
		return res
			.status(400)
			.json(new ApiResponse(400, null, 'Invalid pagination parameters'));
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
			`Found ${users.length} users`
		)
	);
});

export {
	getProfile,
	updateAvatar,
	changeUserName,
	updateProfile,
	deleteAccount,
	togglePrivacyMode,
	getPublicProfile,
	searchUser,
};
