
const receiveAndSend = require('./utils/twilioUtil');
const igReelDLD = require('./utils/igReelDLD')

const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: true }));

app.post('/incoming', receiveAndSend);

app.get('/', (req, res) => {
    res.send('working fine')
})

app.listen(3000, () => {
    console.log("app started at 3000")
})


