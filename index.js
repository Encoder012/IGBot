import connectDB from './db/db.js';
import webhookRoutes from './routers/webhook.routes.js';
import urlRoutes from './routers/shorturl.routes.js';
import cors from "cors";
import express from 'express'

const app = express()

const corsOptions = {
    origin: "*"
}

app.use(cors(corsOptions))
app.use(express.urlencoded({ extended: true }));
app.use('/webhook', webhookRoutes)
app.use('/p', urlRoutes)

app.get('/', (req, res) => {
    res.send('working fine')
})


connectDB().then(() => { app.listen(3000); console.log("Application is running...") }).catch((error) => { console.log("error aa gyi") });
