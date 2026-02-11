import { Schema, model } from "mongoose"
const shortUrlSchema = new Schema({
    originalUrl: {
        type: String,
        required: true
    },
    shortCode: {
        type: String,
        required: true,
        unique: true
    }
})
const ShortUrlModel = model("ShortUrl", shortUrlSchema)
export default ShortUrlModel