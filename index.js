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

// Immediate request logger so Vercel runtime logs show all traffic
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// Trigger cached database connection on demand
app.use(async (req, res, next) => {
    try {
        await connectDB();
    } catch (e) {
        console.warn("[DB Hook Error]", e.message);
    }
    next();
});

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
