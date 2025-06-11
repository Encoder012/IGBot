
const axios = require('axios');
async function igReelDLD(url) {
    const resp = await axios.get(`https://instagram-reels-downloader-tau.vercel.app/api/video?postUrl=${url}`)
    const videoUrl = resp.data.data.videoUrl;
    return videoUrl;


}

module.exports = igReelDLD


