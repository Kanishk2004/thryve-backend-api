import { Router } from 'express';
import {
	registerUser,
	login,
	logout,
	refreshTokens,
	sendVerificationEmail,
	verifyEmail,
	forgotPassword,
	resetPassword,
	getProfile,
	changePassword,
	updateAvatar,
	updateProfile,
	deleteAccount,
	changeUserName,
	togglePrivacyMode,
	getPublicProfile,
	searchUser,
	getAllUsers,
} from '../controllers/user.controller.js';
import { authenticateToken } from '../middlewares/auth.js';
import {
	authorizeRoles,
	adminOnly,
	adminOrModerator,
} from '../middlewares/roleAuth.js';
import { upload } from '../middlewares/multer.middleware.js';

const router = Router();

// User Authentication Routes
router.route('/auth/register').post(registerUser);
router.route('/auth/login').post(login);
router.route('/auth/logout').post(authenticateToken, logout);
router.route('/auth/refresh-tokens').post(refreshTokens);
router
	.route('/auth/email-verification')
	.post(authenticateToken, sendVerificationEmail)
	.patch(authenticateToken, verifyEmail);
router.route('/auth/forgot-password').post(forgotPassword).patch(resetPassword);
router.route('/auth/change-password').post(authenticateToken, changePassword);

// User Profile Routes
router
	.route('/profile')
	.get(authenticateToken, getProfile)
	.patch(authenticateToken, updateProfile)
	.delete(authenticateToken, deleteAccount);
router
	.route('/profile/avatar')
	.post(authenticateToken, upload.single('avatar'), updateAvatar);
router
	.route('/profile/change-username')
	.patch(authenticateToken, changeUserName);
router.route('/profile/privacy').patch(authenticateToken, togglePrivacyMode);
router.route('/profile/:id').get(authenticateToken, getPublicProfile);
router.route('/search').get(authenticateToken, searchUser);

// Admin Routes
router.route('/admin/users').get(authenticateToken, adminOnly, getAllUsers);

export default router;
