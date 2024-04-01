//common js syntax
// require('dotenv').config({ path: './.env' });    

//Modular syntax
import dotenv from 'dotenv';

import { app } from "./app.js"
import connectDB from "./db/index.js";

dotenv.config({
    path: "./.env"
});


connectDB()
    .then(() => {
        app.on("error", (error) => {
            console.error("Express side error : ", error);
            throw error;
        })
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server is running on PORT : ${process.env.PORT}`)
        })
    })
    .catch((error) => {
        console.log("MongoDB connection Failed : ", error)
    })

// import express from "express";
// const app = express();

// (async () => {
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//         app.on("error", (error) => {
//             console.error("Express side error : ", error);
//             throw error;
//         });

//         app.listen(process.env.PORT, () => {
//             console.log(`App is listening on port ${process.env.PORT}`);
//         })
//     }
//     catch (error) {
//         console.error("ERROR : ", error);
//         throw error;
//     }
// })();