import { ApiResponse } from '../utils/ApiResponse.js';
import { AsyncHandler } from '../utils/AsyncHandler.js';

const authorizeRoles = (...allowedRoles) => {
	return AsyncHandler(async (req, res, next) => {
		// Check if user is authenticated (should be called after authenticateToken)
		if (!req.user) {
			return res
				.status(401)
				.json(new ApiResponse(401, null, 'Authentication required'));
		}

		// Get user role from the authenticated user
		const userRole = req.user.role;

		// Check if user's role is in the allowed roles
		if (!allowedRoles.includes(userRole)) {
			return res
				.status(403)
				.json(
					new ApiResponse(
						403,
						`Access denied. Required role(s): ${allowedRoles.join(
							', '
						)}. Your role: ${userRole}`
					)
				);
		}

		// User has the required role, proceed
		next();
	});
};
const adminOnly = authorizeRoles('ADMIN');
const adminOrModerator = authorizeRoles('ADMIN', 'MODERATOR');

export { authorizeRoles, adminOnly, adminOrModerator };
