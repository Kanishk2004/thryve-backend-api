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

export default router;
