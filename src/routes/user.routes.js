import { Router } from 'express';
import {
	registerUser,
	login,
	logout,
	refreshTokens,
} from '../controllers/user.controller.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

// User Authentication Routes
router.route('/register').post(registerUser);
router.route('/login').post(login);
router.route('/logout').post(authenticateToken, logout);
router.route('/refresh-tokens').post(refreshTokens);

export default router;
