import { Router } from 'express';

const router = Router();

// illnesses routes
import { getAvailableIllnesses } from '../controllers/illnesses/illnesses.controller.js';

router.get('/available', getAvailableIllnesses);

export default router;
