import { isSystemUser } from '../utils/systemUsers.js';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * Middleware to prevent operations on system users
 */
export const preventSystemUserAccess = (req, res, next) => {
	const { id } = req.params;
	const userId = req.user?.id;

	// Check if trying to access system user
	if (id && isSystemUser(id)) {
		return res.status(403).json(
			new ApiResponse(403, null, 'Access to system accounts is not allowed')
		);
	}

	// Check if current user is a system user (shouldn't happen but safety check)
	if (userId && isSystemUser(userId)) {
		return res.status(403).json(
			new ApiResponse(403, null, 'System accounts cannot perform this action')
		);
	}

	next();
};

/**
 * Middleware to filter out system users from public listings
 */
export const filterSystemUsers = (req, res, next) => {
	// Add query filter to exclude system users
	req.query.excludeSystemUsers = true;
	next();
};
