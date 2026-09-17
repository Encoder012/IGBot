import 'dotenv/config';
import twilio from 'twilio';

/**
 * Normalizes a WhatsApp phone number to standard Twilio format: "whatsapp:+<E164>"
 */
export function formatWhatsAppNumber(phone) {
    if (!phone) return null;
    let cleaned = String(phone).trim();
    if (cleaned.startsWith('whatsapp:')) {
        cleaned = cleaned.replace('whatsapp:', '').trim();
    }
    cleaned = cleaned.replace(/^\++/, ''); // remove any redundant leading pluses
    return `whatsapp:+${cleaned}`;
}

/**
 * Sends a WhatsApp message via Twilio with media attachment or link fallback
 *
 * @param {Object|string} target - Options object OR legacy recipient phone number
 * @param {string} [legacyProfileName="there"] - Profile name for backward compatibility
 * @param {Object} [legacyDownloadUrl] - Download URL object for backward compatibility
 * @param {string} [legacyRespMessage] - Response message for backward compatibility
 */
async function twilioWhatsapp(target, legacyProfileName, legacyDownloadUrl, legacyRespMessage) {
    let to, profileName, directVideoUrl, shortUrl, sizeMb, message;

    if (typeof target === 'object' && target !== null && !('shortUrl' in target && legacyProfileName)) {
        ({ to, profileName = "there", directVideoUrl, shortUrl, sizeMb, message } = target);
    } else {
        to = target;
        profileName = legacyProfileName || "there";
        if (legacyDownloadUrl) {
            directVideoUrl = legacyDownloadUrl.originalUrl || legacyDownloadUrl.postUrl || legacyDownloadUrl.url;
            shortUrl = legacyDownloadUrl.shortUrl;
            sizeMb = legacyDownloadUrl.sizeMb;
        }
        message = legacyRespMessage;
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const rawTwilioPhone = process.env.TWILIO_PHONE;

    if (!accountSid || !authToken || !rawTwilioPhone) {
        console.error("[Twilio Error] Missing required Twilio environment variables:", {
            TWILIO_ACCOUNT_SID: accountSid ? "Configured" : "MISSING",
            TWILIO_AUTH_TOKEN: authToken ? "Configured" : "MISSING",
            TWILIO_PHONE: rawTwilioPhone ? "Configured" : "MISSING"
        });
        return { success: false, error: "Twilio environment variables not configured" };
    }

    const from = formatWhatsAppNumber(rawTwilioPhone);
    const recipient = formatWhatsAppNumber(to);

    if (!recipient) {
        console.error("[Twilio Error] Missing or invalid recipient WhatsApp number:", to);
        return { success: false, error: "Invalid recipient phone number" };
    }

    const client = twilio(accountSid, authToken);

    // WhatsApp API strictly enforces a 16MB limit on video media attachments.
    // If sizeMb is known and > 16MB, mediaUrl will fail; send the short/direct link directly as text.
    const isVideoWithinLimit = Boolean(directVideoUrl && (!sizeMb || sizeMb <= 16));

    if (isVideoWithinLimit) {
        try {
            console.log(`[Twilio] Sending video media to ${recipient} (Size: ${sizeMb ? sizeMb + 'MB' : 'unknown'})...`);
            const caption = message || `Hello ${profileName}! Here is your video 🎥\n\nDownload Link: ${shortUrl || directVideoUrl}`;

            const response = await client.messages.create({
                from,
                to: recipient,
                body: caption,
                mediaUrl: [directVideoUrl]
            });

            console.log(`[Twilio] Video message dispatched successfully! SID: ${response.sid}`);
            return { success: true, sid: response.sid };
        } catch (mediaError) {
            console.warn(`[Twilio Warning] Media send failed (${mediaError.message}). Falling back to text message with link.`);
            // Fallback to text message below
        }
    }

    // Text message delivery (either because video > 16MB, mediaUrl failed, or informational message)
    let bodyText = message;
    if (!bodyText) {
        if (shortUrl || directVideoUrl) {
            const videoLink = shortUrl || directVideoUrl;
            const sizeNotice = sizeMb && sizeMb > 16
                ? `\n\n(Note: Video size is ${sizeMb} MB, which exceeds WhatsApp's 16MB direct attachment limit, but you can view and download it directly using the link above!)`
                : '';
            bodyText = `Hello ${profileName}! 🎥\n\nHere is your video download link:\n${videoLink}${sizeNotice}`;
        } else {
            bodyText = `Hello ${profileName}, we could not fetch your video. Please verify the link and try again.`;
        }
    }

    try {
        console.log(`[Twilio] Sending text message to ${recipient}...`);
        const response = await client.messages.create({
            from,
            to: recipient,
            body: bodyText
        });

        console.log(`[Twilio] Text message dispatched successfully! SID: ${response.sid}`);
        return { success: true, sid: response.sid };
    } catch (textError) {
        console.error(`[Twilio Error] Failed to send WhatsApp text message:`, {
            message: textError.message,
            code: textError.code,
            moreInfo: textError.moreInfo,
            status: textError.status
        });
        return { success: false, error: textError.message };
    }
}

export default twilioWhatsapp;