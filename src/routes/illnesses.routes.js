import { Router } from 'express';

const router = Router();

// illnesses routes
import {
	addIllness,
	deleteIllness,
	getAvailableIllnesses,
	updateIllness,
} from '../controllers/illnesses/illnesses.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { adminOnly } from '../middlewares/roleAuth.js';

router.route('/available').get(getAvailableIllnesses);

// admin only routes
router
	.route('/illness')
	.post(authenticateToken, adminOnly, addIllness)
	.patch(authenticateToken, adminOnly, updateIllness)
	.delete(authenticateToken, adminOnly, deleteIllness);

export default router;
