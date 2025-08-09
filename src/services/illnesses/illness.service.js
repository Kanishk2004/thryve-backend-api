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
}
