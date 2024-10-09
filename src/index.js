import dotenv from "dotenv";
import { connectDB } from './db/index.js';
import { app } from './app.js'

import mongoose from 'mongoose';
import { User } from './models/user.model.js'; // Adjust the path to your model

async function dropWalletAddressIndex() {
    await mongoose.connect('mongodb+srv://hanif123:Hamza123@cluster0.ezmrlx5.mongodb.net/'); // Replace with your MongoDB URI

    // Drop the walletAddress index if it exists
    await User.collection.dropIndex('email_1');

    console.log('walletAddress index dropped');
    mongoose.connection.close();
}

dotenv.config({
    path: './env'
})
connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server is running at port: ${process.env.PORT}`);
            // dropWalletAddressIndex()
        })
    }).catch((error) => {
        console.log("DB Disconnect", error);
    })


/*
import  express  from "express";
const app = express();

;( async () =>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_Name}`);
        app.on("error", (error) => {
            console.log("Error Express", error);
            throw error;
        })

        app.listen(process.env.PORT,() => {
            console.log(`App is ready ${process.env.PORT}`);
        })
    } catch (error) {
        console.log("error");
    }
})()

*/