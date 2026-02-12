import connectDB from './db/db.js';
import webhookRoutes from './routers/webhook.routes.js';
import urlRoutes from './routers/shorturl.routes.js';
import cors from "cors";
import express from 'express'
import errorHandler from "./middlewares/error.middleware.js"
import logRoutes from './routers/log.routes.js'
const app = express()

const corsOptions = {
    origin: "*"
}

app.use(cors(corsOptions))
app.use(express.urlencoded({ extended: true }));

app.use('/webhook', webhookRoutes)
app.use('/p', urlRoutes)
app.use('/logs', logRoutes)

app.use(errorHandler)


app.get('/', (req, res) => {
    res.send('working fine')
})


connectDB().then(() => { app.listen(3000); console.log("Application is running...") }).catch((error) => { console.log("error aa gyi") });
