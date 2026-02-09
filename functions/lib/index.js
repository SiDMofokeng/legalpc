"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappWebhook = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
admin.initializeApp();
const WHATSAPP_VERIFY_TOKEN = (0, params_1.defineSecret)('WHATSAPP_VERIFY_TOKEN');
const DEFAULT_ACCOUNT_UID = (0, params_1.defineSecret)('DEFAULT_ACCOUNT_UID');
function makeTicketId() {
    const n = Date.now();
    const r = Math.random().toString(16).slice(2, 8).toUpperCase();
    return `TKT-${n}-${r}`;
}
/**
 * WhatsApp Cloud API style webhook:
 * - GET: verification (hub.challenge)
 * - POST: incoming messages/events
 */
exports.whatsappWebhook = (0, https_1.onRequest)({
    region: 'us-central1',
    secrets: [WHATSAPP_VERIFY_TOKEN, DEFAULT_ACCOUNT_UID],
}, async (req, res) => {
    // CORS (basic)
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    // Verification handshake
    if (req.method === 'GET') {
        const mode = String(req.query['hub.mode'] || '');
        const token = String(req.query['hub.verify_token'] || '');
        const challenge = String(req.query['hub.challenge'] || '');
        const verifyToken = WHATSAPP_VERIFY_TOKEN.value().trim();
        if (mode === 'subscribe' && token === verifyToken) {
            res.status(200).send(challenge);
            return;
        }
        res.status(403).send('Forbidden');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        const defaultUid = DEFAULT_ACCOUNT_UID.value();
        // Best-effort parse
        const body = req.body || {};
        // Extract something human-readable to create a ticket from.
        // We intentionally keep this permissive (webhook shapes vary).
        const eventType = body?.object || 'unknown';
        const entries = Array.isArray(body?.entry) ? body.entry : [];
        let from = '';
        let text = '';
        for (const e of entries) {
            const changes = Array.isArray(e?.changes) ? e.changes : [];
            for (const c of changes) {
                const v = c?.value;
                const msgs = Array.isArray(v?.messages) ? v.messages : [];
                for (const m of msgs) {
                    from = String(m?.from || from);
                    const t = m?.text?.body;
                    if (typeof t === 'string')
                        text = t;
                    if (text)
                        break;
                }
            }
        }
        const ticketId = makeTicketId();
        const nowIso = new Date().toISOString();
        const ticketDoc = {
            id: ticketId,
            customerName: from ? `WhatsApp ${from}` : 'WhatsApp User',
            subject: text ? text.slice(0, 60) : 'New inbound message',
            status: 'open',
            priority: 'medium',
            lastUpdate: nowIso,
            agent: 'Webhook',
            conversation: text
                ? [
                    {
                        id: 1,
                        sender: 'user',
                        text,
                        timestamp: nowIso,
                    },
                ]
                : [],
            history: [
                {
                    id: 'h1',
                    user: 'System',
                    action: `Ticket created from webhook (${eventType})`,
                    timestamp: nowIso,
                },
            ],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            meta: {
                provider: 'whatsapp',
                from,
                raw: body,
            },
        };
        // Write into the same place the app reads from
        await admin
            .firestore()
            .doc(`accounts/${defaultUid}/tickets/${ticketId}`)
            .set(ticketDoc, { merge: true });
        res.status(200).json({ ok: true, ticketId });
        return;
    }
    catch (err) {
        console.error('webhook_error', err);
        res.status(500).json({
            ok: false,
            error: err?.message || String(err),
            stack: err?.stack || null,
        });
        return;
    }
});
