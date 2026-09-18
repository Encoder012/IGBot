import mongoose from 'mongoose';
import ShortUrlModel from '../models/shortenUrl.model.js';

async function createShortUrl(originalUrl, shortCode, host) {
    if (mongoose.connection.readyState === 1) {
        try {
            await ShortUrlModel.findOneAndUpdate(
                { shortCode },
                { originalUrl },
                { upsert: true, returnDocument: 'after' }
            );
        } catch (dbErr) {
            console.warn("[ShortURL Warning] Could not persist shortcode to database:", dbErr.message);
        }
    } else {
        console.warn("[ShortURL Warning] Database not connected (readyState " + mongoose.connection.readyState + "), skipping DB persist.");
    }
    const protocol = (host && (host.includes('localhost') || host.includes('127.0.0.1'))) ? 'http' : 'https';
    const shortUrl = `${protocol}://${host}/p/${shortCode}`;
    console.log("Generated Short URL:", shortUrl);
    return {
        originalUrl,
        shortUrl
    };
}

async function getOriginalUrl(shortCode) {
    const url = await ShortUrlModel.findOne({ shortCode })
    if (!url) {
        throw new Error('URL not found')
    }
    return url.originalUrl;

}

export { createShortUrl, getOriginalUrl }
