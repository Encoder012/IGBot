import { connect } from "mongoose";
import { configDotenv } from "dotenv";
configDotenv()
const connectDB = async () => {
    try {
        const uri = `${process.env.MONGO_DB_URI}`;
        const db = await connect(uri);
        console.log("databse connected");
    } catch (error) {
        console.log(error);
        process.exit(1)
    }
}
export default connectDB;


