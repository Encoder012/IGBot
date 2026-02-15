import getIGReel from "../services/instagram.service.js";
import twilioWhatsapp from "../services/twilio.service.js";
import { createShortUrl } from "../services/urlShorten.service.js";
import getPlatform from "../services/identifyPlatform.service.js";

const webhookWhatsapp = async (req, res) => {
    const host = req.get('host');
    const clientWaId = req.body.WaId;
    const profileName = req.body.ProfileName;
    console.log(req.body)
    const url = req.body.Body;
    const platform = getPlatform(url);
    if (platform) {
        const fetchPost = {
            INSTAGRAM: getIGReel
        }
        const { postUrl, shortcode } = await fetchPost[platform](url);
        console.log("--------------------------")
        console.log(postUrl)
        console.log(shortcode)
        console.log("--------------------------")
        if (postUrl) {
            const shortUrl = await createShortUrl(postUrl, shortcode, host);
            twilioWhatsapp(clientWaId, profileName, shortUrl, "")
        } else {
            twilioWhatsapp(clientWaId, profileName, null, "Could not fetch the post please try again.")
        }
    } else {
        twilioWhatsapp(clientWaId, profileName, null, "Could not fetch the post, please try again.")
    }
}

export default webhookWhatsapp