import { connect } from "mongoose";
import 'dotenv/config';

const connectDB = async () => {
    try {
        if (!process.env.MONGO_DB_URI) {
            console.warn("[DB Warning] MONGO_DB_URI is not set in environment variables. Database features will be disabled.");
            return;
        }
        await connect(process.env.MONGO_DB_URI);
        console.log("Database connected successfully.");
    } catch (error) {
        console.error("[DB Error] Database connection failed:", error.message);
    }
};

export default connectDB;


