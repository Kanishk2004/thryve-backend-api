import { AsyncHandler } from '../../utils/AsyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { prisma } from '../../db/index.js';
import bcrypt from 'bcryptjs';

// Utility functions for random generation
const getRandomInt = (min, max) =>
	Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomElements = (array, count) => {
	const shuffled = [...array].sort(() => 0.5 - Math.random());
	return shuffled.slice(0, count);
};
const getRandomBoolean = (probability = 0.5) => Math.random() < probability;

// Sample data pools
const firstNames = {
	MALE: [
		'Alex',
		'Ben',
		'Chris',
		'David',
		'Ethan',
		'Frank',
		'George',
		'Henry',
		'Ian',
		'Jack',
		'Kevin',
		'Luke',
		'Mark',
		'Nathan',
		'Oscar',
	],
	FEMALE: [
		'Alice',
		'Beth',
		'Carol',
		'Diana',
		'Emma',
		'Fiona',
		'Grace',
		'Hannah',
		'Iris',
		'Julia',
		'Kate',
		'Luna',
		'Mia',
		'Nina',
		'Olivia',
	],
};

const lastNames = [
	'Anderson',
	'Brown',
	'Clark',
	'Davis',
	'Evans',
	'Garcia',
	'Harris',
	'Johnson',
	'Jones',
	'Lee',
	'Martinez',
	'Miller',
	'Rodriguez',
	'Smith',
	'Taylor',
	'Thomas',
	'White',
	'Wilson',
	'Young',
];

const bioTemplates = [
	'Living with chronic conditions, looking for support and connection.',
	'Advocate for health awareness. Happy to help others on their journey.',
	'Newly diagnosed, seeking community and understanding.',
	'Long-time patient with experience to share.',
	'Balancing work and health challenges. Love connecting with others.',
	'Fitness enthusiast adapting to new health realities.',
	'Young professional learning to manage health and career.',
	'Parent sharing experiences and seeking advice.',
	'Creative person finding new ways to cope with challenges.',
	'Tech enthusiast who also happens to be navigating health issues.',
	'Wellness advocate sharing the journey.',
	'Recent graduate figuring out health and life balance.',
];

const chatStyles = ['supportive', 'practical', 'casual', 'deep'];
const availabilityHours = ['morning', 'afternoon', 'evening', 'night'];

const generateRandomUser = () => {
	const gender = ['MALE', 'FEMALE'][getRandomInt(0, 1)];
	const firstName = getRandomElements(firstNames[gender], 1)[0];
	const lastName = getRandomElements(lastNames, 1)[0];
	const username = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${getRandomInt(
		100,
		999
	)}`;
	const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${getRandomInt(
		100,
		999
	)}@testuser.com`;

	return {
		email,
		username,
		fullName: `${firstName} ${lastName}`,
		gender,
		dateOfBirth: new Date(
			getRandomInt(1970, 2005),
			getRandomInt(0, 11),
			getRandomInt(1, 28)
		),
		bio: getRandomElements(bioTemplates, 1)[0],
	};
};

const generateRandomPreferences = () => ({
	ageRangeMin: getRandomInt(18, 25),
	ageRangeMax: getRandomInt(50, 70),
	preferredGender: ['MALE', 'FEMALE', 'ANY'][getRandomInt(0, 2)],
	isOpenToGroupChats: getRandomBoolean(0.8),
	isOpenToMentoring: getRandomBoolean(0.3),
	isSeekingMentor: getRandomBoolean(0.4),
	preferredChatStyle: getRandomElements(chatStyles, getRandomInt(1, 3)),
	availabilityHours: getRandomElements(availabilityHours, getRandomInt(1, 4)),
	shareAge: getRandomBoolean(0.7),
	shareIllnesses: getRandomBoolean(0.9),
});

const generateRandomIllnessPreferences = (illnesses, count) => {
	const selectedIllnesses = getRandomElements(illnesses, count);

	return selectedIllnesses.map((illness, index) => ({
		illnessId: illness.id,
		isMainIllness: index === 0,
		diagnosedYear: getRandomInt(2015, 2024),
		severityLevel: getRandomInt(1, 5),
		isSeekingSupport: getRandomBoolean(0.8),
		isOfferingSupport: getRandomBoolean(0.4),
	}));
};

const generateTestUsers = AsyncHandler(async (req, res) => {
	// Only allow in development
	if (process.env.NODE_ENV === 'production') {
		return res
			.status(403)
			.json(
				new ApiResponse(
					403,
					null,
					'Test user generation not allowed in production'
				)
			);
	}

	const { count = 5 } = req.body;

	if (count > 50) {
		return res
			.status(400)
			.json(
				new ApiResponse(400, null, 'Cannot generate more than 50 users at once')
			);
	}

	try {
		// Get all available illnesses
		const illnesses = await prisma.illness.findMany();

		if (illnesses.length === 0) {
			return res
				.status(400)
				.json(
					new ApiResponse(
						400,
						null,
						'No illnesses found in database. Please seed illnesses first.'
					)
				);
		}

		const hashedPassword = await bcrypt.hash('testpassword123', 10);
		const createdUsers = [];

		for (let i = 0; i < count; i++) {
			const userData = generateRandomUser();

			// Check if email already exists
			const existingUser = await prisma.user.findUnique({
				where: { email: userData.email },
			});

			if (existingUser) {
				// Generate new email if exists
				userData.email = `${userData.username}_${Date.now()}@testuser.com`;
			}

			// Create user
			const user = await prisma.user.create({
				data: {
					...userData,
					password: hashedPassword,
					isEmailVerified: true,
					isActive: true,
				},
			});

			// Generate random preferences
			const preferences = generateRandomPreferences();

			// Create user preferences
			const userPreferences = await prisma.userPreferences.create({
				data: {
					user_id: user.id,
					...preferences,
				},
			});

			// Generate 1-4 random illness preferences
			const illnessCount = getRandomInt(1, 4);
			const illnessPreferences = generateRandomIllnessPreferences(
				illnesses,
				illnessCount
			);

			// Create illness preferences
			const createdIllnessPrefs = [];
			for (const illnessPref of illnessPreferences) {
				const createdPref = await prisma.userIllnessPreference.create({
					data: {
						userPreferenceId: userPreferences.id,
						...illnessPref,
					},
					include: {
						illness: true,
					},
				});
				createdIllnessPrefs.push(createdPref);
			}

			createdUsers.push({
				user: {
					id: user.id,
					email: user.email,
					username: user.username,
					fullName: user.fullName,
					gender: user.gender,
					dateOfBirth: user.dateOfBirth,
					bio: user.bio,
				},
				preferences: {
					...preferences,
					illnesses: createdIllnessPrefs.map((pref) => ({
						illness: pref.illness.name,
						isMainIllness: pref.isMainIllness,
						severityLevel: pref.severityLevel,
						isSeekingSupport: pref.isSeekingSupport,
						isOfferingSupport: pref.isOfferingSupport,
					})),
				},
			});
		}

		return res.status(201).json(
			new ApiResponse(
				201,
				{
					count: createdUsers.length,
					users: createdUsers,
				},
				`Successfully generated ${createdUsers.length} test users`
			)
		);
	} catch (error) {
		console.error('Error generating test users:', error);
		return res
			.status(500)
			.json(new ApiResponse(500, null, 'Error generating test users'));
	}
});

const getTestUsersStats = AsyncHandler(async (req, res) => {
	try {
		const totalUsers = await prisma.user.count();
		const testUsers = await prisma.user.count({
			where: {
				email: {
					endsWith: '@testuser.com',
				},
			},
		});

		const usersWithPreferences = await prisma.user.count({
			where: {
				preferences: {
					isNot: null,
				},
			},
		});

		const totalIllnessPrefs = await prisma.userIllnessPreference.count();

		// Get some sample users for debugging
		const sampleUsers = await prisma.user.findMany({
			take: 5,
			where: {
				email: {
					endsWith: '@testuser.com',
				},
			},
			include: {
				preferences: {
					include: {
						illnesses: {
							include: {
								illness: true,
							},
						},
					},
				},
			},
			orderBy: { createdAt: 'desc' },
		});

		return res.status(200).json(
			new ApiResponse(
				200,
				{
					stats: {
						totalUsers,
						testUsers,
						usersWithPreferences,
						totalIllnessPrefs,
					},
					sampleUsers: sampleUsers.map((user) => ({
						id: user.id,
						fullName: user.fullName,
						email: user.email,
						illnessCount: user.preferences?.illnesses?.length || 0,
						illnesses:
							user.preferences?.illnesses?.map((ip) => ({
								name: ip.illness.name,
								isMain: ip.isMainIllness,
							})) || [],
					})),
				},
				'Test users statistics retrieved'
			)
		);
	} catch (error) {
		console.error('Error getting test users stats:', error);
		return res
			.status(500)
			.json(new ApiResponse(500, null, 'Error retrieving statistics'));
	}
});

const clearTestUsers = AsyncHandler(async (req, res) => {
	// Only allow in development
	if (process.env.NODE_ENV === 'production') {
		return res
			.status(403)
			.json(
				new ApiResponse(
					403,
					null,
					'Test user clearing not allowed in production'
				)
			);
	}

	try {
		// Get test users
		const testUsers = await prisma.user.findMany({
			where: {
				email: {
					endsWith: '@testuser.com',
				},
			},
		});

		// Delete related data first (cascade should handle this, but being explicit)
		await prisma.userIllnessPreference.deleteMany({
			where: {
				userPreference: {
					user: {
						email: {
							endsWith: '@testuser.com',
						},
					},
				},
			},
		});

		await prisma.userPreferences.deleteMany({
			where: {
				user: {
					email: {
						endsWith: '@testuser.com',
					},
				},
			},
		});

		// Delete test users
		const deletedUsers = await prisma.user.deleteMany({
			where: {
				email: {
					endsWith: '@testuser.com',
				},
			},
		});

		return res.status(200).json(
			new ApiResponse(
				200,
				{
					deletedCount: deletedUsers.count,
				},
				`Successfully deleted ${deletedUsers.count} test users`
			)
		);
	} catch (error) {
		console.error('Error clearing test users:', error);
		return res
			.status(500)
			.json(new ApiResponse(500, null, 'Error clearing test users'));
	}
});

export const TestUsersController = {
	generateTestUsers,
	getTestUsersStats,
	clearTestUsers,
};
