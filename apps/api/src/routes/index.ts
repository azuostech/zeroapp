import { Router } from 'express';
import authRoutes from './auth.routes.js';
import transactionRoutes from './transactions.routes.js';
import debtRoutes from './debts.routes.js';
import investmentRoutes from './investments.routes.js';
import goalsRoutes from './goals.routes.js';
import gamificationRoutes from './gamification.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/transactions', transactionRoutes);
router.use('/debts', debtRoutes);
router.use('/investments', investmentRoutes);
router.use('/goals', goalsRoutes);
router.use('/', gamificationRoutes);
router.use('/admin', adminRoutes);

export default router;
