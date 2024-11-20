import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from './routes/user.routes.js';

const app = express();

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN, // You can set this in your .env file
    credentials: true, // Corrected: "credentials" (not "Credential")
}));

// Middleware to handle JSON and URL-encoded data
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// Serve static files from 'public' directory (optional)
app.use(express.static("public"));

// Cookie parser middleware
app.use(cookieParser());

// User-related routes
app.use("/api/users", userRouter);

export { app };
