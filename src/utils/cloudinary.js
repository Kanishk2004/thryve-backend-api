import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (filePath) => {
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
		fs.unlinkSync(filePath); // Ensure the file is deleted even if upload fails
		console.error('Error uploading to Cloudinary:', error);
		throw new Error('Failed to upload image to Cloudinary');
	}
};

const deleteFromCloudinary = async (publicId) => {
	try {
		await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
		return { success: true, message: 'Image deleted successfully' };
	} catch (error) {
		console.error('Error deleting from Cloudinary:', error);
		throw new Error('Failed to delete image from Cloudinary');
	}
};

export { uploadToCloudinary, deleteFromCloudinary };
