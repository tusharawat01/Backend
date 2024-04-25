import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessTokenAndRefreshTokens = async (userId) => {
    try {
        const user = User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh tokens")
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
    if (!username || !email) {
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

    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshTokens(user._id)

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
            200,
            {
                user: loggedInUser, refreshToken, accessToken
            },
            "User logged in  successfullly"
        )



})

export { registerUser, loginUser }