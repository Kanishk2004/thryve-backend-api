import { ApiResponse } from '../utils/ApiResponse.js';
import { AsyncHandler } from '../utils/AsyncHandler.js';
import ApiError from '../utils/ApiError.js';

const authorizeRoles = (...allowedRoles) => {
	return AsyncHandler(async (req, res, next) => {
		// Check if user is authenticated (should be called after authenticateToken)
		if (!req.user) {
			throw ApiError.unauthorized('Authentication required');
		}

		// Get user role from the authenticated user
		const userRole = req.user.role;

		// Validate that user has a role
		if (!userRole) {
			throw ApiError.forbidden('User role not found');
		}

		// Check if user's role is in the allowed roles
		if (!allowedRoles.includes(userRole)) {
			throw ApiError.forbidden(
				`Access denied. Required role(s): ${allowedRoles.join(
					', '
				)}. Your role: ${userRole}`
			);
		}

		// User has the required role, proceed
		next();
	});
};
const adminOnly = authorizeRoles('ADMIN');
const adminOrModerator = authorizeRoles('ADMIN', 'MODERATOR');

export { authorizeRoles, adminOnly, adminOrModerator };
