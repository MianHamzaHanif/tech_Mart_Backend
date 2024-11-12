import dotenv from "dotenv";
import mongoose from 'mongoose';
import { app } from './app.js'
import { connectDB } from './db/index.js';

dotenv.config({
    path: './env'
})
connectDB()
    .then(() => {
        app.listen(process.env.PORT, () => {
            console.log(`Server is running at port: ${process.env.PORT}`);
        })
    }).catch((error) => {
        console.log("DB Disconnect", error);
    })