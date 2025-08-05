import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import dotenv from 'dotenv';
import ApiError from './ApiError.js';

dotenv.config();

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (filePath) => {
	// Validate input
	if (!filePath) {
		throw ApiError.badRequest('File path is required for upload');
	}

	// Check if file exists
	if (!fs.existsSync(filePath)) {
		throw ApiError.badRequest('File does not exist at the specified path');
	}

	try {
		const result = await cloudinary.uploader.upload(filePath, {
			folder: 'thryve/avatar',
			use_filename: true,
			unique_filename: false,
			overwrite: true,
			resource_type: 'image',
			transformation: [
				{
					width: 300,
					height: 300,
					crop: 'fill',
					gravity: 'face',
					quality: 'auto',
				},
			],
		});
		if (fs.existsSync(filePath)) {
			fs.unlinkSync(filePath); // Delete the file after successful upload
		}
		return result; // Return the entire result object
	} catch (error) {
		// Ensure the file is deleted even if upload fails
		if (fs.existsSync(filePath)) {
			fs.unlinkSync(filePath);
		}
		console.error('Error uploading to Cloudinary:', error);
		throw ApiError.internalServer('Failed to upload image to Cloudinary');
	}
};

const deleteFromCloudinary = async (publicId) => {
	// Validate input
	if (!publicId) {
		throw ApiError.badRequest('Public ID is required for deletion');
	}

	try {
		await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
		return { success: true, message: 'Image deleted successfully' };
	} catch (error) {
		console.error('Error deleting from Cloudinary:', error);
		throw ApiError.internalServer('Failed to delete image from Cloudinary');
	}
};

export { uploadToCloudinary, deleteFromCloudinary };
