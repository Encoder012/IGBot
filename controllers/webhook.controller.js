import getIGReel from "../services/instagram.service.js";
import twilioWhatsapp from "../services/twilio.service.js";
import { createShortUrl } from "../services/urlShorten.service.js";

const webhookWhatsapp = async (req, res) => {
    const protocol = req.protocol;
    const host = req.get('host');
    const { body } = req;
    const clientWaId = req.body.WaId;
    const profileName = req.body.ProfileName;
    var respMessage = "";
    console.log(req.body)
    const url = req.body.Body;
    if (url.includes("instagram")) {
        const igURL = await getIGReel(url);
        if (igURL) {
            // const shortenUrl = await createShortUrl(igURL, protocol, host);
            twilioWhatsapp(clientWaId, profileName, igURL, "")

        } else {
            twilioWhatsapp(clientWaId, profileName, null, "Could not fetch the reel, please try again.")
        }
    } else {
        twilioWhatsapp(clientWaId, profileName, null, "Please send instagram reels only for now.")
    }

}

export default webhookWhatsapp