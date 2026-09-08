import getIGReel from "../services/instagram.service.js";
import twilioWhatsapp from "../services/twilio.service.js";
import { createShortUrl } from "../services/urlShorten.service.js";
import getPlatform from "../services/identifyPlatform.service.js";

const webhookWhatsapp = async (req, res) => {
    const host = req.get('host');
    const clientWaId = req.body.WaId;
    const profileName = req.body.ProfileName || "there";
    console.log("Incoming Webhook Body:", req.body);

    const messageBody = req.body.Body || "";
    const platform = getPlatform(messageBody);

    if (platform) {
        const fetchPost = {
            INSTAGRAM: getIGReel
        };

        try {
            const { postUrl, shortcode } = await fetchPost[platform](messageBody);
            console.log("--------------------------");
            console.log("Extracted Post URL:", postUrl);
            console.log("Shortcode:", shortcode);
            console.log("--------------------------");

            if (postUrl) {
                const shortUrl = await createShortUrl(postUrl, shortcode, host);
                await twilioWhatsapp(clientWaId, profileName, shortUrl, "");
            } else {
                await twilioWhatsapp(clientWaId, profileName, null, "Could not fetch the post, please try again.");
            }
        } catch (error) {
            console.error("Error fetching video for platform", platform, error.message);
            await twilioWhatsapp(clientWaId, profileName, null, "Could not fetch the post. The post may be private, images-only, or unavailable.");
        }
    } else {
        await twilioWhatsapp(clientWaId, profileName, null, "Could not identify a supported video platform link. Please send a valid Instagram link.");
    }

    // Always acknowledge Twilio webhook with 200 OK
    res.status(200).type('text/xml').send('<Response></Response>');
};

export default webhookWhatsapp;