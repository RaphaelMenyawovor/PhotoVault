import prisma from '../configs/prisma.js';
import { wideLogger } from '../utils/wideLogger.js';

interface AuditDetails {
    targetUserId?: string;
    oldValue?: any;
    newValue?: any;
    reason?: string;
    [key: string]: any;
}

export const logAction = async (adminId: string, action: string, details: AuditDetails, ipAddress?: string) => {
    try {
        await prisma.auditLog.create({
            data: {
                adminId,
                action,
                details: details as any,
                ipAddress: ipAddress ?? null
            }
        });

        wideLogger.addCtx('audit', 'logged');
        wideLogger.addCtx('audit_action', action);
    } catch (error) {
        // Fallback to wide logger if DB log fails
        wideLogger.add('err', {
            msg: 'Failed to create Audit Log',
            action,
            adminId,
            error: (error as Error).message
        });
    }
};
