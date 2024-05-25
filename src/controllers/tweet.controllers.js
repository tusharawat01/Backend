import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const{content} = req.body

    if(!content){
        throw new ApiError(400, "Content is required")
    }

    const tweet = await Tweet.create({
        owner: req.user?._id,
        content
    })

    if(!tweet){
        throw new ApiError(500,"Error occured while creating a tweet")
    }

    return res.status(200).json(new ApiResponse(201, tweet, "Created tweet successfully"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    const {userId} = req.params

    if(!userId  || !isValidObjectId(userId)){
        throw new ApiError(400, "User Id is missing or Invalid")
    }

    const tweet =  await Tweet.aggregate([
        {
        $match :{
            owner :new mongoose.Types.ObjectId(userId)
        }
    },
    {
        $lookup : {
            from : "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
            pipeline: [
                {
                    $prject: {
                        fullName: 1,
                        username: 1,
                        avatar: 1
                    }
                }
            ]


        }
    },
    {
        $lookup : {
            from: "likes",
            localField : "_id",
            foreignField: "tweet",
            as: "likes"
        }
    },
    {
        $addField: {
            $first: {
                owner: "$owner"
            },
            $likesCount: {
                $size: ["tweeetLike"]
            }

        }
    }

]) 

if(!tweet){
    throw new ApiError(500, "Error occured while fetching tweet")
}

return res.status(200).json(new ApiResponse(200, tweet, "Tweets fetched successfully"))


})

const updateTweet = asyncHandler(async (req, res) => {
    //Get Tweet Id from params and Content from body
    const {content} = req.body
    const {tweetId} = req.params

    //validate tweetId oand content
    if(!content){
        throw new ApiError(400, "Content is required")
    }

    if(!tweetId || isValidObjectId(tweetId)){
        throw new ApiError(400, "tweet ID is missing or Invalid")
    }

    //check if a valid user or rightful user updating the tweet
    const tweet = await Tweet.findById(tweetId)
    if(!tweet){
        throw new ApiError(404,"Tweet not found")
    }

    if(tweet?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400, "You are not allowed to update this tweet")
    }

    //update the tweet

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            ...tweetId,
            content: content
        },
        {new: true}
    )

    if(!updatedTweet){
        throw new ApiError(500, "Error occured while updatinng the tweeet")
    }

    //return the response

    return res.status(200).json(new ApiResponse(200, updatedTweet, "Updated Tweet Successfully!"))


})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}