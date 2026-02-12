import crypto from 'crypto';
import ShortUrlModel from '../models/shortenUrl.model.js';



async function createShortUrl(originalUrl, shortcode, host) {
    let shortCode = await ShortUrlModel.findOne({ shortcode });
    if (!shortCode) {
        const newUrl = await ShortUrlModel.create({
            originalUrl,
            shortCode
        });
    }
    const shortUrl = `https://${host}/p/${shortcode}`
    console.log(shortUrl)
    return {
        originalUrl,
        shortUrl
    }
}

async function getOriginalUrl(shortCode) {
    const url = await ShortUrlModel.findOne({ shortCode })
    if (!url) {
        throw new Error('URL not found')
    }
    return url.originalUrl;

}

export { createShortUrl, getOriginalUrl }
