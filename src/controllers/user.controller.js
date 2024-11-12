import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { validate } from "deep-email-validator";
import nodemailer from "nodemailer";

const generateAccessAndRefereshTokens = async (userId) => {
    try {
        // Retrieve user by ID
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        // Generate access and refresh tokens
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // Save the refresh token to the user document
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        // Return tokens
        return { accessToken, refreshToken };
    } catch (error) {
        console.error(`Error generating tokens for user ${userId}:`, error);
        throw new ApiError(500, "Something went wrong while generating access and refresh tokens");
    }
};

const registerUser = asyncHandler(async (req, res) => {
    const { userName, role, email, password } = req.body;

    // Ensure all fields are filled
    if ([userName, role, email, password].some((field) => !field || field.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // Validate email format
    const validationResult = await validate(email);
    if (!validationResult.valid) {
        return res.status(400).json({
            status: 'error',
            message: 'Email is not valid. Please try again!',
            reason: validationResult.reason
        });
    }

    // Validate role (example roles: "admin","manager", "user")
    const allowedRoles = ["admin", "manager", "user"];
    if (!allowedRoles.includes(role.toLowerCase())) {
        throw new ApiError(400, "Invalid role provided");
    }

    // Check for existing user by username or email
    const existingUser = await User.findOne({
        $or: [{ userName }, { email }]
    });

    if (existingUser) {
        throw new ApiError(409, "User email or username already exists");
    }

    // Create the new user with hashed password
    const newUser = new User({
        userName: userName.toLowerCase(),
        role: role.toLowerCase(),
        email: email.toLowerCase(),
        password
    });

    await newUser.save();

    const createdUser = await User.findById(newUser._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    // Send successful response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    );
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Ensure both email and password are provided
    if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
    }

    // Check if user exists in the database
    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    // Verify the provided password
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    // Generate access and refresh tokens
    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);

    // Retrieve user details excluding sensitive fields
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    // Define secure cookie options
    const cookieOptions = {
        httpOnly: true, // Prevent client-side JS access to cookies
        secure: true,
        sameSite: 'strict', // Restrict cross-site sending
        maxAge: process.env.REFRESH_TOKEN_EXPIRY_MS // Set refresh token expiry (in milliseconds)
    };

    // Set cookies and send response
    res
        .status(200)
        .cookie("accessToken", accessToken, { ...cookieOptions, maxAge: process.env.ACCESS_TOKEN_EXPIRY_MS })
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "User logged in successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    // Check if user ID is available (user is authenticated)
    if (!req.user || !req.user._id) {
        throw new ApiError(401, "User is not authenticated");
    }

    // Remove the refresh token from the database
    await User.findByIdAndUpdate(
        req.user._id,
        { $unset: { refreshToken: 1 } },
        { new: true }
    );

    // Set secure cookie options
    const cookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'strict'
    };

    // Clear the access and refresh token cookies
    res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const changePasswordAfterLogin = asyncHandler(async (req, res) => {
    const { email, oldPassword, newPassword } = req.body;

    if ([email, oldPassword, newPassword].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // Check if new password meets complexity requirements
    if (newPassword.length < 8) {
        throw new ApiError(400, "New password must be at least 8 characters long.");
    }

    const user = await User.findOne({ email });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid Password");
    }

    // Set new password and save user
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(200, {}, "Password changed successfully")
    );
});

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // Generates a 6-digit OTP
};

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const changeUserPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const OTPCodeGenerate = generateOTP();
    const otpExpiry = Date.now() + 3600000; // Set expiry to 1 hour from now

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your OTP Code",
        html: `<p>Your OTP code is: <strong>${OTPCodeGenerate}</strong>. It is valid for 60 minutes.</p>`,
    };

    await transporter.sendMail(mailOptions);

    user.OTPCode = OTPCodeGenerate;
    user.otpExpiry = otpExpiry;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "OTP for password reset has been sent to your email.")
        );
});

const resetUserPassword = asyncHandler(async (req, res) => {
    const { email, OTPCode, newPassword } = req.body;

    if (!email || !OTPCode || !newPassword || newPassword.trim() === "") {
        throw new ApiError(400, "All fields are required");
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        // Check OTP validity and expiry
        if (user.OTPCode !== OTPCode) {
            throw new ApiError(400, "Invalid OTP code");
        }

        if (user.otpExpiry && Date.now() > user.otpExpiry) {
            throw new ApiError(400, "OTP has expired");
        }

        // Set the new password (ensure it hashes in pre-save hook)
        user.password = newPassword;

        // Clear OTP fields after use
        user.OTPCode = undefined;
        user.otpExpiry = undefined;

        await user.save({ validateBeforeSave: false });

        return res.status(200).json(
            new ApiResponse(200, {}, "Password changed successfully")
        );
    } catch (error) {
        console.error("Error during password reset:", error);
        return res.status(400).json(
            new ApiError(400, "Invalid or expired token")
        );
    }
});

const getAllUser = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 10; // Default to 10 users per page
    const skip = (page - 1) * limit;

    try {
        const userAll = await User.find()
            .select("-password -refreshToken -createdAt -updatedAt -__v")
            .skip(skip)
            .limit(limit);

        const totalUsers = await User.countDocuments(); // Count total users for pagination metadata

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    userAll,
                    pagination: {
                        page,
                        limit,
                        total: totalUsers,
                        totalPages: Math.ceil(totalUsers / limit),
                    }
                },
                "All users list"
            )
        );
    } catch (error) {
        throw new ApiError(500, "Error fetching users");
    }
});

const editUserName = asyncHandler(async (req, res) => {
    const { userName } = req.body;

    // Check if the new userName is provided and not empty
    if (!userName || userName.trim() === "") {
        throw new ApiError(400, "Username is required and cannot be empty.");
    }

    // Fetch the user from the database
    const user = await User.findById(req.user._id);

    if (!user) {
        throw new ApiError(404, "User not found.");
    }

    // Check if the username is different from the current one
    if (user.userName === userName) {
        throw new ApiError(400, "New username cannot be the same as the current one.");
    }

    // Update the username
    user.userName = userName;

    // Save the updated user document
    const updatedUser = await user.save();

    if (!updatedUser) {
        throw new ApiError(500, "Something went wrong while updating the username.");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                userName: updatedUser.userName,
                user: updatedUser, // Return full updated user object
            },
            "User name changed successfully"
        )
    );
});

const userDelete = asyncHandler(async (req, res) => {
    // Ensure that user role is admin
    const user = await User.findById(req.user._id);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Only allow admins to delete users
    if (user.role !== "admin") {
        throw new ApiError(403, "Only Admin can delete records");
    }

    // Validate that email is provided in the request body
    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required to delete a user");
    }

    // Attempt to find and delete the user by email
    const result = await User.findOneAndDelete({ email });

    if (!result) {
        throw new ApiError(404, "User not found with the given email");
    }

    // Successfully deleted the user
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    email,
                },
                "User deleted successfully"
            )
        );
});

const getUserCount = asyncHandler(async (req, res) => {
    try {
        const userCount = await User.countDocuments();  // Count the total number of users
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {
                        userCount,
                    },
                    "total users in DB"
                )
            );
    } catch (error) {
        console.error("Error fetching user count:", error);  // Handle any potential errors
    }
});

const searchUser = asyncHandler(async (req, res) => {
    const searchQuery = req.query.q;

    if (!searchQuery || searchQuery.trim() === "") {
        return res.status(400).json({ message: "Search query is required" });
    }

    try {
        const users = await User.find({
            $or: [
                { userName: { $regex: searchQuery, $options: "i" } }, // Case-insensitive search by userName
                { email: { $regex: searchQuery, $options: "i" } },    // Case-insensitive search by email
            ],
        });

        if (users.length === 0) {
            return res.status(404).json({ message: "No users found matching the query" });
        }

        return res.status(200).json({
            users,
            message: "Users fetched successfully",
        });
    } catch (error) {
        console.error("Error fetching users:", error);  // Log the error for debugging purposes
        return res.status(500).json({ message: "Error fetching users" });
    }
});

export {
    registerUser,
    loginUser,
    logoutUser,
    changePasswordAfterLogin,
    changeUserPassword,
    resetUserPassword,
    getAllUser,
    editUserName,
    userDelete,
    getUserCount,
    searchUser
}