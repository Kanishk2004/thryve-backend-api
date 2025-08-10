import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { adminOnly } from '../middlewares/roleAuth.js';
import {
	changeRole,
	deleteUserByAdmin,
	getAllUsers,
	getRecentAdminActions,
	getUserById,
	toggleUserBan,
	updateUserByAdmin,
} from '../controllers/admin/users.controller.js';
import { TestUsersController } from '../controllers/admin/testUsers.controller.js';

const router = Router();

// Admin Routes
router.route('/users').get(authenticateToken, adminOnly, getAllUsers);
router
	.route('/users/:id')
	.get(authenticateToken, adminOnly, getUserById)
	.patch(authenticateToken, adminOnly, updateUserByAdmin)
	.delete(authenticateToken, adminOnly, deleteUserByAdmin);
router
	.route('/users/:id/change-role')
	.patch(authenticateToken, adminOnly, changeRole);
router
	.route('/users/:id/toggle-ban')
	.patch(authenticateToken, adminOnly, toggleUserBan);
router
	.route('/actions/recent')
	.get(authenticateToken, adminOnly, getRecentAdminActions);

// Test Users Routes (Development only)
router
	.route('/test-users/generate')
	.post(authenticateToken, adminOnly, TestUsersController.generateTestUsers);
router
	.route('/test-users/stats')
	.get(authenticateToken, adminOnly, TestUsersController.getTestUsersStats);
router
	.route('/test-users/clear')
	.delete(authenticateToken, adminOnly, TestUsersController.clearTestUsers);

export default router;
