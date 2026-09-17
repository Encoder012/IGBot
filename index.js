import 'dotenv/config';
import connectDB from './db/db.js';
import webhookRoutes from './routers/webhook.routes.js';
import urlRoutes from './routers/shorturl.routes.js';
import cors from "cors";
import express from 'express';
import errorHandler from "./middlewares/error.middleware.js";
import logRoutes from './routers/log.routes.js';

const app = express();

const corsOptions = {
    origin: "*"
};

app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/webhook', webhookRoutes);
app.use('/p', urlRoutes);
app.use('/logs', logRoutes);

app.use(errorHandler);

app.get('/', (req, res) => {
    res.send('Instagram WhatsApp Bot is running fine');
});

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
    app.listen(PORT, () => console.log(`Application is running on port ${PORT}...`));
}).catch((error) => {
    console.error("Initialization error:", error);
});

export default app;
