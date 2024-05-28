import {isValidObjectId} from "mongoose"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Subscriber } from "../models/subscriber.model.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if(!channelId || !isValidObjectId(channelId)){
        throw new ApiError(400, "Channel ID is missing or Invalid")
    }

    const isSubscribed = await Subscriber.findOne({
        channel : channelId,
        subscriber : req.user?._id
    })

    if(isSubscribed){
        const removeSuscriber = await Subscriber.findByIdAndDelete(isSubscribed._id)

        if(!removeSuscriber){
            throw new ApiError(500, "Error occured while unsubscribing")
        }
        return res.status(200).json(new ApiResponse(200,{}, "unsubscribed successfully"))
    }else{
        const subscriber = await Subscriber.create({
            channel: channelId,
            subscriber: req.user?._id
        })

        if(!subscriber){
            throw new ApiError(500, "Error occured while subscribing")
        }
        return res.status(200).json(new ApiResponse(200, subscriber, "Subscribed successfully"))
    }

   
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    // console.log('Request params:', req.params); // Logging for debugging
    const {channelId} = req.params
    if(!channelId){
        throw new ApiError(400, "channel Id is missing")
    }

    
    try {
        const subscriberList = await Subscriber.find({channel: channelId})

        if(subscriberList.length === 0){
            return res.status(200).json(new ApiResponse(200,{}, "You have no suscribers"))
        }else{
            return res.status(200).json(new ApiResponse(200, {subscriberList, subscriberCount: subscriberList.length}, "Subscriber fetch successfully"))
        }
        
    } catch (error) {
        throw new ApiError(500,  error)
    }

})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;
    console.log('Request params:', req.params); // Logging for debugging

    if (!subscriberId) {
        throw new ApiError(400, "Subscriber ID is missing");
    }

    try {
        const subscribedChannels = await Subscriber.find({ subscriber: subscriberId });

        if (subscribedChannels.length === 0) {
            return res.status(200).json(new ApiResponse(200, {}, "No subscribed channels found"));
        } else {
            return res.status(200).json(new ApiResponse(
                200,
                {
                    channels: subscribedChannels,
                    subscribedChannelCount: subscribedChannels.length
                },
                "Subscribed channels fetched successfully"
            ));
        }
    } catch (error) {
        throw new ApiError(500, "Error occurred while fetching subscribed channels");
    }
});

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}