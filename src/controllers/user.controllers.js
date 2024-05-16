import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    //1.) Get user details from frontend
    //2.) Validation - not empty
    //3.) Check if user alreaddy exists : username, email
    //4.) Check for images ,check for avatar
    //5.) Upload them to cloudinary , avatar
    //6.) Create user object - create entries in db
    //7.) Remove password and refresh token fields
    //8.) Check for user creation
    //9.) Return res


    //1.) Get user details from frontend
    // console.log("Req body : ", req.body);
    const { username, email, password, fullName } = req.body

    //2.) Validation - check if the required field is not empty if empty throw error
    if (
        [username, email, password, fullName].some((field) =>
            field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    //3.) Check if user alreaddy exists : username, email (check both email or username must unique)
    const existingUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existingUser) {
        throw new ApiError(409, "User with same username or email already exists")
    }

    //4.) Check for images ,check for avatar (save image or file to diskStorage or localPath of multer and avatar is required)
    // console.log("Req files : ", req.files);
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;

    }


    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    //5.) Upload them to cloudinary (avatar is required to upload)
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    //6.) Create user object - create entries in db (we use User model is created by mongoose and it is connected to database)
    const user = await User.create({
        fullName,
        username: username.toLowerCase(),
        email,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        password

    })

    //7.) Remove password and refresh token fields
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    //8.) Check for user creation (Check if user is created and stored in databse by just selecting or retreiving the data from db)
    if (!createdUser) {
        throw new ApiError(500, "Something went Wrong while registering the user")
    }
    //9.) Send response to client
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

})

const loginUser = asyncHandler(async (req, res) => {
    //1.) Get req body or user details from frontend
    //2.) check username or email
    //3.) find the user
    //4.) check password
    //5.) generate access and refresh token
    //6.) send cookie

    //1.) Get req body or user details from frontend
    const { email, password, username } = req.body;

    //2.) check username or email
    if (!username && !email) {
        throw new ApiError(400, "email or username required")
    }

    //3.) find the user
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    //4.) check password

    if (!password) {
        throw new ApiError(400, "Password is required")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    //5.) generate access and refresh token

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id)

    //6.) send cookie

    //optional step to remove access of password or refresh token
    const loggedInUser = await User.findById(user._id).select("-password, -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
            200,
            {
                user: loggedInUser, refreshToken, accessToken
            },
            "User logged in  successfullly"
        )
    )

})

const logoutUser = asyncHandler(async (req, res) => {
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "Logout succeessfully"))

})

const refreshAccessToken = asyncHandler(async(req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request")
    }

   try {
     const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
 
     const user = await User.findById(decodedToken?._id)
 
     if(!user){
         throw new ApiError(401, "Invalid Refresh Token")
     }
 
     if(incomingRefreshToken !== user?.refreshToken){
         throw new ApiError(401, "Refresh token is expired or used")
     }
 
     const options = {
         httpOnly: true,
         secure: true
     }
 
     const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
 
     return res
     .status(200)
     .cookie("accessToken", accessToken, options)
     .cookie("refreshToken", newRefreshToken, options)
     .json(
         new ApiResponse(
             200,
             {
                 accessToken, 
                 refreshToken: newRefreshToken
             },
             "Access Token Refreshed" 
         )
        
     )
   } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh Token ")
    
   }
}) 

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(401, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave : false})

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Password created successfully"
        )
    )
})

const getCurrentUser = asyncHandler(async(req,res) => {
    return res
    .status(200)
    .json(200, req.user, "Current User fetched successfully")
})

const updateAccountDetails = asyncHandler(async(req,res) => {
    const {fullName, email} = req.body

    if(!fullName || !email){
        throw new ApiError(400, "All field are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Account details updated successfully")
    )
})

const updateUserAvatar = asyncHandler(async(req,res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}

    ).select("-password")


    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar updated successfully")
    )




})

const updateUserCoverImage = asyncHandler(async(req,res) => {
    const coverImageLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"CoverImage file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading coverImage")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}

    ).select("-password")

    
    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "coverImage updated successfully")
    )




})

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserAvatar,
    updateUserCoverImage
}