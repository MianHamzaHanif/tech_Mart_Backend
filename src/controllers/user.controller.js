import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { user } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const registerUser =  asyncHandler ( async (req, res)  => {
    // res.status(200).json({
    //     message: "ok"
    // })

    const { userName, email, fullName, password } = req.body;

    console.log("userName", userName, "email",email, "fullName", fullName,"password", password);
    
    if([userName, email, fullName, password ].some((field) => field?.trim() === "" )){
        throw new ApiError(400,"All field is Required");
    }
    const existedUser = await user.findOne({
        $or: [{userName}, {email}]
    })

    console.log("existedUser",existedUser);

    if(existedUser){
        throw new ApiError(409,"User and Email is already exist");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is Required");
    }
    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover Image is Required");
    }
    console.log("avatarLocalPath",avatarLocalPath);
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    console.log("avatar",avatar);

    if(!avatar){
        throw new ApiError(400,"Avatar is not upload");
    }
    if(!coverImage){
        throw new ApiError(400,"Cover Image is not upload");
    }

    const userInfo = await user.create({
        userName: userName.toLowerCase(),
        email,
        fullName,
        password,
        avatar: avatar.url,
        coverImage: coverImage.url
            
        })

    const createUser = await user.findById(userInfo.id).select("-password -refreshToken");

    if(!createUser){
        throw new ApiError(500,"Somthing went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(200, createUser, "User Register Successfully")
    )

})

export { registerUser };