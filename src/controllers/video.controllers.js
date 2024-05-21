import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {Like} from "../models/like.model.js"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/Cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
})

const publishAVideo = asyncHandler(async (req, res) => {

    //1.) Getting the inputs from frontend and validate them
    //2.) Upload video and thumbnail to cloudinary
    //3.) Create a new video document
    //4.) Send the video object in response

    //1.) Getting the inputs and validate them

    const { title, description} = req.body
    // console.log(title,description)
    // console.log("req.body", req.body)


    // console.log("req.files", req.files)
    const videoFileLocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
    // console.log(videoFileLocalPath,thumbnailLocalPath)

    
    // if (
    //     [title, description, videoFile, thumbnail].some((field) =>
    //         field === "")
    // ) {
    //     throw new ApiError(400, "All fields are required")
    // }

    //want to validate specifically
    if(!title || !description){
        throw new ApiError(400,"Title and description are required")
    }

    if(!videoFileLocalPath){
        throw new ApiError(400, "Video file required")
    }

    if(!thumbnailLocalPath){
        throw new ApiError(400, "Thumbnail is required")
    }

    //2.) Upload video and thumbnail to cloudinary

    const videoFile = await uploadOnCloudinary(videoFileLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    // console.log("videoFile", videoFile);
    // console.log("thumbnail", thumbnail);

    if(!videoFile.url || !thumbnail.url){
        throw new ApiError(400, "video file and thumbnail is required")
    }

    //3.) Create a new video document

    const video = await Video.create({
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        owner: req.user._id,
        title,
        description: description || "",
        duration: videoFile.duration
    })

    // console.log("video",video)

    if(!video){
        throw new ApiError(500, "Error occured while creating video document")
    }

    //4.) Send the video object in response

    return res
    .status(200)
    .json(new ApiResponse(200,video,"Video published successfully"))

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid or missing Video Id")
    }

    const videoDetails = await Video.aggregate([
        {
            $match : {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField:"_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                },
                videoLikes: {
                    $size: "$likes"
                },
                views: {
                    $add: ["$views", 1]
                }
            }
        }
    ]);

    if (videoDetails?.length === 0) {
        throw new ApiError(404, "Video not found");
    }

    // Update views in the database
    const video = videoDetails[0];
    await Video.findByIdAndUpdate(videoId, {
        $set: {
            views: video.views
        }
    });

    res
    .status(200)
    .json(new ApiResponse(200, video, "video fetch successfully"))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!videoId?.trim() || !isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid or missing Video Id")
    }

    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404, "Video not found");
    }

    //console.log("video : ", video.owner?._id, "user : ", req.user?._id)
    // console.log("video : ", video.owner?._id.toString(), "user : ", req.user?._id.toString())

    if(video.owner?._id.toString() !== req.user?._id.toString()){
        throw new ApiError(401, "You cannot update this video");
    }

    // console.log(req.file)

    const {title, description} = req.body
    if(!title || !description){
        throw new ApiError(400,"Title or description missing")
    }

    const thumbnailLocalPath = req.file?.path
    console.log("thumbnailLocalPath : ", thumbnailLocalPath)

    if(!thumbnailLocalPath){
        throw new ApiError(400, "No thumbnail given")
    }

    const uploadThumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    

    if(!uploadThumbnail.url){
        throw new ApiError(400, "Error while uploading thumbnail")
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: uploadThumbnail.url
            }
        },
        {new: true}
    )

    if(!updatedVideo){
        throw new ApiError(500, "Error while updating")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, updatedVideo, "video details updated successfully")
    )

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!videoId?.trim() || !isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid or missing Video Id")
    }

    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404, "Video not found for deletion");
    }

    if(video.owner?._id.toString() !== req.user?._id.toString()){
        throw new ApiError(401, "You cannot delete this video");
    }

    const {_id, videoFile, thumbnail} = video;
    const deletedVideo = await Video.findByIdAndDelete(_id);
    if(deletedVideo){
        await Promise.all([
            Like.deleteMany({video: _id}),
            Comment.deleteMany({video: _id}),
            deleteFromCloudinary(videoFile, "video"),
            deleteFromCloudinary(thumbnail),
        ]);
    }else{
        throw new ApiError(500, "Something went wrong while deleting video");
    }

    res.status(200).json(new ApiResponse(
        200,
        {},
        "Video deleted successfully"
    ));
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!videoId?.trim() || !isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid or missing Video Id")
    }

    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404, "Video not found")
    }

    const { isPublished } = video;

    const toggledPublishStatus = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !isPublished
            }
        },
        {new: true}
    )

    if(!toggledPublishStatus){
        throw new ApiError(500,"Error occured while toogling public status")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, video.isPublished, "toggled successfully"))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}