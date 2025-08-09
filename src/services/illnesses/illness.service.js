import { prisma } from '../../db/index.js';
import ApiError from '../../utils/ApiError.js';

export class IllnessService {
	static async getAvailableIllnesses(query) {
		const { category, search } = query;

		const whereCondition = {
			isActive: true,
			...(category && { category }),
			...(search && {
				OR: [
					{ name: { contains: search, mode: 'insensitive' } },
					{ description: { contains: search, mode: 'insensitive' } },
				],
			}),
		};

		const illnesses = await prisma.illness.findMany({
			where: whereCondition,
			select: {
				id: true,
				name: true,
				category: true,
				description: true,
			},
			orderBy: [{ category: 'asc' }, { name: 'asc' }],
		});

		// Group by category for better UX
		const groupedIllnesses = illnesses.reduce((acc, illness) => {
			if (!acc[illness.category]) {
				acc[illness.category] = [];
			}
			acc[illness.category].push(illness);
			return acc;
		}, {});

		return {
			illnesses,
			groupedIllnesses,
			categories: Object.keys(groupedIllnesses),
			message: 'Available illnesses retrieved successfully',
		};
	}

	static async addIllness(illnessData) {
		const { name, category, description, isActive } = illnessData;

		// Validation
		if (!name || !category) {
			throw ApiError.badRequest('Name and category are required fields');
		}

		// Validate category (you can add more categories as needed)
		const validCategories = [
			'autoimmune',
			'mental_health',
			'chronic_pain',
			'cardiovascular',
			'respiratory',
			'neurological',
			'digestive',
			'endocrine',
			'musculoskeletal',
			'dermatological',
			'oncological',
			'genetic',
			'infectious',
			'other',
		];

		if (!validCategories.includes(category.toLowerCase())) {
			throw ApiError.badRequest(
				`Invalid category. Valid categories are: ${validCategories.join(', ')}`
			);
		}

		// Check if illness with same name already exists
		const existingIllness = await prisma.illness.findFirst({
			where: {
				name: {
					equals: name,
					mode: 'insensitive',
				},
			},
		});

		if (existingIllness) {
			throw ApiError.conflict(`Illness with name "${name}" already exists`);
		}

		// Create new illness
		const newIllness = await prisma.illness.create({
			data: {
				name: name.trim(),
				category: category.toLowerCase(),
				description: description?.trim() || null,
				isActive: isActive ?? true,
			},
			select: {
				id: true,
				name: true,
				category: true,
				description: true,
				isActive: true,
				createdAt: true,
			},
		});

		return {
			result: newIllness,
			message: `Illness "${name}" added successfully`,
		};
	}

	static async updateIllness(illnessId, updateData) {
		const { name, category, description, isActive } = updateData;

		// Check if illness exists
		const existingIllness = await prisma.illness.findUnique({
			where: { id: illnessId },
		});

		if (!existingIllness) {
			throw ApiError.notFound('Illness not found');
		}

		// Build update object with only provided fields
		const updateFields = {};
		if (name !== undefined) {
			// Check for duplicate name (excluding current illness)
			const duplicateIllness = await prisma.illness.findFirst({
				where: {
					name: { equals: name, mode: 'insensitive' },
					id: { not: illnessId },
				},
			});

			if (duplicateIllness) {
				throw ApiError.conflict(`Illness with name "${name}" already exists`);
			}
			updateFields.name = name.trim();
		}
		if (category !== undefined) updateFields.category = category.toLowerCase();
		if (description !== undefined)
			updateFields.description = description?.trim() || null;
		if (isActive !== undefined) updateFields.isActive = isActive;

		const updatedIllness = await prisma.illness.update({
			where: { id: illnessId },
			data: updateFields,
			select: {
				id: true,
				name: true,
				category: true,
				description: true,
				isActive: true,
				createdAt: true,
			},
		});

		return {
			result: updatedIllness,
			message: 'Illness updated successfully',
		};
	}

	static async deleteIllness(illnessId) {
		// Check if illness exists
		const existingIllness = await prisma.illness.findUnique({
			where: { id: illnessId },
			include: {
				userIllnesses: true,
			},
		});

		if (!existingIllness) {
			throw ApiError.notFound('Illness not found');
		}

		// Check if illness is being used by users
		if (existingIllness.userIllnesses.length > 0) {
			// Soft delete - just deactivate
			const deactivatedIllness = await prisma.illness.update({
				where: { id: illnessId },
				data: { isActive: false },
				select: {
					id: true,
					name: true,
					isActive: true,
				},
			});

			return {
				result: deactivatedIllness,
				message: 'Illness deactivated (users are still using this illness)',
			};
		}

		// Hard delete if no users are using it
		await prisma.illness.delete({
			where: { id: illnessId },
		});

		return {
			result: { id: illnessId },
			message: 'Illness deleted successfully',
		};
	}

	static async getIllnessStats() {
		const stats = await prisma.illness.groupBy({
			by: ['category'],
			_count: {
				id: true,
			},
			where: {
				isActive: true,
			},
		});

		const totalIllnesses = await prisma.illness.count({
			where: { isActive: true },
		});

		const totalUsers = await prisma.userIllnessPreference.count();

		return {
			result: {
				totalIllnesses,
				totalUsersWithPreferences: totalUsers,
				categoryStats: stats.map((stat) => ({
					category: stat.category,
					count: stat._count.id,
				})),
			},
			message: 'Illness statistics retrieved successfully',
		};
	}
}
