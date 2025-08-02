import { Router } from 'express';
import healthCheckRouter from './healthCheck.routes.js';
import userRouter from './user.routes.js';
import authRouter from './auth.routes.js';
import adminRouter from './admin.routes.js';
import illnessesRouter from './illnesses.routes.js';

const router = Router();

router.use('/healthcheck', healthCheckRouter);
router.use('/auth', authRouter);
router.use('/user', userRouter);
router.use('/admin', adminRouter);
router.use('/illnesses', illnessesRouter);

export default router;
