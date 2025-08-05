import { AsyncHandler } from '../../utils/AsyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { getAdminRecentActions } from '../../utils/adminActions.js';
import { AdminService } from '../../services/admin/admin.service.js';

const getAllUsers = AsyncHandler(async (req, res) => {
	const query = req.query;

	const result = await AdminService.getAllUsers(query);

	return res.status(200).json(
		new ApiResponse(
			200,
			{
				users: result.users,
				pagination: result.pagination,
			},
			result.message || 'Users retrieved successfully'
		)
	);
});

const getUserById = AsyncHandler(async (req, res) => {
	const { id } = req.params;

	const result = await AdminService.getUserById(id);

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				result.user,
				result.message || 'User retrieved successfully'
			)
		);
});

const updateUserByAdmin = AsyncHandler(async (req, res) => {
	const { id } = req.params;
	const data = req.body;

	const result = await AdminService.updateUser(id, data, req.user.id);

	return res
		.status(200)
		.json(new ApiResponse(200, result.updatedUser, result.message));
});

const changeRole = AsyncHandler(async (req, res) => {
	const { id } = req.params; // User ID to change role for
	const { role } = req.body;

	const result = await AdminService.changeRole(id, role, req.user.id);

	return res
		.status(200)
		.json(new ApiResponse(200, result.updatedUser, result.message));
});

const deleteUserByAdmin = AsyncHandler(async (req, res) => {
	const { id } = req.params;
	const adminId = req.user.id; // Admin performing the action

	const result = await AdminService.deleteUser(id, adminId);

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				result.deletedUser,
				result.message || 'User deleted successfully'
			)
		);
});

const toggleUserBan = AsyncHandler(async (req, res) => {
	const { id } = req.params;
	const adminId = req.user.id; // Admin performing the action
	const { reason } = req.body; // Optional reason for ban/unban

	const result = await AdminService.toggleUserBan(id, adminId, reason);

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				result.updatedUser,
				result.message || 'User ban status toggled successfully'
			)
		);
});

const getRecentAdminActions = AsyncHandler(async (req, res) => {
	const adminId = req.user.id; // Admin ID from auth middleware

	const actions = await getAdminRecentActions(adminId, 10); // Get last 10 actions

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				actions,
				'Recent admin actions retrieved successfully'
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
	getRecentAdminActions,
};
