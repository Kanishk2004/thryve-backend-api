import { AsyncHandler } from '../../utils/AsyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { MatchingService } from '../../services/users/matching.service.js';

/**
 * Find compatible users based on current user's preferences
 */
const findMatches = AsyncHandler(async (req, res) => {
	const userId = req.user.id;
	const { 
		page = 1, 
		limit = 10,
		minAge,
		maxAge,
		gender,
		illnessCategories,
		maxDistance,
		isOnline,
		sortBy = 'compatibility' // compatibility, distance, recent
	} = req.query;

	const filters = {
		page: parseInt(page),
		limit: parseInt(limit),
		minAge: minAge ? parseInt(minAge) : undefined,
		maxAge: maxAge ? parseInt(maxAge) : undefined,
		gender,
		illnessCategories: illnessCategories ? illnessCategories.split(',') : undefined,
		maxDistance: maxDistance ? parseInt(maxDistance) : undefined,
		isOnline: isOnline === 'true',
		sortBy
	};

	const result = await MatchingService.findMatches(userId, filters);

	return res.status(200).json(
		new ApiResponse(
			200,
			result.data,
			result.message
		)
	);
});

/**
 * Get detailed compatibility analysis between current user and specific user
 */
const getCompatibilityScore = AsyncHandler(async (req, res) => {
	const userId = req.user.id;
	const { targetUserId } = req.params;

	const result = await MatchingService.getCompatibilityAnalysis(userId, targetUserId);

	return res.status(200).json(
		new ApiResponse(
			200,
			result.analysis,
			'Compatibility analysis retrieved successfully'
		)
	);
});

/**
 * Get matching recommendations based on user activity and preferences
 */
const getRecommendations = AsyncHandler(async (req, res) => {
	const userId = req.user.id;
	const { type = 'general', limit = 5 } = req.query;

	const result = await MatchingService.getRecommendations(userId, {
		type, // 'general', 'similar_illness', 'mentor', 'mentee'
		limit: parseInt(limit)
	});

	return res.status(200).json(
		new ApiResponse(
			200,
			result.recommendations,
			'Recommendations retrieved successfully'
		)
	);
});

/**
 * Record user interaction for improving matching algorithm
 */
const recordInteraction = AsyncHandler(async (req, res) => {
	const userId = req.user.id;
	const { targetUserId, interactionType, metadata } = req.body;

	// interactionType: 'view', 'like', 'pass', 'message', 'block'
	await MatchingService.recordInteraction(userId, targetUserId, interactionType, metadata);

	return res.status(200).json(
		new ApiResponse(
			200,
			null,
			'Interaction recorded successfully'
		)
	);
});

export {
	findMatches,
	getCompatibilityScore,
	getRecommendations,
	recordInteraction
};
