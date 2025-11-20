"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
/**
 * Sentry Webhook Handler
 * POST /api/sentry/webhook
 */
router.post('/sentry/webhook', async (req, res) => {
    try {
        // Verify webhook signature
        const signature = req.headers['sentry-hook-signature'];
        const secret = process.env.SENTRY_WEBHOOK_SECRET || '';
        if (secret) {
            const hmac = crypto_1.default.createHmac('sha256', secret);
            hmac.update(JSON.stringify(req.body));
            const expectedSignature = hmac.digest('hex');
            if (signature !== expectedSignature) {
                console.error('[Sentry Webhook] Invalid signature');
                res.status(401).json({ error: 'Invalid signature' });
                return;
            }
        }
        const event = req.body;
        const action = event.action;
        const issue = event.data?.issue;
        console.log(`[Sentry Webhook] ${action}: ${issue?.title || 'No title'}`);
        // Handle different event types
        switch (action) {
            case 'created':
                if (issue?.level === 'error' && issue?.count > 10) {
                    console.log(`[Sentry] High-frequency error detected: ${issue.title}`);
                }
                break;
            case 'resolved':
                console.log(`[Sentry] Issue resolved: ${issue?.id}`);
                break;
            case 'assigned':
                console.log(`[Sentry] Issue assigned: ${issue?.id}`);
                break;
        }
        res.json({ received: true });
    }
    catch (error) {
        console.error('[Sentry Webhook] Error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=sentry.webhook.routes.js.map