import { Router } from 'express'
const router = Router()
import webhookWhatsapp from '../controllers/webhook.controller.js'

router.post('/whatsapp', webhookWhatsapp)

export default router
