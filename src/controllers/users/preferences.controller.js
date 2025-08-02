import { AsyncHandler } from '../../utils/AsyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { prisma } from '../../db/index.js';

const getUserPreferences = AsyncHandler(async (req, res) => {
	const userId = req.user.id; // From auth middleware

	const preferences = await prisma.userPreferences.findUnique({
		where: { user_id: userId },
		include: {
			illnesses: {
				include: {
					illness: {
						select: {
							id: true,
							name: true,
							category: true,
						},
					},
				},
			},
		},
	});

	if (!preferences) {
		// Return default structure
		return res.status(200).json(
			new ApiResponse(
				200,
				{
					user_id: userId,
					ageRangeMin: 12,
					ageRangeMax: 65,
					preferredGender: 'ANY',
					isOpenToGroupChats: true,
					isOpenToMentoring: false,
					isSeekingMentor: false,
					illnesses: [],
				},
				'Default preferences returned'
			)
		);
	}
	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				preferences,
				'User preferences retrieved successfully'
			)
		);
});

const updateUserPreferences = AsyncHandler(async (req, res) => {
	const userId = req.user.id; // From auth middleware
	const {
		ageRangeMin,
		ageRangeMax,
		preferredGender,
		isOpenToGroupChats,
		isOpenToMentoring,
		isSeekingMentor,
		preferredChatStyle,
		availabilityHours,
		shareAge,
		shareIllnesses,
		illnesses, // Array of { illnessId, isMainIllness, diagnosedYear, severityLevel, isSeekingSupport, isOfferingSupport }
	} = req.body;

	// Validation
	if (ageRangeMin && ageRangeMax && ageRangeMin > ageRangeMax) {
		return res
			.status(400)
			.json(
				new ApiResponse(
					400,
					null,
					'Minimum age cannot be greater than maximum age'
				)
			);
	}

	// Use transaction for atomic updates
	const result = await prisma.$transaction(async (tx) => {
		// Upsert main preferences
		const preferences = await tx.userPreferences.upsert({
			where: { user_id: userId },
			update: {
				...(ageRangeMin !== undefined && { ageRangeMin }),
				...(ageRangeMax !== undefined && { ageRangeMax }),
				...(preferredGender !== undefined && { preferredGender }),
				...(isOpenToGroupChats !== undefined && { isOpenToGroupChats }),
				...(isOpenToMentoring !== undefined && { isOpenToMentoring }),
				...(isSeekingMentor !== undefined && { isSeekingMentor }),
				...(preferredChatStyle !== undefined && { preferredChatStyle }),
				...(availabilityHours !== undefined && { availabilityHours }),
				...(shareAge !== undefined && { shareAge }),
				...(shareIllnesses !== undefined && { shareIllnesses }),
			},
			create: {
				user_id: userId,
				ageRangeMin: ageRangeMin || 12,
				ageRangeMax: ageRangeMax || 65,
				preferredGender: preferredGender || 'ANY',
				isOpenToGroupChats: isOpenToGroupChats ?? true,
				isOpenToMentoring: isOpenToMentoring ?? false,
				isSeekingMentor: isSeekingMentor ?? false,
				preferredChatStyle: preferredChatStyle || [],
				availabilityHours: availabilityHours || [],
				shareAge: shareAge ?? true,
				shareIllnesses: shareIllnesses ?? true,
			},
		});

		// Update illness preferences if provided
		if (illnesses && Array.isArray(illnesses)) {
			// Delete existing illness preferences
			await tx.userIllnessPreference.deleteMany({
				where: { userPreferenceId: preferences.id },
			});

			// Create new illness preferences
			if (illnesses.length > 0) {
				await tx.userIllnessPreference.createMany({
					data: illnesses.map((illness) => ({
						userPreferenceId: preferences.id,
						illnessId: illness.illnessId,
						isMainIllness: illness.isMainIllness || false,
						diagnosedYear: illness.diagnosedYear,
						severityLevel: illness.severityLevel || 3,
						isSeekingSupport: illness.isSeekingSupport ?? true,
						isOfferingSupport: illness.isOfferingSupport ?? false,
					})),
				});
			}
		}

		// Return complete preferences
		return await tx.userPreferences.findUnique({
			where: { id: preferences.id },
			include: {
				illnesses: {
					include: {
						illness: true,
					},
				},
			},
		});
	});

	return res
		.status(200)
		.json(
			new ApiResponse(200, result, 'User preferences updated successfully')
		);
});

export { getUserPreferences, updateUserPreferences };
