import crypto from 'crypto';
import ShortUrlModel from '../models/shortenUrl.model.js';

function genShortUrlCode() {
    return crypto.randomBytes(8).toString('hex');
}

async function createShortUrl(originalUrl, protocol, host) {
    let shortCode = await ShortUrlModel.findOne({ originalUrl });
    if (!shortCode) {
        shortCode = genShortUrlCode()
        const newUrl = await ShortUrlModel.create({
            originalUrl,
            shortCode
        });
    }
    const shortUrl = `https://${host}/p/${shortCode}`
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
