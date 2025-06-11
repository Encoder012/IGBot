
const axios = require('axios');
async function igReelDLD(igUrl) {
    const igUrl = "https://www.instagram.com/reel/DHQGCdTR4Yg/?igsh=OHNwbG92djQwMDNj"
    const reelId = igUrl.split('/reel/')[1].split('/')[0];
    console.log("Reel Id: ", reelId)
    // const resp = await axios.get(`https://instagram-reels-downloader-tau.vercel.app/api/video?postUrl=${url}`)
    // const videoUrl = resp.data.data.videoUrl;
    const resp = await axios.get(`"https://gram-grabberz.vercel.app/api/instagram/p/${reelId}`);
    const videoUrl = resp.data.xdt_shortcode_media.video_url
    return videoUrl;


}

module.exports = igReelDLD


