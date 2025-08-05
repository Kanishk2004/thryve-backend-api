import { verifyToken } from '../utils/jwt.js';
import { prisma } from '../db/index.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';

const authenticateToken = async (req, res, next) => {
	try {
		// Get token from Authorization header only (recommended practice)
		const authHeader = req.headers['authorization'];
		const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

		if (!token) {
			throw ApiError.unauthorized('Access token required in Authorization header');
		}

		// Verify the token
		const decoded = verifyToken(token);
		if (!decoded) {
			throw ApiError.unauthorized('Invalid or expired access token');
		}

		// Get fresh user data
		const user = await prisma.user.findUnique({
			where: { id: decoded.id },
			select: {
				id: true,
				email: true,
				username: true,
				role: true,
				isEmailVerified: true,
				avatarURL: true,
				avatarPublicId: true, // Include avatarPublicId if needed
				fullName: true, // Include fullName if it exists in the User model
				isActive: true, // Include isActive status
			},
		});

		if (!user) {
			throw ApiError.notFound('User not found');
		}

		if (!user.isActive) {
			throw ApiError.forbidden('Account has been suspended or deactivated');
		}

		// Attach user to request object
		req.user = user;
		next();
	} catch (error) {
		// Handle ApiError instances
		if (error instanceof ApiError) {
			return res
				.status(error.statusCode)
				.json(new ApiResponse(error.statusCode, null, error.message));
		}
		
		// Handle unexpected errors
		console.error('Auth middleware error:', error);
		return res
			.status(500)
			.json(new ApiResponse(500, null, 'Internal server error during authentication'));
	}
};

export { authenticateToken };
