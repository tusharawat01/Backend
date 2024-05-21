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

    console.log("comment : ", req.body)

    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(400, "video Id is missing or Invalid")
    }

    if(!content){
        throw new ApiError(404, "Content is required to add comment")
    }



    const comment = await Comment.create({
        content,
        video: videoId,
        owner : req.user?._id

    })

    if(!comment){
        throw new ApiError(500, "failed to add comment")
    }

    return res.status(200).json(new ApiResponse(200, comment, "Comment added successfully"))

})

const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    if(!commentId?.trim() || !isValidObjectId(commentId)){
        throw new ApiError(400, "Comment Id is missing or Invalid")
    }

    const comment = await Comment.findById(commentId)
    if(comment.owner?._id.toString() !==req.user?._id.toString()){
        throw new ApiError(401, "You cannot update this comment");
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
    if(comment.owner?._id.toString() !== req.user?._id.toString()){
        throw new ApiError(401, "You cannot delete this comment");
    }

    const deleteComment = await Comment.findByIdAndDelete(commentId)
    if(!deleteComment){
        throw new ApiError(500, "Error occured while deleting the commment")
    }

    return res.status(200).json(new ApiResponse(200, {}, "Comment deleted successfully"))


})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
    }