import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

admin.initializeApp();

const WHATSAPP_VERIFY_TOKEN = defineSecret('WHATSAPP_VERIFY_TOKEN');

const ACCOUNT_SCOPE_ID = 'lpc-main';
const LEGACY_UID_SCOPE = 'IMFpbePnzhhX6h4xP21cMGOPsjs1';
const MIGRATION_TOKEN = defineSecret('MIGRATION_TOKEN');

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
    secrets: [WHATSAPP_VERIFY_TOKEN],
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
    const defaultUid = ACCOUNT_SCOPE_ID;

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
    console.error('webhook_error', err);
    res.status(500).json({
      ok: false,
      error: err?.message || String(err),
      stack: err?.stack || null,
    });
    return;
  }
  }
);

/**
 * One-time migration: copy legacy UID-scoped tickets into the shared account scope.
 * Call: POST /migrate/tickets with header x-migration-token: <token>
 */
async function copyCollection(db: FirebaseFirestore.Firestore, fromPath: string, toPath: string) {
  const fromCol = db.collection(fromPath);
  const toCol = db.collection(toPath);

  const snap = await fromCol.get();
  let copied = 0;

  // batch in chunks of 450 (safety)
  let batch = db.batch();
  let opCount = 0;

  for (const d of snap.docs) {
    batch.set(toCol.doc(d.id), d.data(), { merge: true });
    copied++;
    opCount++;

    if (opCount >= 450) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  }

  if (opCount > 0) await batch.commit();
  return { docs: snap.size, copied };
}

function requireMigrationAuth(req: any, res: any): boolean {
  const token = String(req.headers['x-migration-token'] || '');
  if (!token || token !== MIGRATION_TOKEN.value().trim()) {
    res.status(403).json({ ok: false, error: 'Forbidden' });
    return false;
  }
  return true;
}

/**
 * One-time migration: copy legacy UID-scoped tickets into the shared account scope.
 * Call: POST /migrate/tickets with header x-migration-token: <token>
 */
export const migrateTicketsToSharedScope = onRequest(
  {
    region: 'us-central1',
    secrets: [MIGRATION_TOKEN],
  },
  async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-migration-token');
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    if (!requireMigrationAuth(req, res)) return;

    try {
      const db = admin.firestore();
      const result = await copyCollection(
        db,
        `accounts/${LEGACY_UID_SCOPE}/tickets`,
        `accounts/${ACCOUNT_SCOPE_ID}/tickets`
      );

      res.status(200).json({ ok: true, ...result });
      return;
    } catch (err: any) {
      console.error('migration_error', err);
      res.status(500).json({ ok: false, error: err?.message || String(err) });
      return;
    }
  }
);

/**
 * Consolidate ALL account docs into shared scope (lpc-main):
 * Copies: users, chatbots, aiConfigs, knowledgeSources, tickets, profile/main
 */
export const migrateAllAccountsToSharedScope = onRequest(
  {
    region: 'us-central1',
    secrets: [MIGRATION_TOKEN],
    timeoutSeconds: 540,
  },
  async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-migration-token');
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    if (!requireMigrationAuth(req, res)) return;

    try {
      const db = admin.firestore();

      const accountsSnap = await db.collection('accounts').get();
      const accountIds = accountsSnap.docs.map((d) => d.id).filter((id) => id !== ACCOUNT_SCOPE_ID);

      const collections = ['users', 'chatbots', 'aiConfigs', 'knowledgeSources', 'tickets'] as const;

      const summary: any = { accounts: accountIds.length, collections: {} as any, migratedAccounts: accountIds };

      for (const col of collections) {
        let totalCopied = 0;
        let totalDocs = 0;

        for (const accId of accountIds) {
          const fromPath = `accounts/${accId}/${col}`;
          const toPath = `accounts/${ACCOUNT_SCOPE_ID}/${col}`;
          const r = await copyCollection(db, fromPath, toPath);
          totalCopied += r.copied;
          totalDocs += r.docs;
        }

        summary.collections[col] = { totalDocs, totalCopied };
      }

      // profile/main (single doc)
      let profileCopied = 0;
      for (const accId of accountIds) {
        const fromDoc = db.doc(`accounts/${accId}/profile/main`);
        const snap = await fromDoc.get();
        if (snap.exists) {
          await db.doc(`accounts/${ACCOUNT_SCOPE_ID}/profile/main`).set(snap.data() || {}, { merge: true });
          profileCopied++;
        }
      }
      summary.profile = { copied: profileCopied };

      res.status(200).json({ ok: true, summary });
      return;
    } catch (err: any) {
      console.error('migration_all_error', err);
      res.status(500).json({ ok: false, error: err?.message || String(err) });
      return;
    }
  }
);

/**
 * Migrate from top-level collections into accounts/lpc-main/*
 * Copies: users, chatbots, aiConfigs, knowledgeSources, tickets
 */
export const migrateRootCollectionsToSharedScope = onRequest(
  {
    region: 'us-central1',
    secrets: [MIGRATION_TOKEN],
    timeoutSeconds: 540,
  },
  async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-migration-token');
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    if (!requireMigrationAuth(req, res)) return;

    try {
      const db = admin.firestore();
      const collections = ['users', 'chatbots', 'aiConfigs', 'knowledgeSources', 'tickets'] as const;

      const summary: any = { collections: {} as any };

      for (const col of collections) {
        const fromPath = col;
        const toPath = `accounts/${ACCOUNT_SCOPE_ID}/${col}`;
        const r = await copyCollection(db, fromPath, toPath);
        summary.collections[col] = r;
      }

      res.status(200).json({ ok: true, summary });
      return;
    } catch (err: any) {
      console.error('migration_root_error', err);
      res.status(500).json({ ok: false, error: err?.message || String(err) });
      return;
    }
  }
);
