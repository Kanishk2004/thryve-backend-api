import { AsyncHandler } from '../../utils/AsyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { IllnessService } from '../../services/illnesses/illness.service.js';

const getAvailableIllnesses = AsyncHandler(async (req, res) => {
	const query = req.query;

	const result = await IllnessService.getAvailableIllnesses(query);

	return res.status(200).json(
		new ApiResponse(
			200,
			{
				illnesses: result.illnesses,
				groupedIllnesses: result.groupedIllnesses,
				categories: result.categories,
			},
			result.message
		)
	);
});

export { getAvailableIllnesses };
