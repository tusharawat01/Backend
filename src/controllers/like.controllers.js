import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(400, "Video Id is missing or Invalid")
    }
    
    const isLiked = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id
    })

    if(isLiked){
        const removeLike = await Like.findByIdAndDelete(isLiked?._id);

        if(!removeLike){
            throw new ApiError(500, "Error occured while toggling the like")
        }
        return res.status(200).json(new ApiResponse(200, removeLike, "Remove from like videos"))
    }else{
        const liked =await Like.create({
            video: videoId,
            likedBy: req.user?._id
        })

        if(!liked){
            throw new ApiError(500, "Error occured while toggling the like")
        }

        return res.status(200).json(new ApiResponse(200,liked, "Liked video succesfully"))


    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    if(!commentId || !isValidObjectId(commentId)){
        throw new ApiError(400, "Comment Id is missing or Invalid")
    }
    
    const isLiked = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id
    })

    if(isLiked){
        const removeLike = await Like.findByIdAndDelete(isLiked?._id);

        if(!removeLike){
            throw new ApiError(500, "Error occured while toggling the like")
        }
        return res.status(200).json(new ApiResponse(200, removeLike , "Remove comment like"))
    }else{
        const liked =await Like.create({
            comment: commentId,
            likedBy: req.user?._id
        })

        if(!liked){
            throw new ApiError(500, "Error occured while toggling the like")
        }

        return res.status(200).json(new ApiResponse(200, liked, "Liked comment succesfully"))


    }


})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
   
    if(!tweetId || !isValidObjectId(tweetId)){
        throw new ApiError(400, "Tweet Id is missing or Invalid")
    }
    
    const isLiked = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user?._id
    })

    if(isLiked){
        const removeLike = await Like.findByIdAndDelete(isLiked?._id);

        if(!removeLike){
            throw new ApiError(500, "Error occured while toggling the like")
        }
        return res.status(200).json(new ApiResponse(200, removeLike, "Remove tweeet like"))
    }else{
        const liked =await Like.create({
            tweet: tweetId,
            likedBy: req.user?._id
        })

        if(!liked){
            throw new ApiError(500, "Error occured while toggling the like")
        }

        return res.status(200).json(new ApiResponse(200,liked, "Liked tweet succesfully"))


    }t
})

const getLikedVideos = asyncHandler(async (req, res) => {
// Get all liked videos by a user
    try {
      const likedVideos = await Like.aggregate([
        {
          $match: {
            likedBy: new mongoose.Types.ObjectId(req.user?._id)
          }
        },
        {
          $lookup: {
            from: "videos",
            localField: "video",
            foreignField: "_id",
            as: "likedVideos"
          }
        },
        {
          $unwind: "$likedVideos"
        },
        {
          $project: {
            _id: 0,
            likedVideo: "$likedVideos"
          }
        }
      ]);
  
      if (likedVideos.length === 0) {
        throw new ApiError(404, "No liked videos found");
      }
  
      res.status(200).json(new ApiResponse(200, likedVideos, "Successfully got the liked video list"));
    } catch (error) {
      throw new ApiError(400, "Something went wrong", error);
    }
});

  
const getTotalLikesOfVideo = asyncHandler(async (req, res) => {
     // Get total likes of a video
    try {
      const { videoId } = req.params;
  
      if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Video id is not valid");
      }
  
      const aggregate = [
        {
          $match: {
            video: new mongoose.Types.ObjectId(videoId)
          }
        },
        {
          $group: {
            _id: null,
            totalLikes: { $sum: 1 }
          }
        }
      ];
  
      const likes = await Like.aggregate(aggregate);
  
      if (likes.length === 0) {
        throw new ApiError(404, "No likes found for the video");
      }
  
      res.status(200).json(new ApiResponse(200, likes[0], "Successfully got the total likes"));
    } catch (error) {
      throw new ApiError(400, "Something went wrong", error);
    }
});
  

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos,
    getTotalLikesOfVideo
}