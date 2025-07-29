import { AsyncHandler } from '../utils/AsyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/index.js';
import {
	emailVerificationToken,
	generateAccessToken,
	generateRefreshToken,
	resetPasswordToken,
	verifyEmailToken,
	verifyRefreshToken,
	verifyResetPasswordToken,
} from '../utils/jwt.js';
import { sendEmail, sendPasswordResetEmail } from '../utils/sendEmail.js';
import {
	deleteFromCloudinary,
	uploadToCloudinary,
} from '../utils/cloudinary.js';

// Auth Controllers

const registerUser = AsyncHandler(async (req, res) => {
	const { username, email, password } = req.body;

	if (!username || !email || !password) {
		return res
			.status(400)
			.json(new ApiResponse(400, 'All fields are required'));
	}

	// Email validation
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return res
			.status(400)
			.json(new ApiResponse(400, 'Please provide a valid email'));
	}

	// Username validation
	if (username.length < 3) {
		return res
			.status(400)
			.json(new ApiResponse(400, 'Username must be at least 3 characters'));
	}

	const existingUser = await prisma.user.findFirst({
		where: {
			OR: [{ email }, { username }],
		},
	});

	if (existingUser) {
		const field = existingUser.email === email ? 'Email' : 'Username';
		return res
			.status(409)
			.json(new ApiResponse(409, `${field} already exists`));
	}
	if (password.length < 6) {
		return res
			.status(400)
			.json(new ApiResponse(400, 'Password must be at least 6 characters'));
	}

	const salt = await bcrypt.genSalt(10);
	const hashedPassword = await bcrypt.hash(password, salt);

	if (!hashedPassword) {
		return res
			.status(500)
			.json(new ApiResponse(500, null, 'Error hashing password'));
	}

	const user = await prisma.user.create({
		data: { username, email, password: hashedPassword },
		select: {
			id: true,
			username: true,
			email: true,
			isEmailVerified: true,
			avatarURL: true,
			role: true,
			createdAt: true,
			// Exclude password from response
		},
	});

	const accessToken = generateAccessToken(user);
	const refreshToken = generateRefreshToken(user);
	const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

	if (!refreshToken) {
		return res
			.status(500)
			.json(new ApiResponse(500, 'Error generating refresh token'));
	}

	await prisma.user.update({
		where: { id: user.id },
		data: {
			refreshToken,
			refreshTokenExpiry,
		},
	});

	// Set refresh token as httpOnly cookie (secure)
	res.cookie('refreshToken', refreshToken, {
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
				{ user, accessToken },
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

	const user = await prisma.user.findUnique({
		where: { email },
		select: {
			id: true,
			username: true,
			email: true,
			password: true, // Need for comparison, will exclude from response
			fullName: true,
			isEmailVerified: true,
			avatarURL: true,
			role: true,
			createdAt: true,
		},
	});

	if (!user) {
		return res
			.status(401)
			.json(new ApiResponse(401, null, 'Invalid email or password'));
	}

	const isMatch = await bcrypt.compare(password, user.password);
	if (!isMatch) {
		return res
			.status(401)
			.json(new ApiResponse(401, null, 'Invalid email or password'));
	}

	// Remove password from user object for response
	const { password: userPassword, ...userWithoutPassword } = user;

	const accessToken = generateAccessToken(userWithoutPassword);
	const refreshToken = generateRefreshToken(userWithoutPassword);
	const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

	if (!refreshToken) {
		return res
			.status(500)
			.json(new ApiResponse(500, null, 'Error generating refresh token'));
	}

	await prisma.user.update({
		where: { id: user.id },
		data: {
			refreshToken,
			refreshTokenExpiry,
		},
	});

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

	await prisma.user.update({
		where: { id: userId },
		data: {
			refreshToken: null,
			refreshTokenExpiry: null,
		},
	});

	res.clearCookie('refreshToken');

	return res
		.status(200)
		.json(new ApiResponse(200, null, 'Logged out successfully'));
});

const refreshTokens = AsyncHandler(async (req, res) => {
	const { refreshToken } = req.cookies;

	if (!refreshToken) {
		return res
			.status(401)
			.json(new ApiResponse(401, 'Refresh token not found'));
	}

	// Verify JWT first
	const decoded = verifyRefreshToken(refreshToken);
	if (!decoded) {
		return res.status(401).json(new ApiResponse(401, 'Invalid refresh token'));
	}

	// Check if token exists in database and not expired
	const user = await prisma.user.findFirst({
		where: {
			id: decoded.id,
			refreshToken,
			refreshTokenExpiry: { gt: new Date() },
		},
		select: {
			id: true,
			username: true,
			email: true,
			role: true,
		},
	});

	if (!user) {
		return res
			.status(401)
			.json(new ApiResponse(401, 'Invalid or expired refresh token'));
	}

	// Generate new access token
	const newAccessToken = generateAccessToken(user);

	// Rotate refresh token for better security
	const newRefreshToken = generateRefreshToken(user);
	const newRefreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

	await prisma.user.update({
		where: { id: user.id },
		data: {
			refreshToken: newRefreshToken,
			refreshTokenExpiry: newRefreshTokenExpiry,
		},
	});

	// Update refresh token cookie
	res.cookie('refreshToken', newRefreshToken, {
		httpOnly: true,
		sameSite: 'Strict',
		maxAge: 7 * 24 * 60 * 60 * 1000,
		secure: process.env.NODE_ENV === 'production',
	});

	// Send new access token in response body (client handles storage)
	return res
		.status(200)
		.json(
			new ApiResponse(200, { accessToken: newAccessToken }, 'Token refreshed')
		);
});

const sendVerificationEmail = AsyncHandler(async (req, res) => {
	const { email } = req.user;
	const jwtToken = emailVerificationToken(req.user);

	if (!email) {
		return res.status(400).json(new ApiResponse(400, 'Email is required'));
	}

	try {
		const result = await sendEmail(email, jwtToken);
		return res
			.status(200)
			.json(new ApiResponse(200, result, 'Email sent successfully'));
	} catch (error) {
		return res
			.status(500)
			.json(new ApiResponse(500, null, 'Failed to send email'));
	}
});

const verifyEmail = AsyncHandler(async (req, res) => {
	const { token } = req.query;

	if (!token) {
		return res.status(400).json(new ApiResponse(400, 'Token is required'));
	}

	const decoded = verifyEmailToken(token);
	if (!decoded) {
		return res
			.status(400)
			.json(new ApiResponse(400, 'Invalid or expired token'));
	}

	await prisma.user.update({
		where: { id: decoded.id },
		data: { isEmailVerified: true },
	});

	return res
		.status(200)
		.json(new ApiResponse(200, null, 'Email verified successfully'));
});

const forgotPassword = AsyncHandler(async (req, res) => {
	const { email } = req.body;

	if (!email) {
		return res.status(400).json(new ApiResponse(400, 'Email is required'));
	}

	const user = await prisma.user.findUnique({ where: { email } });
	if (!user) {
		return res.status(404).json(new ApiResponse(404, 'User not found'));
	}

	const token = resetPasswordToken(user);
	await sendPasswordResetEmail(email, token);

	return res
		.status(200)
		.json(new ApiResponse(200, null, 'Password reset email sent'));
});

const resetPassword = AsyncHandler(async (req, res) => {
	const { token } = req.query;
	const { newPassword } = req.body;

	if (!token || !newPassword) {
		return res
			.status(400)
			.json(new ApiResponse(400, 'Token and new password are required'));
	}

	const decoded = verifyResetPasswordToken(token);
	if (!decoded) {
		return res
			.status(400)
			.json(new ApiResponse(400, 'Invalid or expired token'));
	}

	const user = await prisma.user.findUnique({ where: { id: decoded.id } });
	if (!user) {
		return res.status(404).json(new ApiResponse(404, 'User not found'));
	}

	const salt = await bcrypt.genSalt(10);
	const hashedPassword = await bcrypt.hash(newPassword, salt);

	if (!hashedPassword) {
		return res
			.status(500)
			.json(new ApiResponse(500, null, 'Error hashing password'));
	}

	await prisma.user.update({
		where: { id: user.id },
		data: { password: hashedPassword },
	});

	return res
		.status(200)
		.json(new ApiResponse(200, null, 'Password reset successfully'));
});

const changePassword = AsyncHandler(async (req, res) => {
	const { currentPassword, newPassword } = req.body;
	const userId = req.user.id; // From auth middleware

	if (!currentPassword || !newPassword) {
		return res
			.status(400)
			.json(new ApiResponse(400, 'Current and new passwords are required'));
	}

	const user = await prisma.user.findUnique({ where: { id: userId } });
	if (!user) {
		return res.status(404).json(new ApiResponse(404, null, 'User not found'));
	}

	const isMatch = await bcrypt.compare(currentPassword, user.password);
	if (!isMatch) {
		return res
			.status(401)
			.json(new ApiResponse(401, null, 'Current password is incorrect'));
	}

	const salt = await bcrypt.genSalt(10);
	const hashedNewPassword = await bcrypt.hash(newPassword, salt);

	if (!hashedNewPassword) {
		return res
			.status(500)
			.json(new ApiResponse(500, null, 'Error hashing new password'));
	}

	await prisma.user.update({
		where: { id: userId },
		data: { password: hashedNewPassword },
	});

	return res
		.status(200)
		.json(new ApiResponse(200, null, 'Password changed successfully'));
});

// User Profile Controllers

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
			profilePicURL: true,
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
	const userId = req.user.id; // From auth middleware

	await deleteFromCloudinary(userId.avatarPublicId);

	await prisma.user.delete({
		where: { id: userId },
	});

	return res
		.status(204)
		.json(new ApiResponse(204, null, 'Account deleted successfully'));
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
	getProfile,
	changePassword,
	updateAvatar,
	updateProfile,
	deleteAccount,
};
