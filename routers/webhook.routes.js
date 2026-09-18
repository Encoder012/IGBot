import { Router } from 'express';
const router = Router();
import webhookWhatsapp from '../controllers/webhook.controller.js';

router.post('/whatsapp', webhookWhatsapp);
router.post('/', webhookWhatsapp);
router.get('/', (req, res) => res.send("Webhook endpoint is active"));

export default router;
