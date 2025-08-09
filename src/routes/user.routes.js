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

export default router;
