import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        //upload file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto'
        })
        //File has been uploaded successfully
        // console.log("File uploaded on cloudinary successfully", response.url);
        // console.log("Response : ", response);
        //File removed from local path when file upload on cloudinary successfully
        fs.unlinkSync(localFilePath);
        return response;

    } catch (error) {
        //remove the locally saved temporary file as the file upload on cloudinary failed
        fs.unlinkSync(localFilePath);
        return null;

    }
}

const deleteFromCloudinary = async(url, resourceType = "image") => {
    const publicId = extractPublicId(url);
    try {
        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType
        });
        return response;
    } catch (error) {
        console.log("Error while deleting from cloudinary");
        console.log(error);
        return null;
    }
}

export { uploadOnCloudinary, deleteFromCloudinary}