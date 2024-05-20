import mongoose, { isValidObjectId }  from "mongoose"
import {Comment} from "../models/comment.model.js"
import { User } from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

})

const addComment = asyncHandler(async (req, res) => {
    const {videoId} = req.params

    const {content} = req.body

    if(!videoId){
        throw new ApiError(400, "video Id is missing")
    }

    if(!content){
        throw new ApiError(404, "Content is required to add comment")
    }

    const {fullName, username, avatar} = await User.findById(req.user?._id)


    const comment = await Comment.create({
        content,
        video: videoId,
        owner :{
            fullName,
            username,
            avatar
        }

    })

    if(!comment){
        throw new ApiError(500, "failed to addd comment")
    }

    return res.status(200).json(200, comment, "Comment added successfully")

})

const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    if(!commentId?.trim() || !isValidObjectId(commentId)){
        throw new ApiError(400, "Comment Id is missing or Invalid")
    }

    const comment = await Comment.findById(commentId)
    if(comment.owner?._id !== req.user?._id){
        throw new ApiError(401, "You cannot delete this comment");
    }

    const {content} = req.body
    if(!content){
        throw new ApiError(404, "Content is required")
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,

        {
            $set : {
                content
            }
        },
        {new : true}
    )

    if(!updatedComment){
        throw new ApiError(500, "Something went  wrong while updating the comment")
    }

    return res.status(200).json(new ApiResponse(200,{comment: updatedComment}, "Comment updated successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {

    const {commentId} = req.params
    if(!commentId?.trim() || !isValidObjectId(commentId)){
        throw new ApiError(400, "Comment Id is missing or Invalid")
    }

    const comment = await Comment.findById(commentId)
    if(comment.owner?._id !== req.user?._id){
        throw new ApiError(401, "You cannot delete this comment");
    }

    await Comment.findByIdAndDelete(commentId)

    return res.status(200).json(200, {}, "Comment deleted successfully")


})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
    }