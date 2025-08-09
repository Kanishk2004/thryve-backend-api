import { prisma } from '../db/index.js';

/**
 * Creates or ensures system accounts exist
 * This should be called during application startup
 */
export async function initializeSystemUsers() {
	try {
		// Create deleted user account if it doesn't exist
		const deletedUserEmail = 'deleted.user@thryve.internal';
		
		const existingDeletedUser = await prisma.user.findUnique({
			where: { email: deletedUserEmail }
		});

		if (!existingDeletedUser) {
			const deletedUser = await prisma.user.create({
				data: {
					email: deletedUserEmail,
					username: 'deleted_user',
					fullName: 'Deleted User',
					password: null, // No password - account cannot be logged into
					role: 'USER',
					isEmailVerified: true,
					isActive: false, // Inactive account
					bio: 'This account represents content from deleted users. Posts and comments are preserved for community benefit while maintaining user privacy.',
					avatarURL: 'https://res.cloudinary.com/nexweb/image/upload/v1753801741/thryve/avatar/user_profile_gc8znx.png',
					avatarPublicId: 'user_profile.png'
				}
			});
			
			console.log('✅ Created system deleted_user account:', deletedUser.id);
		} else {
			console.log('✅ System deleted_user account already exists');
		}

		// You can add other system accounts here if needed
		// For example: system admin, notification bot, etc.
		
	} catch (error) {
		console.error('❌ Error initializing system users:', error);
		throw error;
	}
}

/**
 * Get the deleted user ID (for use in services)
 */
export async function getDeletedUserId() {
	const deletedUser = await prisma.user.findUnique({
		where: { email: 'deleted.user@thryve.internal' },
		select: { id: true }
	});
	
	if (!deletedUser) {
		throw new Error('Deleted user account not found. Please run initializeSystemUsers()');
	}
	
	return deletedUser.id;
}

/**
 * Check if a user ID belongs to a system account
 */
export function isSystemUser(userId) {
	// Add more system user checks here as needed
	return userId === 'deleted_user' || userId?.includes('system_');
}
