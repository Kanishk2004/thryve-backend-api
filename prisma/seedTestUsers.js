import { prisma } from '../src/db/index.js';
import bcrypt from 'bcryptjs';

console.log('Starting test users seeding...');

// Sample user data for realistic test users
const testUsers = [
	{
		email: 'alice.johnson@test.com',
		username: 'alice_j',
		fullName: 'Alice Johnson',
		gender: 'FEMALE',
		dateOfBirth: new Date('1992-03-15'),
		bio: 'Living with chronic conditions, looking for support and connection.',
	},
	{
		email: 'bob.smith@test.com',
		username: 'bob_smith',
		fullName: 'Bob Smith',
		gender: 'MALE',
		dateOfBirth: new Date('1988-07-22'),
		bio: 'Advocate for mental health awareness. Happy to help others.',
	},
	{
		email: 'emma.davis@test.com',
		username: 'emma_d',
		fullName: 'Emma Davis',
		gender: 'FEMALE',
		dateOfBirth: new Date('1995-11-08'),
		bio: 'Newly diagnosed, seeking community and understanding.',
	},
	{
		email: 'david.wilson@test.com',
		username: 'david_w',
		fullName: 'David Wilson',
		gender: 'MALE',
		dateOfBirth: new Date('1985-01-30'),
		bio: 'Long-time patient advocate with multiple conditions.',
	},
	{
		email: 'sophia.garcia@test.com',
		username: 'sophia_g',
		fullName: 'Sophia Garcia',
		gender: 'FEMALE',
		dateOfBirth: new Date('1990-09-12'),
		bio: 'Balancing work and health challenges. Love connecting with others.',
	},
	{
		email: 'michael.brown@test.com',
		username: 'michael_b',
		fullName: 'Michael Brown',
		gender: 'MALE',
		dateOfBirth: new Date('1983-04-18'),
		bio: 'Fitness enthusiast adapting to new health realities.',
	},
	{
		email: 'olivia.martinez@test.com',
		username: 'olivia_m',
		fullName: 'Olivia Martinez',
		gender: 'FEMALE',
		dateOfBirth: new Date('1997-06-25'),
		bio: 'Young professional learning to manage health and career.',
	},
	{
		email: 'james.taylor@test.com',
		username: 'james_t',
		fullName: 'James Taylor',
		gender: 'MALE',
		dateOfBirth: new Date('1979-12-03'),
		bio: 'Father of two, sharing experiences and seeking advice.',
	},
	{
		email: 'ava.rodriguez@test.com',
		username: 'ava_r',
		fullName: 'Ava Rodriguez',
		gender: 'FEMALE',
		dateOfBirth: new Date('1993-08-14'),
		bio: 'Artist finding creative ways to cope with chronic illness.',
	},
	{
		email: 'william.lee@test.com',
		username: 'william_l',
		fullName: 'William Lee',
		gender: 'MALE',
		dateOfBirth: new Date('1986-02-09'),
		bio: 'Tech worker with autoimmune conditions, love problem-solving.',
	},
	{
		email: 'mia.clark@test.com',
		username: 'mia_c',
		fullName: 'Mia Clark',
		gender: 'FEMALE',
		dateOfBirth: new Date('1991-10-27'),
		bio: 'Wellness coach who also happens to be a patient.',
	},
	{
		email: 'noah.walker@test.com',
		username: 'noah_w',
		fullName: 'Noah Walker',
		gender: 'MALE',
		dateOfBirth: new Date('1994-05-16'),
		bio: 'Recent graduate navigating health challenges and career.',
	},
];

// Chat styles and availability options
const chatStyles = ['supportive', 'practical', 'casual', 'deep'];
const availabilityHours = ['morning', 'afternoon', 'evening', 'night'];

// Utility functions for random selection
function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElements(array, count) {
	const shuffled = [...array].sort(() => 0.5 - Math.random());
	return shuffled.slice(0, count);
}

function getRandomBoolean(probability = 0.5) {
	return Math.random() < probability;
}

// Generate random user preferences
function generateRandomPreferences() {
	return {
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
	};
}

// Generate random illness preferences
function generateRandomIllnessPreferences(illnesses, count) {
	const selectedIllnesses = getRandomElements(illnesses, count);

	return selectedIllnesses.map((illness, index) => ({
		illnessId: illness.id,
		isMainIllness: index === 0, // First one is main illness
		diagnosedYear: getRandomInt(2015, 2024),
		severityLevel: getRandomInt(1, 5),
		isSeekingSupport: getRandomBoolean(0.8),
		isOfferingSupport: getRandomBoolean(0.4),
	}));
}

async function seedTestUsers() {
	try {
		console.log('🌱 Starting test users seeding...');

		// Get all available illnesses
		const illnesses = await prisma.illness.findMany();
		console.log(`Found ${illnesses.length} illnesses in database`);

		if (illnesses.length === 0) {
			console.log('⚠️  No illnesses found. Running main seed first...');
			// Import and run the main seed
			const { exec } = await import('child_process');
			await new Promise((resolve, reject) => {
				exec('npm run db:seed', (error, stdout, stderr) => {
					if (error) reject(error);
					else {
						console.log(stdout);
						resolve();
					}
				});
			});

			// Fetch illnesses again
			const updatedIllnesses = await prisma.illness.findMany();
			illnesses.push(...updatedIllnesses);
		}

		const hashedPassword = await bcrypt.hash('testpassword123', 10);
		let createdCount = 0;

		for (const userData of testUsers) {
			try {
				// Check if user already exists
				const existingUser = await prisma.user.findUnique({
					where: { email: userData.email },
				});

				if (existingUser) {
					console.log(`⏭️  Skipping ${userData.email} - already exists`);
					continue;
				}

				// Create user
				const user = await prisma.user.create({
					data: {
						...userData,
						password: hashedPassword,
						isEmailVerified: true, // For testing purposes
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
				for (const illnessPref of illnessPreferences) {
					await prisma.userIllnessPreference.create({
						data: {
							userPreferenceId: userPreferences.id,
							...illnessPref,
						},
					});
				}

				createdCount++;
				console.log(
					`✅ Created user: ${userData.fullName} with ${illnessCount} illness preferences`
				);
			} catch (error) {
				console.error(
					`❌ Error creating user ${userData.email}:`,
					error.message
				);
			}
		}

		// Show final statistics
		const totalUsers = await prisma.user.count();
		const totalPreferences = await prisma.userPreferences.count();
		const totalIllnessPrefs = await prisma.userIllnessPreference.count();

		console.log('\n📊 Seeding Summary:');
		console.log(`   - New test users created: ${createdCount}`);
		console.log(`   - Total users in database: ${totalUsers}`);
		console.log(`   - Total user preferences: ${totalPreferences}`);
		console.log(`   - Total illness preferences: ${totalIllnessPrefs}`);

		// Show some sample data for verification
		console.log('\n🔍 Sample user data:');
		const sampleUsers = await prisma.user.findMany({
			take: 3,
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

		sampleUsers.forEach((user) => {
			console.log(`   👤 ${user.fullName} (${user.email})`);
			if (user.preferences) {
				console.log(
					`      - Age range: ${user.preferences.ageRangeMin}-${user.preferences.ageRangeMax}`
				);
				console.log(
					`      - Preferred gender: ${user.preferences.preferredGender}`
				);
				console.log(`      - Illnesses: ${user.preferences.illnesses.length}`);
				user.preferences.illnesses.forEach((illness) => {
					console.log(
						`        * ${illness.illness.name} (${
							illness.isMainIllness ? 'Main' : 'Secondary'
						})`
					);
				});
			}
		});
	} catch (error) {
		console.error('❌ Error seeding test users:', error);
		throw error;
	} finally {
		await prisma.$disconnect();
		console.log('👋 Database disconnected');
	}
}

seedTestUsers()
	.then(() => {
		console.log('🎉 Test users seeding completed!');
		process.exit(0);
	})
	.catch((error) => {
		console.error('💥 Test users seeding failed:', error);
		process.exit(1);
	});
