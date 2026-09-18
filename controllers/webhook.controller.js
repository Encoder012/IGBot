import twilioWhatsapp from "../services/twilio.service.js";
import getIGReel from "../services/instagram.service.js";
import { createShortUrl } from "../services/urlShorten.service.js";
import getPlatform from "../services/identifyPlatform.service.js";

const webhookWhatsapp = async (req, res) => {
    const host = req.get('host');
    const toUser = req.body.From || req.body.WaId;
    const profileName = req.body.ProfileName || "there";
    console.log("Incoming Webhook Body:", req.body);

    const messageBody = req.body.Body || "";
    const platform = getPlatform(messageBody);

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

                if (sizeMb && sizeMb <= 16) {
                    console.log(`[Webhook] Size is ${sizeMb}MB (<= 16MB). Sending video directly...`);
                    await twilioWhatsapp({
                        to: toUser,
                        profileName,
                        directVideoUrl: postUrl,
                        shortUrl: shortUrlData.shortUrl,
                        sizeMb
                    });
                } else {
                    console.log(`[Webhook] Size is ${sizeMb}MB (> 16MB). Sending short URL text message...`);
                    await twilioWhatsapp({
                        to: toUser,
                        profileName,
                        message: `Here's the link for your video:\n${shortUrlData.shortUrl}`
                    });
                }
            } else {
                await twilioWhatsapp({
                    to: toUser,
                    profileName,
                    message: "Could not fetch the video stream. Please ensure the post is public and contains a video."
                });
            }
        } catch (error) {
            console.error("Error extracting video for platform", platform, error.message);
            await twilioWhatsapp({
                to: toUser,
                profileName,
                message: "Could not fetch the post. The post may be private, images-only, or unavailable."
            });
        }
    } else {
        await twilioWhatsapp({
            to: toUser,
            profileName,
            message: "Could not identify a supported video platform link. Please send a valid Instagram link."
        });
    }

    // Always acknowledge Twilio webhook with 200 OK empty response
    res.status(200).type('text/xml').send('<Response></Response>');
};

export default webhookWhatsapp;