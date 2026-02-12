import { Router } from "express";
import { getlogs } from "../utils/logger.js";

const router = Router()
router.get('/', (req, res) => {
    res.json({
        count: getlogs().length,
        logs: getlogs()
    });
});

export default router;