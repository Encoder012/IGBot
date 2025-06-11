
const igReelDLD = require('./igReelDLD')

require('dotenv').config();


async function receiveAndSend(req, res) {
    const { body } = req;
    const clientWaId = req.body.WaId;
    const profileName = req.body.ProfileName;
    console.log(req.body)
    const url = req.body.Body;

    const downloadUrl = await igReelDLD(url);
    console.log(downloadUrl)
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_PHONE = process.env.TWILIO_PHONE;
    const client = require('twilio')(accountSid, authToken);



    // const { MessagingResponse } = require('twilio').twiml;

    await client.messages
        .create({
            from: TWILIO_PHONE,
            to: `whatsapp:+${clientWaId}`,
            body: `hello ${profileName}`,
            mediaUrl: [downloadUrl],
        })



}
module.exports = receiveAndSend