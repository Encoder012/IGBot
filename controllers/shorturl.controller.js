import { getOriginalUrl } from '../services/urlShorten.service.js';

async function redirectToOriginal(req, res, next) {
    try {
        const { shortCode } = req.params;
        const originalUrl = await getOriginalUrl(shortCode);
        return res.redirect(originalUrl);
    } catch (error) {
        next(error);
    }
}

export default redirectToOriginal;