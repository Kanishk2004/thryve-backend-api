import { Router } from 'express';
import {
	registerUser,
	login,
	logout,
	refreshTokens,
	sendVerificationEmail,
	verifyEmail,
} from '../controllers/user.controller.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

// User Authentication Routes
router.route('/auth/register').post(registerUser);
router.route('/auth/login').post(login);
router.route('/auth/logout').post(authenticateToken, logout);
router.route('/auth/refresh-tokens').post(refreshTokens);
router
	.route('/auth/send-verification-email')
	.post(authenticateToken, sendVerificationEmail)
	.patch(authenticateToken, verifyEmail);

export default router;
