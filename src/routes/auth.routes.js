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
} from '../controllers/auth/auth.controller.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

// User Authentication Routes
router.route('/register').post(registerUser);
router.route('/login').post(login);
router.route('/logout').post(authenticateToken, logout);
router.route('/refresh-tokens').post(refreshTokens);
router
	.route('/send-verification')
	.post(authenticateToken, sendVerificationEmail);
router.route('/verify-email').get(verifyEmail);
router.route('/forgot-password').post(forgotPassword);
router.route('/reset-password').post(resetPassword);
router.route('/change-password').post(authenticateToken, changePassword);

export default router;
