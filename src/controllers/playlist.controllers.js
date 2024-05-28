import {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {Video} from "../models/video.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    if(!name || !description){
        throw new ApiError(400, "name and description of playlist is required")
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user?._id
    })

    if(!playlist){
        throw new ApiError(500, "Error occured while creating playlist")
    }

    return res.status(200).json(new ApiResponse(200,playlist, "Playlist created successfully"))
    
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    if(!userId || !isValidObjectId(userId)){
        throw new ApiError(400, "User Id is missing or invalid")
    }

    const playlists = await Playlist.find({
        owner: userId
    })

    if(!playlists){
        throw new ApiError(500, "Error while fetching User Playlists")
    }
        
    return res.status(200).json(new ApiResponse(200, playlists, "Userr Playlists fetch successfully"))

   
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(400, "Playlist Id is missing or Invalid")
    }

    const playlist = await Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(500, "Error occured while fetching playlist")
    }

    return res.status(200).json(new ApiResponse(200, playlist, "Playlist fetched successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if(!playlistId || !videoId ){
        throw new ApiError(400, "Missing playlist id or Video Id")
    }

    const playlist = await Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(404, "Playlist not found with this id")
    }

    if(playlist.owner?.toString() !== req.user?._id?.toString()){
        throw new ApiError(401, "You cannot add video to this playlist");
    }

    if(playlist.videos.includes(videoId)){
        throw new ApiError(400, "The video already exists on playlist")
    }

    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404,"Video not found with this id")
    }

    // console.log("videoID: " , videoId)
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,    
    { $push: { videos: videoId } },  
    {
        new: true
    })

    if(!updatedPlaylist){
        throw new ApiError(500, "error occured while updating the playlist")
    }
    console.log("Video : ", updatedPlaylist.videos)

    return res.status(200).json(new ApiResponse(200, updatedPlaylist, "Playlist updated successfully"))

})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(!playlistId || !videoId ){
        throw new ApiError(400, "Missing playlist id or Video Id")
    }

    const playlist = await Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(404, "Playlist not found with this id")
    }

    if(playlist.owner?.toString() !== req.user?._id?.toString()){
        throw new ApiError(401, "You cannot remove video from this playlist");
    }

    if(!playlist.videos.includes(videoId)){
        throw new ApiError(400, "The video is not exists on playlist")
    }

    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404,"Video not found with this id")
    }
   
    
    playlist.videos.pull(videoId);
    const updatedPlaylist = await playlist.save();

    if (!updatedPlaylist) {
        throw new ApiError(400, "playlist not updated");
    }

    return res.status(200).json(new ApiResponse(200, updatedPlaylist, "Successfully remove video from the playlist"))

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Playlist Id is Invalid")
    }

    const playlist = await Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(404,"No playlist found with this Id")
    }

    if(playlist.owner?.toString() !== req.user?._id?.toString()){
        throw new ApiError(401, "You cannot delete this  playlist");
    }

    const deletePlaylist = await Playlist.findByIdAndDelete(playlistId)

    if(!deletePlaylist){
        throw new ApiError(500, "Error occured while deleting the Playlist")
    }

    return res.status(200).json(new ApiResponse(200, {} , "Playlist deleted successfully"))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    // console.log("name and description", name, description)

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlist Id")
    }

    if(!name || !description){
        throw new ApiError(400, "Name and description required")
    }

    const playlist = await Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(404, "Playlist not found")
    }

    if(playlist?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400, "You cannot update this playlist")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            name,
            description,
        },
        {
            new :true
        }
    )

    if(!updatedPlaylist){
        throw new ApiError(500, "Error occured while updating the playlist")
    }

    return res.status(200).json(new ApiResponse(200, updatedPlaylist, "Playlist updated successfully"))
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}