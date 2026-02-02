import { Router } from 'express';
import { getUsers, updateUserRole, getAuditLogs } from '../controllers/admin.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { verifyAdmin } from '../middleware/admin.middleware.js';

const router = Router();

router.use(verifyToken);
router.use(verifyAdmin);

router.get('/users', getUsers);
router.get('/audit-logs', getAuditLogs);
router.patch('/users/:id/role', updateUserRole);

export default router;
