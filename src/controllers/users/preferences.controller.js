import { AsyncHandler } from '../../utils/AsyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { PreferenceService } from '../../services/users/preference.service.js';

const getUserPreferences = AsyncHandler(async (req, res) => {
	const userId = req.user.id; // From auth middleware

	const result = await PreferenceService.getPreferences(userId);

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				result.preferences,
				result.message || 'User preferences retrieved successfully'
			)
		);
});

const updateUserPreferences = AsyncHandler(async (req, res) => {
	const userId = req.user.id; // From auth middleware
	const data = req.body;

	const result = await PreferenceService.updatePreferences(userId, data);

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				result.result,
				result.message || 'User preferences updated successfully'
			)
		);
});

export { getUserPreferences, updateUserPreferences };
