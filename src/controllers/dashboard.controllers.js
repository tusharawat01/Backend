import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscriber} from "../models/subscriber.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // Get the channel stats like total video views, total subscribers, total videos, total likes etc.

    const data = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user?._id)
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
                likes: {
                    $size: "$likes"
                }
            }
        },
        {
            $group: {
                _id: null,
                totalViews: {
                    $sum: "$views"
                },
                totalVideos: {
                    $sum: 1
                },
                totaLikes: {
                    $sum: "$likes"
                }
            }
        },
        {
            $addFields: {
                owner: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "owner",
                foreignField: "channel",
                as: "totalSubscribers"
            }
        },
        {
            $addFields: {
                totalSubscribers: {
                    $size: "$totalSubscribers"
                }
            }
        },
        {
            $project: {
                _id: 0,
                owner: 0
            }
        }
     ]);

     if(!data){
        throw new ApiError(500, "error occured while getting channel stats")
     }

     res.status(200).json(new ApiResponse(
        200,
        data,
        "Get channel stats success"
     ));
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
})

export {
    getChannelStats, 
    getChannelVideos
    }