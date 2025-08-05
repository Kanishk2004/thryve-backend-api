import { prisma } from '../db/index.js';
import ApiError from './ApiError.js';

export const logAdminAction = async (
	adminId,
	action,
	targetId,
	notes = null
) => {
	// Validate required parameters
	if (!adminId) {
		throw ApiError.badRequest('Admin ID is required for logging actions');
	}

	if (!action) {
		throw ApiError.badRequest('Action type is required for logging');
	}

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
		// For logging, we might want to fail silently in some cases
		// But for critical audit trails, we should throw an error
		throw ApiError.internalServer('Failed to log admin action - audit trail compromised');
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
	if (!adminId) {
		throw ApiError.badRequest('Admin ID is required');
	}

	if (limit < 1 || limit > 100) {
		throw ApiError.badRequest('Limit must be between 1 and 100');
	}

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
		throw ApiError.internalServer('Failed to fetch admin actions');
	}
};
