import { prisma } from '../../db/index.js';
import ApiError from '../../utils/ApiError.js';

export class MatchingService {
	/**
	 * Find compatible users based on preferences and filters
	 */
	static async findMatches(userId, filters = {}) {
		const { page = 1, limit = 10, sortBy = 'compatibility' } = filters;
		const skip = (page - 1) * limit;

		// Get current user with preferences
		const currentUser = await this.getUserWithPreferences(userId);
		
		if (!currentUser?.preferences) {
			throw ApiError.badRequest('Please set your preferences first to find matches');
		}

		// Build matching criteria
		const matchingCriteria = this.buildMatchingCriteria(currentUser, filters);
		
		// Find potential matches
		const potentialMatches = await prisma.user.findMany({
			where: matchingCriteria,
			select: {
				id: true,
				username: true,
				fullName: true,
				bio: true,
				avatarURL: true,
				gender: true,
				dateOfBirth: true,
				isEmailVerified: true,
				createdAt: true,
				preferences: {
					include: {
						illnesses: {
							include: {
								illness: {
									select: {
										id: true,
										name: true,
										category: true
									}
								}
							}
						}
					}
				}
			},
			skip,
			take: limit
		});

		// Calculate compatibility scores
		const matchesWithScores = this.calculateCompatibilityScores(currentUser, potentialMatches);

		// Sort matches
		const sortedMatches = this.sortMatches(matchesWithScores, sortBy);

		// Get total count for pagination
		const totalCount = await prisma.user.count({ where: matchingCriteria });
		const totalPages = Math.ceil(totalCount / limit);

		return {
			data: {
				matches: sortedMatches,
				pagination: {
					currentPage: page,
					totalPages,
					totalMatches: totalCount,
					hasNext: page < totalPages,
					hasPrev: page > 1
				},
				matchingCriteria: this.sanitizeMatchingCriteria(matchingCriteria)
			},
			message: `Found ${sortedMatches.length} potential matches`
		};
	}

	/**
	 * Get user with full preferences
	 */
	static async getUserWithPreferences(userId) {
		return await prisma.user.findUnique({
			where: { id: userId },
			include: {
				preferences: {
					include: {
						illnesses: {
							include: {
								illness: true
							}
						}
					}
				}
			}
		});
	}

	/**
	 * Build database query criteria for matching
	 */
	static buildMatchingCriteria(currentUser, filters) {
		const userPrefs = currentUser.preferences;
		const currentUserAge = this.calculateAge(currentUser.dateOfBirth);

		const criteria = {
			AND: [
				{ id: { not: currentUser.id } }, // Exclude self
				{ isActive: true },
				{ isAnonymous: false },
				
				// Age filtering based on user's preferences
				...(currentUserAge ? this.buildAgeFilter(userPrefs, filters) : []),
				
				// Gender preference filtering
				...(userPrefs.preferredGender !== 'ANY' ? this.buildGenderFilter(userPrefs, filters) : []),
				
				// Illness overlap filtering
				...(userPrefs.illnesses.length > 0 ? this.buildIllnessFilter(userPrefs, filters) : []),
				
				// Additional filters from request
				...(filters.isOnline ? [{ /* Add online status when implemented */ }] : [])
			]
		};

		return criteria;
	}

	/**
	 * Build age filtering criteria
	 */
	static buildAgeFilter(userPrefs, filters) {
		const ageFilters = [];
		
		// Use user preferences or override filters
		const minAge = filters.minAge || userPrefs.ageRangeMin;
		const maxAge = filters.maxAge || userPrefs.ageRangeMax;

		if (minAge || maxAge) {
			const ageFilter = { OR: [{ dateOfBirth: null }] }; // Include users without DOB
			
			if (minAge && maxAge) {
				ageFilter.OR.push({
					AND: [
						{ dateOfBirth: { lte: new Date(new Date().setFullYear(new Date().getFullYear() - minAge)) } },
						{ dateOfBirth: { gte: new Date(new Date().setFullYear(new Date().getFullYear() - maxAge)) } }
					]
				});
			}
			
			ageFilters.push(ageFilter);
		}

		return ageFilters;
	}

	/**
	 * Build gender filtering criteria
	 */
	static buildGenderFilter(userPrefs, filters) {
		const targetGender = filters.gender || userPrefs.preferredGender;
		
		if (targetGender && targetGender !== 'ANY') {
			return [{
				OR: [
					{ gender: null },
					{ gender: targetGender }
				]
			}];
		}
		
		return [];
	}

	/**
	 * Build illness overlap filtering
	 */
	static buildIllnessFilter(userPrefs, filters) {
		let targetCategories = filters.illnessCategories;
		
		if (!targetCategories) {
			// Use user's illness categories
			targetCategories = [...new Set(userPrefs.illnesses.map(ui => ui.illness.category))];
		}

		if (targetCategories.length > 0) {
			return [{
				preferences: {
					illnesses: {
						some: {
							illness: {
								category: { in: targetCategories }
							}
						}
					}
				}
			}];
		}

		return [];
	}

	/**
	 * Calculate compatibility scores for potential matches
	 */
	static calculateCompatibilityScores(currentUser, potentialMatches) {
		return potentialMatches.map(user => {
			const compatibility = this.calculateCompatibility(currentUser, user);
			
			return {
				...user,
				compatibilityScore: compatibility.score,
				matchReasons: compatibility.reasons,
				sharedInterests: compatibility.sharedInterests,
				// Remove sensitive preference data
				preferences: undefined
			};
		});
	}

	/**
	 * Calculate detailed compatibility between two users
	 */
	static calculateCompatibility(user1, user2) {
		let score = 0;
		const reasons = [];
		const sharedInterests = [];

		// Illness compatibility (40% of total score)
		if (user1.preferences?.illnesses && user2.preferences?.illnesses) {
			const commonIllnesses = this.findCommonIllnesses(user1.preferences.illnesses, user2.preferences.illnesses);
			const illnessScore = commonIllnesses.length * 20;
			score += Math.min(illnessScore, 40);

			if (commonIllnesses.length > 0) {
				reasons.push(`${commonIllnesses.length} shared health condition${commonIllnesses.length > 1 ? 's' : ''}`);
				sharedInterests.push(...commonIllnesses.map(illness => illness.name));
			}
		}

		// Age compatibility (20% of total score)
		const ageCompatibility = this.calculateAgeCompatibility(user1, user2);
		score += ageCompatibility.score;
		if (ageCompatibility.compatible) {
			reasons.push('Age compatible');
		}

		// Communication style compatibility (20% of total score)
		const communicationScore = this.calculateCommunicationCompatibility(user1.preferences, user2.preferences);
		score += communicationScore;

		// Verification and activity bonuses (20% of total score)
		if (user2.isEmailVerified) {
			score += 10;
			reasons.push('Verified account');
		}

		// Mentoring compatibility
		if (user1.preferences?.isSeekingMentor && user2.preferences?.isOpenToMentoring) {
			score += 15;
			reasons.push('Potential mentor match');
		}

		return {
			score: Math.min(Math.round(score), 100),
			reasons,
			sharedInterests
		};
	}

	/**
	 * Find common illnesses between two users
	 */
	static findCommonIllnesses(illnesses1, illnesses2) {
		const commonIllnesses = [];
		
		illnesses1.forEach(ui1 => {
			const match = illnesses2.find(ui2 => ui2.illnessId === ui1.illnessId);
			if (match) {
				commonIllnesses.push(ui1.illness);
			}
		});

		return commonIllnesses;
	}

	/**
	 * Calculate age compatibility score
	 */
	static calculateAgeCompatibility(user1, user2) {
		if (!user1.dateOfBirth || !user2.dateOfBirth || !user1.preferences) {
			return { score: 5, compatible: true }; // Neutral score for unknown ages
		}

		const user2Age = this.calculateAge(user2.dateOfBirth);
		const { ageRangeMin, ageRangeMax } = user1.preferences;

		if (user2Age >= ageRangeMin && user2Age <= ageRangeMax) {
			return { score: 20, compatible: true };
		}

		// Partial score for close ages
		const distance = Math.min(
			Math.abs(user2Age - ageRangeMin),
			Math.abs(user2Age - ageRangeMax)
		);

		if (distance <= 5) {
			return { score: 10, compatible: true };
		}

		return { score: 0, compatible: false };
	}

	/**
	 * Calculate communication style compatibility
	 */
	static calculateCommunicationCompatibility(prefs1, prefs2) {
		if (!prefs1 || !prefs2) return 0;

		let score = 0;

		// Group chat compatibility
		if (prefs1.isOpenToGroupChats === prefs2.isOpenToGroupChats) {
			score += 10;
		}

		// Chat style overlap
		if (prefs1.preferredChatStyle && prefs2.preferredChatStyle) {
			const commonStyles = prefs1.preferredChatStyle.filter(style => 
				prefs2.preferredChatStyle.includes(style)
			);
			score += commonStyles.length * 2;
		}

		return Math.min(score, 20);
	}

	/**
	 * Sort matches based on criteria
	 */
	static sortMatches(matches, sortBy) {
		switch (sortBy) {
			case 'compatibility':
				return matches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
			case 'recent':
				return matches.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
			case 'distance':
				// Implement when location data is available
				return matches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
			default:
				return matches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
		}
	}

	/**
	 * Calculate age from date of birth
	 */
	static calculateAge(dateOfBirth) {
		if (!dateOfBirth) return null;
		
		const today = new Date();
		const birthDate = new Date(dateOfBirth);
		let age = today.getFullYear() - birthDate.getFullYear();
		const monthDiff = today.getMonth() - birthDate.getMonth();
		
		if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
			age--;
		}
		
		return age;
	}

	/**
	 * Remove sensitive data from matching criteria for response
	 */
	static sanitizeMatchingCriteria(criteria) {
		// Return a simplified version for debugging/transparency
		return {
			hasAgeFilter: criteria.AND.some(condition => condition.dateOfBirth),
			hasGenderFilter: criteria.AND.some(condition => condition.gender),
			hasIllnessFilter: criteria.AND.some(condition => condition.preferences),
			excludesSelf: true,
			onlyActiveUsers: true
		};
	}

	/**
	 * Get detailed compatibility analysis between two specific users
	 */
	static async getCompatibilityAnalysis(userId, targetUserId) {
		const [user1, user2] = await Promise.all([
			this.getUserWithPreferences(userId),
			this.getUserWithPreferences(targetUserId)
		]);

		if (!user1 || !user2) {
			throw ApiError.notFound('User not found');
		}

		const compatibility = this.calculateCompatibility(user1, user2);

		return {
			analysis: {
				compatibilityScore: compatibility.score,
				matchReasons: compatibility.reasons,
				sharedInterests: compatibility.sharedInterests,
				targetUser: {
					id: user2.id,
					username: user2.username,
					fullName: user2.fullName,
					avatarURL: user2.avatarURL,
					isEmailVerified: user2.isEmailVerified
				}
			}
		};
	}

	/**
	 * Get personalized recommendations
	 */
	static async getRecommendations(userId, options = {}) {
		const { type = 'general', limit = 5 } = options;

		// For now, return top matches with different criteria
		// This can be enhanced with ML algorithms later
		const matches = await this.findMatches(userId, { limit });

		return {
			recommendations: matches.data.matches.slice(0, limit),
			type,
			generatedAt: new Date().toISOString()
		};
	}

	/**
	 * Record user interaction for algorithm improvement
	 */
	static async recordInteraction(userId, targetUserId, interactionType, metadata = {}) {
		// Store interaction data for future ML improvements
		// This could be in a separate UserInteraction model
		console.log(`Interaction recorded: ${userId} -> ${targetUserId} (${interactionType})`);
		
		// For now, just log. Later implement:
		// await prisma.userInteraction.create({
		//     data: { userId, targetUserId, interactionType, metadata }
		// });
	}
}
