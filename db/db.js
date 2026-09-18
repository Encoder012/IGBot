import mongoose from "mongoose";
import 'dotenv/config';

let cachedConnection = null;

const connectDB = async () => {
    if (cachedConnection && mongoose.connection.readyState === 1) {
        return cachedConnection;
    }

    if (!process.env.MONGO_DB_URI) {
        console.warn("[DB Warning] MONGO_DB_URI is not set in environment variables. Database features will be disabled.");
        return null;
    }

    try {
        mongoose.set('bufferCommands', false); // Never buffer and freeze for 10s in serverless!
        cachedConnection = await mongoose.connect(process.env.MONGO_DB_URI, {
            serverSelectionTimeoutMS: 3000, // Timeout fast after 3s so Vercel does not 504
            connectTimeoutMS: 3000,
        });
        console.log("Database connected successfully.");
        return cachedConnection;
    } catch (error) {
        console.error("[DB Error] Database connection failed:", error.message);
        cachedConnection = null;
        return null;
    }
};

export default connectDB;


