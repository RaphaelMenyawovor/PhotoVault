import type { Response } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import prisma from '../configs/prisma.js';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import { wideLogger } from '../utils/wideLogger.js';

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
                    createdAt: true
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


        const user = await prisma.user.update({
            where: { id: id as string },
            data: { role },
            select: { id: true, email: true, role: true }
        });

        wideLogger.addCtx('admin_action', 'update_role');
        wideLogger.addCtx('target_user', id);
        wideLogger.addCtx('new_role', role);

        return res.json({ message: 'User role updated', user });
    } catch (error) {
        wideLogger.add('err', { msg: 'Failed to update user role', stack: (error as Error).stack });
        return res.status(500).json({ error: 'Failed to update user role' });
    }
};
