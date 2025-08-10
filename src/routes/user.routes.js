import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { upload } from '../middlewares/multer.middleware.js';
import {
	changeUserName,
	deleteAccount,
	getProfile,
	getPublicProfile,
	searchUser,
	togglePrivacyMode,
	updateAvatar,
	updateProfile,
} from '../controllers/users/profile.controller.js';
import {
	getUserIllnessPreferences,
	getUserPreferences,
	updateUserIllnessPreferences,
	updateUserPreferences,
} from '../controllers/users/preferences.controller.js';
import {
	findMatches,
	getCompatibilityScore,
	getRecommendations,
	recordInteraction,
} from '../controllers/users/matching.controller.js';

const router = Router();

// User Profile Routes
router
	.route('/profile')
	.get(authenticateToken, getProfile)
	.patch(authenticateToken, updateProfile)
	.delete(authenticateToken, deleteAccount);
router
	.route('/profile/avatar')
	.post(authenticateToken, upload.single('avatar'), updateAvatar);
router.route('/profile/username').patch(authenticateToken, changeUserName);
router.route('/profile/privacy').patch(authenticateToken, togglePrivacyMode);
router.route('/profile/:id').get(authenticateToken, getPublicProfile);
router.route('/search').get(authenticateToken, searchUser);

// user preferences routes
router
	.route('/preferences')
	.get(authenticateToken, getUserPreferences)
	.patch(authenticateToken, updateUserPreferences);
router
	.route('/preferences/illnesses')
	.get(authenticateToken, getUserIllnessPreferences)
	.patch(authenticateToken, updateUserIllnessPreferences);

// User Matching Routes
router.route('/matches').get(authenticateToken, findMatches);
router.route('/matches/compatibility/:targetUserId').get(authenticateToken, getCompatibilityScore);
router.route('/recommendations').get(authenticateToken, getRecommendations);
router.route('/interactions').post(authenticateToken, recordInteraction);

export default router;
