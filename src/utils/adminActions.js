import { prisma } from '../db/index.js';

export const logAdminAction = async (
	adminId,
	action,
	targetId,
	notes = null
) => {
	try {
		await prisma.adminAction.create({
			data: {
				admin_id: adminId,
				action,
				target_id: targetId,
				notes,
			},
		});
	} catch (error) {
		console.error('Failed to log admin action:', error);
		// Don't throw error - logging shouldn't break main functionality
	}
};

export const ADMIN_ACTIONS = {
	// User Management
	USER_BANNED: 'USER_BANNED',
	USER_UNBANNED: 'USER_UNBANNED',
	USER_DELETED: 'USER_DELETED',
	USER_UPDATED: 'USER_UPDATED',
	USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
	USER_EMAIL_VERIFIED: 'USER_EMAIL_VERIFIED',

	// Content Moderation
	POST_DELETED: 'POST_DELETED',
	COMMENT_DELETED: 'COMMENT_DELETED',
	JOURNAL_DELETED: 'JOURNAL_DELETED',
	CONTENT_FLAGGED: 'CONTENT_FLAGGED',

	// System Actions
	SYSTEM_SETTINGS_UPDATED: 'SYSTEM_SETTINGS_UPDATED',
	BULK_USER_ACTION: 'BULK_USER_ACTION',
	DATA_EXPORT: 'DATA_EXPORT',
};

// Function to get recent admin actions for a specific admin
export const getAdminRecentActions = async (adminId, limit = 10) => {
	try {
		return await prisma.adminAction.findMany({
			where: { admin_id: adminId },
			orderBy: { timestamp: 'desc' },
			take: limit,
			select: {
				id: true,
				action: true,
				target_id: true,
				notes: true,
				timestamp: true,
			},
		});
	} catch (error) {
		console.error('Failed to fetch admin recent actions:', error);
		return [];
	}
};
