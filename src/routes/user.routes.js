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
	changePassword,
} from '../controllers/user controllers/userAuth.controller.js';
import { authenticateToken } from '../middlewares/auth.js';
import {
	authorizeRoles,
	adminOnly,
	adminOrModerator,
} from '../middlewares/roleAuth.js';
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
} from '../controllers/user controllers/userProfile.controller.js';
import {
	deleteUserByAdmin,
	getAllUsers,
	getUserById,
	updateUserByAdmin,
} from '../controllers/user controllers/admin.controller.js';

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
router
	.route('/admin/users/:id')
	.get(authenticateToken, adminOnly, getUserById)
	.patch(authenticateToken, adminOnly, updateUserByAdmin)
	.delete(authenticateToken, adminOnly, deleteUserByAdmin);

export default router;
