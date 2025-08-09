import ApiError from '../../utils/ApiError.js';
import { prisma } from '../../db/index.js';

export class PreferenceService {
	static async getPreferences(userId) {
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

		const defaultPreferences = {
			user_id: userId,
			ageRangeMin: 12,
			ageRangeMax: 65,
			preferredGender: 'ANY',
			isOpenToGroupChats: true,
			isOpenToMentoring: false,
			isSeekingMentor: false,
			illnesses: [],
		};

		if (!preferences) {
			// Return default structure
			return {
				preferences: defaultPreferences,
				message: 'Default preferences returned',
			};
		}
		return { preferences, message: 'User preferences retrieved successfully' };
	}

	static async updatePreferences(userId, preferencesData) {
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
		} = preferencesData;

		if (ageRangeMin && ageRangeMax && ageRangeMin > ageRangeMax) {
			throw ApiError.badRequest(
				'Minimum age cannot be greater than maximum age'
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
		if (!result) {
			throw ApiError.notFound('Preferences not found');
		}
		return {
			result,
			message: 'User preferences updated successfully',
		};
	}

	static async getUserIllnessPreferences(userId) {
		const preferences = await prisma.userPreferences.findUnique({
			where: { user_id: userId },
			include: {
				illnesses: {
					include: {
						illness: true,
					},
				},
			},
		});

		if (!preferences) {
			throw ApiError.notFound('User preferences not found');
		}

		return {
			preferences,
			message: 'User illness preferences retrieved successfully',
		};
	}

	static async updateUserIllnessPreferences(userId, data) {
		const {
			illnessPreferences, // Array of illness updates
			addIllnesses, // Array of new illnesses to add
			removeIllnessIds, // Array of illness IDs to remove
		} = data;

		// First, ensure user has preferences record
		let userPreferences = await prisma.userPreferences.findUnique({
			where: { user_id: userId },
		});

		if (!userPreferences) {
			// Create default preferences if none exist
			userPreferences = await prisma.userPreferences.create({
				data: {
					user_id: userId,
					ageRangeMin: 12,
					ageRangeMax: 65,
					preferredGender: 'ANY',
					isOpenToGroupChats: true,
					isOpenToMentoring: false,
					isSeekingMentor: false,
					preferredChatStyle: [],
					availabilityHours: [],
					shareAge: true,
					shareIllnesses: true,
				},
			});
		}

		const result = await prisma.$transaction(async (tx) => {
			// 1. Remove specified illnesses if provided
			if (
				removeIllnessIds &&
				Array.isArray(removeIllnessIds) &&
				removeIllnessIds.length > 0
			) {
				await tx.userIllnessPreference.deleteMany({
					where: {
						userPreferenceId: userPreferences.id,
						illnessId: { in: removeIllnessIds },
					},
				});
			}

			// 2. Add new illnesses if provided
			if (
				addIllnesses &&
				Array.isArray(addIllnesses) &&
				addIllnesses.length > 0
			) {
				// Validate illness IDs exist
				const validIllnesses = await tx.illness.findMany({
					where: { id: { in: addIllnesses.map((i) => i.illnessId) } },
					select: { id: true },
				});

				if (validIllnesses.length !== addIllnesses.length) {
					throw ApiError.badRequest('Some illness IDs are invalid');
				}

				// Check for duplicates
				const existingIllnesses = await tx.userIllnessPreference.findMany({
					where: {
						userPreferenceId: userPreferences.id,
						illnessId: { in: addIllnesses.map((i) => i.illnessId) },
					},
				});

				if (existingIllnesses.length > 0) {
					throw ApiError.badRequest(
						'Some illnesses are already in user preferences'
					);
				}

				await tx.userIllnessPreference.createMany({
					data: addIllnesses.map((illness) => ({
						userPreferenceId: userPreferences.id,
						illnessId: illness.illnessId,
						isMainIllness: illness.isMainIllness ?? false,
						diagnosedYear: illness.diagnosedYear || null,
						severityLevel: illness.severityLevel ?? 3,
						isSeekingSupport: illness.isSeekingSupport ?? true,
						isOfferingSupport: illness.isOfferingSupport ?? false,
					})),
				});
			}

			// 3. Update existing illness preferences if provided
			if (
				illnessPreferences &&
				Array.isArray(illnessPreferences) &&
				illnessPreferences.length > 0
			) {
				for (const illnessUpdate of illnessPreferences) {
					const { illnessId, ...updateData } = illnessUpdate;

					if (!illnessId) {
						throw ApiError.badRequest('illnessId is required for updates');
					}

					// Build update object with only provided fields
					const updateFields = {};
					if (updateData.isMainIllness !== undefined)
						updateFields.isMainIllness = updateData.isMainIllness;
					if (updateData.diagnosedYear !== undefined)
						updateFields.diagnosedYear = updateData.diagnosedYear;
					if (updateData.severityLevel !== undefined)
						updateFields.severityLevel = updateData.severityLevel;
					if (updateData.isSeekingSupport !== undefined)
						updateFields.isSeekingSupport = updateData.isSeekingSupport;
					if (updateData.isOfferingSupport !== undefined)
						updateFields.isOfferingSupport = updateData.isOfferingSupport;

					// Only update if there are fields to update
					if (Object.keys(updateFields).length > 0) {
						const updateResult = await tx.userIllnessPreference.updateMany({
							where: {
								userPreferenceId: userPreferences.id,
								illnessId: illnessId,
							},
							data: updateFields,
						});

						if (updateResult.count === 0) {
							throw ApiError.notFound(
								`Illness preference not found for illness ID: ${illnessId}`
							);
						}
					}
				}
			}

			// Return updated preferences with illnesses
			return await tx.userPreferences.findUnique({
				where: { id: userPreferences.id },
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
						orderBy: [{ isMainIllness: 'desc' }, { createdAt: 'asc' }],
					},
				},
			});
		});

		return {
			result,
			message: 'User illness preferences updated successfully',
		};
	}
}
