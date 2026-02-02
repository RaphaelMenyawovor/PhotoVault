import type { Request, Response } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import prisma from '../configs/prisma.js';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import { wideLogger } from '../utils/wideLogger.js';
import { logAction } from '../services/audit.service.js';

export const getUsers = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const search = req.query.search as string || '';
        const skip = (page - 1) * limit;

        const whereClause: Prisma.UserWhereInput = {};
        if (search) {
            whereClause.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { id: { equals: search } }
            ];
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where: whereClause,
                select: {
                    id: true,
                    email: true,
                    role: true,
                    createdAt: true,
                    _count: {
                        select: { photos: true, albums: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.user.count({ where: whereClause }),
        ]);

        return res.json({
            data: users,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        wideLogger.add('err', { msg: 'Failed to fetch users', stack: (error as Error).stack });
        return res.status(500).json({ error: 'Failed to fetch users' });
    }
};

export const updateUserRole = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!role || !['USER', 'ADMIN', 'BANNED'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const currentUser = await prisma.user.findUnique({ where: { id: id as string } });
        if (!currentUser) return res.status(404).json({ error: 'User not found' });

        const updatedUser = await prisma.user.update({
            where: { id: id as string },
            data: { role },
            select: { id: true, email: true, role: true }
        });

        // Audit Log
        if (req.user) {
            await logAction(req.user.userId, 'ROLE_UPDATE', {
                targetUserId: id,
                oldValue: currentUser.role,
                newValue: role
            }, req.ip);
        }

        wideLogger.addCtx('admin_action', 'update_role');
        wideLogger.addCtx('target_user', id);
        wideLogger.addCtx('new_role', role);

        return res.json({ message: 'User role updated', user: updatedUser });
    } catch (error) {
        wideLogger.add('err', { msg: 'Failed to update user role', stack: (error as Error).stack });
        return res.status(500).json({ error: 'Failed to update user role' });
    }
};

export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                include: { admin: { select: { email: true } } },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.auditLog.count(),
        ]);

        return res.json({
            data: logs,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            }
        });
    } catch (error) {
        wideLogger.add('err', { msg: 'Failed to fetch audit logs', stack: (error as Error).stack });
        return res.status(500).json({ error: 'Failed to fetch logs' });
    }
};
