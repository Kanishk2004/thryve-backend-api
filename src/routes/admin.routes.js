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

export default router;
