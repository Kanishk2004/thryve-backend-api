import { AsyncHandler } from '../utils/AsyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/index.js';
import {
	generateAccessToken,
	generateRefreshToken,
	verifyRefreshToken,
} from '../utils/jwt.js';

// Auth Controllers

const registerUser = AsyncHandler(async (req, res) => {
	//get username, fullName, email, avatar, gender from req.body
	//validate if all fields are provided
	//check if user already exists - email and username must be unique
	//check for avatar OR upload noAvatar.png from backend
	//then upload image file to cloudinary
	//create user object - create entry in db
	//remove password and refreshToken from response
	//check if user created successfully?
	//return user

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
		return res.status(500).json(new ApiResponse(500, 'Error hashing password'));
	}

	const user = await prisma.user.create({
		data: { username, email, password: hashedPassword },
		select: {
			id: true,
			username: true,
			email: true,
			isEmailVerified: true,
			profilePicURL: true,
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

	// Set refresh token as httpOnly cookie
	res.cookie('refreshToken', refreshToken, {
		httpOnly: true,
		sameSite: 'Strict',
		maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
		secure: process.env.NODE_ENV === 'production',
	});

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
	// Implement login logic here
	// Validate email and password
	// Check if user exists
	// Compare password with hashed password
	// Generate JWT token
	// Return user data excluding password and refreshToken

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
			isEmailVerified: true,
			profilePicURL: true,
			role: true,
			createdAt: true,
		},
	});

	if (!user) {
		return res
			.status(401)
			.json(new ApiResponse(401, 'Invalid email or password'));
	}

	const isMatch = await bcrypt.compare(password, user.password);
	if (!isMatch) {
		return res
			.status(401)
			.json(new ApiResponse(401, 'Invalid email or password'));
	}

	// Remove password from user object for response
	const { password: userPassword, ...userWithoutPassword } = user;

	const accessToken = generateAccessToken(userWithoutPassword);
	const refreshToken = generateRefreshToken(userWithoutPassword);
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

	res.cookie('refreshToken', refreshToken, {
		httpOnly: true,
		sameSite: 'Strict',
		maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
		secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
	});

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

	// Update cookie
	res.cookie('refreshToken', newRefreshToken, {
		httpOnly: true,
		sameSite: 'Strict',
		maxAge: 7 * 24 * 60 * 60 * 1000,
		secure: process.env.NODE_ENV === 'production',
	});

	return res
		.status(200)
		.json(
			new ApiResponse(200, { accessToken: newAccessToken }, 'Token refreshed')
		);
});

export { registerUser, login, logout, refreshTokens };
