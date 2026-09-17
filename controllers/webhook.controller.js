import twilio from 'twilio';
import getIGReel from "../services/instagram.service.js";
import { createShortUrl } from "../services/urlShorten.service.js";
import getPlatform from "../services/identifyPlatform.service.js";

const { MessagingResponse } = twilio.twiml;

const webhookWhatsapp = async (req, res) => {
    const host = req.get('host');
    console.log("Incoming Webhook Body:", req.body);

    const messageBody = req.body.Body || "";
    const platform = getPlatform(messageBody);
    const twiml = new MessagingResponse();

    if (platform) {
        const fetchPost = {
            INSTAGRAM: getIGReel
        };

        try {
            console.log(`Extracting post for platform ${platform}: ${messageBody}`);
            const { postUrl, shortcode, sizeMb } = await fetchPost[platform](messageBody);
            console.log("--------------------------");
            console.log("Extracted Post URL:", postUrl);
            console.log("Shortcode:", shortcode);
            console.log("Size MB:", sizeMb);
            console.log("--------------------------");

            if (postUrl) {
                const shortUrlData = await createShortUrl(postUrl, shortcode, host);
                const msg = twiml.message();
                if (sizeMb <= 16) {
                    msg.media(postUrl);
                } else {
                    msg.body(shortUrlData.shortUrl);
                }
            } else {
                twiml.message("Could not fetch the video stream. Please ensure the post is public and contains a video.");
            }
        } catch (error) {
            console.error("Error extracting video for platform", platform, error.message);
            twiml.message("Could not fetch the post. The post may be private, images-only, or unavailable.");
        }
    } else {
        twiml.message("Could not identify a supported video platform link. Please send a valid Instagram link.");
    }

    const xmlResponse = twiml.toString();
    console.log("Dispatched TwiML Response to Twilio:\n", xmlResponse);
    res.status(200).type('text/xml').send(xmlResponse);
};

export default webhookWhatsapp;