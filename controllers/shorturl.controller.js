import { getOriginalUrl, createShortUrl } from '../services/urlShorten.service.js';
import getIGReel from '../services/instagram.service.js';

async function redirectToOriginal(req, res, next) {
    try {
        const { shortCode } = req.params;
        let originalUrl;

        try {
            originalUrl = await getOriginalUrl(shortCode);
        } catch {
            // If not in database, attempt to scrape fresh from Instagram using the shortcode
            const fresh = await getIGReel(shortCode);
            if (fresh?.url) {
                originalUrl = fresh.url;
                await createShortUrl(originalUrl, shortCode, req.get('host'));
            }
        }

        // Check if the cached link expired (Instagram CDN returns 403 when token expires)
        if (originalUrl) {
            try {
                const headCheck = await fetch(originalUrl, { method: 'HEAD' });
                if (!headCheck.ok) {
                    console.log(`[ShortURL] Cached link expired for ${shortCode}, fetching fresh link...`);
                    const freshData = await getIGReel(shortCode);
                    if (freshData?.url) {
                        originalUrl = freshData.url;
                        await createShortUrl(originalUrl, shortCode, req.get('host'));
                    }
                }
            } catch (err) {
                console.warn("[ShortURL Check]", err.message);
            }
            return res.redirect(originalUrl);
        }

        return res.status(404).send("URL not found or expired");
    } catch (error) {
        next(error);
    }
}

export default redirectToOriginal;