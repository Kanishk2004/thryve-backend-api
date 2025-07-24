import { verifyToken } from '../utils/jwt.js';
import { prisma } from '../db/index.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const authenticateToken = async (req, res, next) => {
	try {
		// Get token from Authorization header only (recommended practice)
		const authHeader = req.headers['authorization'];
		const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

		if (!token) {
			return res
				.status(401)
				.json(new ApiResponse(401, 'Access token required in Authorization header'));
		}

		// Verify the token
		const decoded = verifyToken(token);
		if (!decoded) {
			return res
				.status(403)
				.json(new ApiResponse(403, 'Invalid or expired access token'));
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
			},
		});

		if (!user) {
			return res.status(403).json(new ApiResponse(403, 'User not found'));
		}

		// Attach user to request object
		req.user = user;
		next();
	} catch (error) {
		return res.status(403).json(new ApiResponse(403, 'Invalid token'));
	}
};

export { authenticateToken };
