import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

admin.initializeApp();

const WHATSAPP_VERIFY_TOKEN = defineSecret('WHATSAPP_VERIFY_TOKEN');
const DEFAULT_ACCOUNT_UID = defineSecret('DEFAULT_ACCOUNT_UID');

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
export const whatsappWebhook = onRequest(
  {
    region: 'us-central1',
    secrets: [WHATSAPP_VERIFY_TOKEN, DEFAULT_ACCOUNT_UID],
  },
  async (req, res) => {
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
    const body: any = req.body || {};

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
          if (typeof t === 'string') text = t;
          if (text) break;
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
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ ok: false, error: err?.message || String(err) });
    return;
  }
  }
);
