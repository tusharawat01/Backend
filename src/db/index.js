import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
const mongodbUri = process.env.MONGODB_URI;



const connectDB = async () => {

    try {
        const connectionInstance = await mongoose.connect(`${mongodbUri}/${DB_NAME}`)
        console.log(`\n MongoDB Connected !! DB HOST : ${connectionInstance.connection.host}`);
    }
    catch (error) {
        console.error("MongoDB Connection Error : ", error);
        process.exit(1);
    }

}

export default connectDB;