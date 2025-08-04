import { AsyncHandler } from '../../utils/AsyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { AuthService } from '../../services/auth/auth.service.js';

const registerUser = AsyncHandler(async (req, res) => {
	const { username, email, password } = req.body;

	if (!username || !email || !password) {
		return res
			.status(400)
			.json(new ApiResponse(400, 'All fields are required'));
	}

	const result = await AuthService.registerUser({
		username,
		email,
		password,
	});

	// Set refresh token as httpOnly cookie (secure)
	res.cookie('refreshToken', result.refreshToken, {
		httpOnly: true,
		sameSite: 'Strict',
		maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
		secure: process.env.NODE_ENV === 'production',
	});

	// Access token sent in response body only (client handles storage)
	return res
		.status(201)
		.json(
			new ApiResponse(
				201,
				{ user: result.user, accessToken: result.accessToken },
				'User registered successfully'
			)
		);
});

const login = AsyncHandler(async (req, res) => {
	const { email, password } = req.body;
	if (!email || !password) {
		return res
			.status(400)
			.json(new ApiResponse(400, 'Email and password are required'));
	}

	const result = await AuthService.login({ email, password });
	const { userWithoutPassword, accessToken, refreshToken } = result;

	res.cookie('refreshToken', refreshToken, {
		httpOnly: true,
		sameSite: 'Strict',
		maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
		secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
	});

	// Access token sent in response body only (client handles storage)
	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				{ user: userWithoutPassword, accessToken },
				'User logged in successfully'
			)
		);
});

const logout = AsyncHandler(async (req, res) => {
	const userId = req.user.id; // From auth middleware

	await AuthService.logout(userId);

	res.clearCookie('refreshToken');

	return res
		.status(200)
		.json(new ApiResponse(200, null, 'Logged out successfully'));
});

const refreshTokens = AsyncHandler(async (req, res) => {
	const { refreshToken } = req.cookies;

	const result = await AuthService.refreshTokens(refreshToken);

	// Update refresh token cookie
	res.cookie('refreshToken', result.refreshToken, {
		httpOnly: true,
		sameSite: 'Strict',
		maxAge: 7 * 24 * 60 * 60 * 1000,
		secure: process.env.NODE_ENV === 'production',
	});

	// Send new access token in response body (client handles storage)
	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				{ accessToken: result.accessToken },
				'Token refreshed'
			)
		);
});

const sendVerificationEmail = AsyncHandler(async (req, res) => {
	const result = await AuthService.sendVerificationEmail(req.user);

	return res
		.status(200)
		.json(new ApiResponse(200, null, { message: result.message }));
});

const verifyEmail = AsyncHandler(async (req, res) => {
	const { token } = req.params;

	const result = await AuthService.verifyEmail(token);
	if (!result) {
		return res
			.status(400)
			.json(new ApiResponse(400, null, 'Invalid or expired token'));
	}

	return res
		.status(200)
		.json(new ApiResponse(200, result, 'Email verified successfully'));
});

const forgotPassword = AsyncHandler(async (req, res) => {
	const { email } = req.body;

	const result = await AuthService.forgotPassword(email);

	return res
		.status(200)
		.json(new ApiResponse(200, null, { message: result.message }));
});

const resetPassword = AsyncHandler(async (req, res) => {
	const { token } = req.params;
	const { newPassword } = req.body;

	const result = await AuthService.resetPassword(token, newPassword);

	return res.status(200).json(new ApiResponse(200, null, result.message));
});

const changePassword = AsyncHandler(async (req, res) => {
	const { currentPassword, newPassword } = req.body;

	const result = await AuthService.changePassword(
		req.user.id,
		currentPassword,
		newPassword
	);

	return res
		.status(200)
		.json(new ApiResponse(200, null, { message: result.message }));
});

export {
	registerUser,
	login,
	logout,
	refreshTokens,
	sendVerificationEmail,
	verifyEmail,
	forgotPassword,
	resetPassword,
	changePassword,
};
