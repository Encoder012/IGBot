import { configDotenv } from 'dotenv';
import twilio from 'twilio'

configDotenv()

async function twilioWhatsapp(clientWaId, profileName, downloadUrl, respMessage) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_PHONE = process.env.TWILIO_PHONE;
    const client = twilio(accountSid, authToken);
    if (!downloadUrl) {
        await client.messages
            .create({
                from: TWILIO_PHONE,
                to: `whatsapp:+${clientWaId}`,
                body: respMessage,
            })
        return;
    } else {
        await client.messages
            .create({
                from: TWILIO_PHONE,
                to: `whatsapp:+${clientWaId}`,
                body: `hello ${profileName}`,
                mediaUrl: [downloadUrl.shortUrl],
            })
    }
}

export default twilioWhatsapp