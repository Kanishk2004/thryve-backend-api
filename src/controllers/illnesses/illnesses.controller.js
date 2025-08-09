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

const addIllness = AsyncHandler(async (req, res) => {
	const illnessData = req.body;

	const result = await IllnessService.addIllness(illnessData);

	return res
		.status(201)
		.json(new ApiResponse(201, result.result, result.message));
});

const updateIllness = AsyncHandler(async (req, res) => {
	const illnessId = req.params.id;
	const updateData = req.body;

	const result = await IllnessService.updateIllness(illnessId, updateData);

	return res
		.status(200)
		.json(new ApiResponse(200, result.result, result.message));
});

const deleteIllness = AsyncHandler(async (req, res) => {
	const illnessId = req.params.id;

	const result = await IllnessService.deleteIllness(illnessId);

	return res
		.status(200)
		.json(new ApiResponse(200, result.result, result.message));
});

const getIllnessStats = AsyncHandler(async (req, res) => {
	const result = await IllnessService.getIllnessStats();

	return res
		.status(200)
		.json(new ApiResponse(200, result.result, result.message));
});

export {
	getAvailableIllnesses,
	addIllness,
	updateIllness,
	deleteIllness,
	getIllnessStats,
};
