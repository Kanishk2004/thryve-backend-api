import { AsyncHandler } from '../utils/AsyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/index.js';

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
			role: true,
			createdAt: true,
			// Exclude password from response
		},
	});

	return res
		.status(201)
		.json(new ApiResponse(201, user, 'User registered successfully'));
});

export { registerUser };