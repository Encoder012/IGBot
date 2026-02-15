import ShortUrlModel from '../models/shortenUrl.model.js';



async function createShortUrl(originalUrl, shortCode, host) {
    let instance = await ShortUrlModel.findOne({ shortCode });
    if (!instance) {
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
