
const igReelDLD = require('./igReelDLD')
const getIGReel = require('./fetchIGReel')

require('dotenv').config();


async function receiveAndSend(req, res) {

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_PHONE = process.env.TWILIO_PHONE;
    const client = require('twilio')(accountSid, authToken);

    const { body } = req;
    const clientWaId = req.body.WaId;
    const profileName = req.body.ProfileName;
    console.log(req.body)
    const url = req.body.Body;

    if (!url.includes("instagram")) {
        console.log("recieved not insta req")
        await client.messages
            .create({
                from: TWILIO_PHONE,
                to: `whatsapp:+${clientWaId}`,
                body: `hello please send instagram links only for now`,
            })
        return;
    }

    const downloadUrl = await getIGReel(url);
    console.log(downloadUrl)




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