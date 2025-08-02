import { AsyncHandler } from '../../utils/AsyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { prisma } from '../../db/index.js';

const getAvailableIllnesses = AsyncHandler(async (req, res) => {
	const { category, search } = req.query;

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

	return res.status(200).json(
		new ApiResponse(
			200,
			{
				illnesses,
				groupedIllnesses,
				categories: Object.keys(groupedIllnesses),
			},
			'Available illnesses retrieved successfully'
		)
	);
});

export { getAvailableIllnesses };
