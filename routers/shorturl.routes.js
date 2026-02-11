import { Router } from 'express'
import redirectToOriginal from '../controllers/shorturl.controller.js'
const router = Router()

router.get('/:shortCode', redirectToOriginal)

export default router