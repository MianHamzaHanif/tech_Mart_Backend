import dotenv from "dotenv";
import { connectDB } from './db/index.js';

dotenv.config({
    path: './env'
})

connectDB()
.then( () =>{
    app.listen(process.env.PORT || 8000, () => {
        console.log(`App is ready: ${process.env.PORT}`);
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