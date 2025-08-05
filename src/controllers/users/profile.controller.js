import { AsyncHandler } from '../../utils/AsyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ProfileService } from '../../services/users/profile.service.js';

const getProfile = AsyncHandler(async (req, res) => {
	const userId = req.user.id; // From auth middleware

	const result = await ProfileService.getProfile(userId);

	return res
		.status(200)
		.json(new ApiResponse(200, result.user, result.message));
});

const updateAvatar = AsyncHandler(async (req, res) => {
	const userId = req.user.id; // From auth middleware
	const { avatarPublicId } = req.user; // Get old avatar public ID from user object
	const localFilePath = req.file?.path; // Path to the uploaded file

	const result = await ProfileService.updateAvatar(
		userId,
		localFilePath,
		avatarPublicId
	);

	return res
		.status(200)
		.json(
			new ApiResponse(200, { avatarURL: result.user.avatarURL }, result.message)
		);
});

const updateProfile = AsyncHandler(async (req, res) => {
	const userId = req.user.id; // From auth middleware
	const profileData = req.body;

	const result = await ProfileService.updateProfile(userId, profileData);

	return res
		.status(200)
		.json(new ApiResponse(200, result.user, result.message));
});

const deleteAccount = AsyncHandler(async (req, res) => {
	const user = req.user; // From auth middleware

	const result = await ProfileService.deleteAccount(user);

	// Clear authentication cookies
	res.clearCookie('refreshToken', {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
	});

	return res.status(200).json(new ApiResponse(200, null, result.message));
});

const changeUserName = AsyncHandler(async (req, res) => {
	const userId = req.user.id; // From auth middleware
	const { newUsername } = req.body;

	const result = await ProfileService.changeUserName(userId, newUsername);

	return res
		.status(200)
		.json(new ApiResponse(200, result.user, result.message));
});

const togglePrivacyMode = AsyncHandler(async (req, res) => {
	const userId = req.user.id; // From auth middleware

	const result = await ProfileService.togglePrivacyMode(userId);

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				result.user,
				result.message || 'Privacy mode toggled successfully'
			)
		);
});

const getPublicProfile = AsyncHandler(async (req, res) => {
	const { id } = req.params;

	const result = await ProfileService.getPublicProfile(id);

	return res
		.status(200)
		.json(new ApiResponse(200, result.user || null, result.message));
});

const searchUser = AsyncHandler(async (req, res) => {
	const { query, page = 1, limit = 10 } = req.query;

	const result = await ProfileService.searchUser(query, page, limit);

	return res.status(200).json(
		new ApiResponse(
			200,
			{
				users: result.users,
				pagination: result.pagination,
			},
			result.message || 'Search results fetched successfully'
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
