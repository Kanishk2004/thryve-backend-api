import { Router } from 'express';
import {
	addIllness,
	deleteIllness,
	getAvailableIllnesses,
	updateIllness,
} from '../controllers/illnesses/illnesses.controller.js';
import { authenticateToken } from '../middlewares/auth.js';
import { adminOnly } from '../middlewares/roleAuth.js';

const router = Router();

router.route('/available').get(getAvailableIllnesses);

// admin only routes
router.route('/').post(authenticateToken, adminOnly, addIllness);
router
	.route('/:id')
	.patch(authenticateToken, adminOnly, updateIllness)
	.delete(authenticateToken, adminOnly, deleteIllness);

export default router;
