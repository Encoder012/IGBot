
const axios = require('axios');
async function igReelDLD(igUrl) {
    const reelId = igUrl.split('/reel/')[1].split('/')[0];
    console.log("Reel Id: ", reelId)
    let videoUrl = null;
    try {
        const resp = await axios.get(`https://gram-grabberz.vercel.app/api/instagram/p/${reelId}`);
        videoUrl = resp.data.data.xdt_shortcode_media.video_url
    } catch (e) {

        const resp = await axios.get(`https://instagram-reels-downloader-tau.vercel.app/api/video?postUrl=${igUrl}`)
        videoUrl = resp.data.data.videoUrl;

    }

    return videoUrl;
}



module.exports = igReelDLD


