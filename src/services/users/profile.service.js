import { prisma } from '../../db/index.js';
import ApiError from '../../utils/ApiError.js';
import {
	deleteFromCloudinary,
	uploadToCloudinary,
} from '../../utils/cloudinary.js';

export class ProfileService {
	static async getProfile(userId) {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				email: true,
				isEmailVerified: true,
				username: true,
				role: true,
				bio: true,
				avatarURL: true,
				createdAt: true,
			},
		});

		if (!user) {
			throw ApiError.notFound('User not found');
		}

		return { user, message: 'User profile fetched successfully' };
	}

	static async updateAvatar(userId, localFilePath, avatarPublicId) {
		const cloudinaryUrl = await uploadToCloudinary(localFilePath);

		if (!cloudinaryUrl) {
			throw ApiError.internalServer('Failed to upload avatar');
		}

		if (avatarPublicId) {
			await deleteFromCloudinary(avatarPublicId); // Delete old avatar from Cloudinary
		}

		const user = await prisma.user.update({
			where: { id: userId },
			data: {
				avatarURL: cloudinaryUrl.secure_url,
				avatarPublicId: cloudinaryUrl.public_id,
			},
		});

		return { user, message: 'Avatar updated successfully' };
	}

	static async updateProfile(userId, profileData) {
		const { username, bio, fullName, gender, dateOfBirth } = profileData;

		const updateData = {};

		if (username !== undefined) {
			if (username.length < 3) {
				throw ApiError.badRequest('Username must be at least 3 characters');
			}
			const existingUser = await prisma.user.findFirst({
				where: {
					username,
					NOT: { id: userId },
				},
			});
			if (existingUser) {
				throw ApiError.conflict('Username is already taken');
			}
			updateData.username = username;
		}
		if (bio !== undefined) updateData.bio = bio;
		if (fullName !== undefined) updateData.fullName = fullName;
		if (gender !== undefined) updateData.gender = gender;
		if (dateOfBirth !== undefined) {
			// Convert string to Date if needed
			updateData.dateOfBirth = new Date(dateOfBirth);
		}

		// Check if there are any fields to update
		if (Object.keys(updateData).length === 0) {
			return res
				.status(400)
				.json(new ApiResponse(400, null, 'No fields to update'));
		}

		const updatedUser = await prisma.user.update({
			where: { id: userId },
			data: updateData,
			select: {
				id: true,
				email: true,
				isEmailVerified: true,
				username: true,
				role: true,
				bio: true,
				fullName: true,
				gender: true,
				dateOfBirth: true,
				avatarURL: true,
				createdAt: true,
			},
		});
		return { user: updatedUser, message: 'Profile updated successfully' };
	}

	// Helper function to ensure deleted user account exists
	static async ensureDeletedUserAccount(tx) {
		const deletedUserEmail = 'deleted.user@thryve.internal';
		const deletedUsername = 'deleted_user';

		let deletedUser = await tx.user.findUnique({
			where: { email: deletedUserEmail }
		});

		if (!deletedUser) {
			deletedUser = await tx.user.create({
				data: {
					email: deletedUserEmail,
					username: deletedUsername,
					fullName: 'Deleted User',
					password: null, // No password - account cannot be logged into
					role: 'USER',
					isEmailVerified: true,
					isActive: false, // Inactive account
					bio: 'This account represents content from deleted users.',
					avatarURL: 'https://res.cloudinary.com/nexweb/image/upload/v1753801741/thryve/avatar/user_profile_gc8znx.png',
					avatarPublicId: 'user_profile.png'
				}
			});
		}

		return deletedUser.id;
	}

	static async deleteAccount(user) {
		if (!user) {
			throw ApiError.unauthorized('User not authenticated');
		}

		const { id: userId, avatarPublicId } = user;

		// Use transaction for atomic deletion/anonymization
		const result = await prisma.$transaction(async (tx) => {
			// Get or create the deleted user account
			const deletedUserId = await this.ensureDeletedUserAccount(tx);

			// 1. Anonymize Posts and Comments (Option B - Community Value)
			const postsUpdated = await tx.post.updateMany({
				where: { user_id: userId },
				data: { 
					user_id: deletedUserId,
					is_anonymous: true // Ensure posts are marked as anonymous
				}
			});

			const commentsUpdated = await tx.comment.updateMany({
				where: { user_id: userId },
				data: { user_id: deletedUserId }
			});

			// 2. Delete Personal Chat Messages (Private Data)
			const chatMessagesDeleted = await tx.chatMessage.deleteMany({
				where: { sender_id: userId }
			});

			// 3. Delete Chat Sessions where user was participant
			const chatSessionsDeleted = await tx.chatSession.deleteMany({
				where: {
					OR: [
						{ user_1_id: userId },
						{ user_2_id: userId }
					]
				}
			});

			// 4. Delete Personal Health Data (Sensitive Information)
			const journalsDeleted = await tx.journal.deleteMany({
				where: { user_id: userId }
			});

			// 5. Delete User Preferences and Illness Preferences (Personal Data)
			// This will cascade delete UserIllnessPreference due to onDelete: Cascade
			const preferencesDeleted = await tx.userPreferences.deleteMany({
				where: { user_id: userId }
			});

			// 6. Delete Personal Notifications
			const notificationsDeleted = await tx.notification.deleteMany({
				where: { user_id: userId }
			});

			// 7. Delete OTP Records (Authentication Data)
			const otpDeleted = await tx.oTPVerification.deleteMany({
				where: { user_id: userId }
			});

			// 8. Handle Doctor Profile if exists
			const doctorProfile = await tx.doctorProfile.findUnique({
				where: { user_id: userId }
			});

			let appointmentsHandled = { deleted: 0, anonymized: 0 };
			if (doctorProfile) {
				// Delete future appointments (no medical value yet)
				const futureAppointmentsDeleted = await tx.appointment.deleteMany({
					where: { 
						doctor_id: doctorProfile.id,
						slot_datetime: { gt: new Date() }
					}
				});

				// Anonymize past appointments for medical record keeping
				const pastAppointmentsAnonymized = await tx.appointment.updateMany({
					where: { 
						doctor_id: doctorProfile.id,
						slot_datetime: { lte: new Date() }
					},
					data: { 
						user_id: deletedUserId // Anonymize patient data
					}
				});

				appointmentsHandled.deleted = futureAppointmentsDeleted.count;
				appointmentsHandled.anonymized = pastAppointmentsAnonymized.count;

				// Delete doctor profile
				await tx.doctorProfile.delete({
					where: { user_id: userId }
				});
			}

			// 9. Handle User Appointments (as patient)
			const futureUserAppointments = await tx.appointment.deleteMany({
				where: { 
					user_id: userId,
					slot_datetime: { gt: new Date() }
				}
			});

			// Anonymize past appointments for doctor records
			const pastUserAppointments = await tx.appointment.updateMany({
				where: { 
					user_id: userId,
					slot_datetime: { lte: new Date() }
				},
				data: { user_id: deletedUserId }
			});

			appointmentsHandled.deleted += futureUserAppointments.count;
			appointmentsHandled.anonymized += pastUserAppointments.count;

			// 10. Create audit trail record before deleting user
			await tx.adminAction.create({
				data: {
					admin_id: deletedUserId, // Use system account
					action: 'USER_ACCOUNT_DELETED',
					target_id: userId,
					notes: `User account deleted with anonymization. Posts: ${postsUpdated.count}, Comments: ${commentsUpdated.count}, Appointments anonymized: ${appointmentsHandled.anonymized}`
				}
			});

			// 11. Finally delete the user account (Personal Data)
			await tx.user.delete({
				where: { id: userId }
			});

			return { 
				deletedUserId: userId,
				stats: {
					postsAnonymized: postsUpdated.count,
					commentsAnonymized: commentsUpdated.count,
					chatMessagesDeleted: chatMessagesDeleted.count,
					chatSessionsDeleted: chatSessionsDeleted.count,
					journalsDeleted: journalsDeleted.count,
					notificationsDeleted: notificationsDeleted.count,
					appointmentsDeleted: appointmentsHandled.deleted,
					appointmentsAnonymized: appointmentsHandled.anonymized
				}
			};
		});

		// 12. Delete avatar from Cloudinary (outside transaction)
		if (avatarPublicId && avatarPublicId !== 'user_profile.png') {
			try {
				await deleteFromCloudinary(avatarPublicId);
			} catch (error) {
				// Log error but don't fail the deletion
				console.error('Failed to delete avatar from Cloudinary:', error);
			}
		}

		return { 
			message: 'Account deleted successfully with content preservation',
			deletionSummary: {
				personalData: 'Completely removed',
				posts: `${result.stats.postsAnonymized} posts anonymized and preserved`,
				comments: `${result.stats.commentsAnonymized} comments anonymized and preserved`,
				chats: `${result.stats.chatMessagesDeleted} messages and ${result.stats.chatSessionsDeleted} sessions deleted`,
				healthData: `${result.stats.journalsDeleted} journal entries deleted`,
				appointments: `${result.stats.appointmentsDeleted} future appointments deleted, ${result.stats.appointmentsAnonymized} past appointments anonymized`,
				adminRecords: 'Audit trail preserved'
			},
			anonymizedAccount: 'Content transferred to system deleted_user account'
		};
	}

	static async changeUserName(userId, newUsername) {
		if (!newUsername || newUsername.length < 3) {
			throw ApiError.badRequest('Invalid username');
		}

		const existingUser = await prisma.user.findFirst({
			where: {
				username: newUsername,
				NOT: { id: userId }, // Exclude current user
			},
		});

		if (existingUser) {
			throw ApiError.conflict('Username already exists');
		}

		const updatedUser = await prisma.user.update({
			where: { id: userId },
			data: { username: newUsername },
			select: {
				id: true,
				email: true,
				isEmailVerified: true,
				username: true,
				role: true,
				bio: true,
				createdAt: true,
			},
		});

		return { user: updatedUser, message: 'Username updated successfully' };
	}

	static async togglePrivacyMode(userId) {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				email: true,
				isEmailVerified: true,
				username: true,
				role: true,
				bio: true,
				isAnonymous: true,
				createdAt: true,
			},
		});

		if (!user) {
			throw ApiError.notFound('User not found');
		}

		// Toggle privacy mode
		user.isAnonymous = !user.isAnonymous;

		await prisma.user.update({
			where: { id: userId },
			data: { isAnonymous: user.isAnonymous },
		});

		return {
			user,
			message: `Privacy mode updated to ${
				user.isAnonymous ? 'Anonymous' : 'Public'
			}`,
		};
	}

	static async getPublicProfile(userId) {
		if (!userId) {
			throw ApiError.badRequest('User ID is required');
		}

		const user = await prisma.user.findUnique({
			where: {
				id: userId,
			},
			select: {
				id: true,
				username: true,
				fullName: true,
				bio: true,
				avatarURL: true,
				isAnonymous: true,
				isActive: true,
			},
		});

		if (!user) {
			throw ApiError.notFound('User not found');
		}

		// Check if user is active
		if (!user.isActive) {
			throw ApiError.notFound('User not found');
		}

		if (user.isAnonymous) {
			return { user: null, message: 'User does not exist or is anonymous' };
		}

		// Remove isActive from the response
		const { isActive, ...userResponse } = user;

		return { user: userResponse, message: 'Public profile fetched successfully' };
	}

	static async searchUser(query, page, limit) {
		if (!query || query.trim().length < 2) {
			throw ApiError.badRequest('Search query must be at least 2 characters');
		}
		const pageNum = parseInt(page) || 1;
		const limitNum = parseInt(limit) || 10;
		const skip = (pageNum - 1) * limitNum;

		if (pageNum < 1 || limitNum < 1 || limitNum > 50) {
			throw ApiError.badRequest('Invalid pagination parameters');
		}
		const searchTerm = query.trim();

		// Search for users (case-insensitive, partial match)
		const users = await prisma.user.findMany({
			where: {
				AND: [
					{ isAnonymous: false }, // Only non-anonymous users
					{ isActive: true }, // Only active users
					{
						OR: [
							{
								username: {
									contains: searchTerm,
									mode: 'insensitive', // Case-insensitive search
								},
							},
							{
								fullName: {
									contains: searchTerm,
									mode: 'insensitive',
								},
							},
						],
					},
				],
			},
			select: {
				id: true,
				username: true,
				fullName: true,
				bio: true,
				avatarURL: true,
				isEmailVerified: true, // Show verified badge
			},
			orderBy: [
				{ isEmailVerified: 'desc' }, // Verified users first
				{ username: 'asc' }, // Then alphabetical
			],
			skip,
			take: limitNum,
		});

		// Get total count for pagination
		const totalUsers = await prisma.user.count({
			where: {
				AND: [
					{ isAnonymous: false },
					{
						OR: [
							{
								username: {
									contains: searchTerm,
									mode: 'insensitive',
								},
							},
							{
								fullName: {
									contains: searchTerm,
									mode: 'insensitive',
								},
							},
						],
					},
				],
			},
		});

		const totalPages = Math.ceil(totalUsers / limitNum);

		return {
			users,
			pagination: {
				currentPage: pageNum,
				totalPages,
				totalUsers,
				hasNext: pageNum < totalPages,
				hasPrev: pageNum > 1,
			},
			message: `Found ${users.length} users matching "${searchTerm}"`,
		};
	}
}
