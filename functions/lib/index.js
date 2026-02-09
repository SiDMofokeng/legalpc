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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptInvite = exports.createInvite = exports.migrateRootCollectionsToSharedScope = exports.migrateAllAccountsToSharedScope = exports.migrateTicketsToSharedScope = exports.whatsappWebhook = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const crypto_1 = __importDefault(require("crypto"));
admin.initializeApp();
const WHATSAPP_VERIFY_TOKEN = (0, params_1.defineSecret)('WHATSAPP_VERIFY_TOKEN');
const ACCOUNT_SCOPE_ID = 'lpc-main';
const LEGACY_UID_SCOPE = 'IMFpbePnzhhX6h4xP21cMGOPsjs1';
const MIGRATION_TOKEN = (0, params_1.defineSecret)('MIGRATION_TOKEN');
function makeTicketId() {
    const n = Date.now();
    const r = Math.random().toString(16).slice(2, 8).toUpperCase();
    return `TKT-${n}-${r}`;
}
function cors(req, res, methods) {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', methods);
    res.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return true;
    }
    return false;
}
async function requireBearerAuth(req) {
    const authz = String(req.headers.authorization || '');
    const m = authz.match(/^Bearer\s+(.+)$/i);
    if (!m)
        throw new Error('Missing Authorization Bearer token');
    const decoded = await admin.auth().verifyIdToken(m[1]);
    return decoded.uid;
}
function randomCode(len = 8) {
    // 8 chars base32-like
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < len; i++)
        out += alphabet[Math.floor(Math.random() * alphabet.length)];
    return out;
}
function sha256(s) {
    return crypto_1.default.createHash('sha256').update(s).digest('hex');
}
/**
 * WhatsApp Cloud API style webhook:
 * - GET: verification (hub.challenge)
 * - POST: incoming messages/events
 */
exports.whatsappWebhook = (0, https_1.onRequest)({
    region: 'us-central1',
    secrets: [WHATSAPP_VERIFY_TOKEN],
}, async (req, res) => {
    if (cors(req, res, 'GET,POST,OPTIONS'))
        return;
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
/**
 * One-time migration: copy legacy UID-scoped tickets into the shared account scope.
 * Call: POST /migrate/tickets with header x-migration-token: <token>
 */
async function copyCollection(db, fromPath, toPath) {
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
    if (opCount > 0)
        await batch.commit();
    return { docs: snap.size, copied };
}
function requireMigrationAuth(req, res) {
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
exports.migrateTicketsToSharedScope = (0, https_1.onRequest)({
    region: 'us-central1',
    secrets: [MIGRATION_TOKEN],
}, async (req, res) => {
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
    if (!requireMigrationAuth(req, res))
        return;
    try {
        const db = admin.firestore();
        const result = await copyCollection(db, `accounts/${LEGACY_UID_SCOPE}/tickets`, `accounts/${ACCOUNT_SCOPE_ID}/tickets`);
        res.status(200).json({ ok: true, ...result });
        return;
    }
    catch (err) {
        console.error('migration_error', err);
        res.status(500).json({ ok: false, error: err?.message || String(err) });
        return;
    }
});
/**
 * Consolidate ALL account docs into shared scope (lpc-main):
 * Copies: users, chatbots, aiConfigs, knowledgeSources, tickets, profile/main
 */
exports.migrateAllAccountsToSharedScope = (0, https_1.onRequest)({
    region: 'us-central1',
    secrets: [MIGRATION_TOKEN],
    timeoutSeconds: 540,
}, async (req, res) => {
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
    if (!requireMigrationAuth(req, res))
        return;
    try {
        const db = admin.firestore();
        const accountsSnap = await db.collection('accounts').get();
        const accountIds = accountsSnap.docs.map((d) => d.id).filter((id) => id !== ACCOUNT_SCOPE_ID);
        const collections = ['users', 'chatbots', 'aiConfigs', 'knowledgeSources', 'tickets'];
        const summary = { accounts: accountIds.length, collections: {}, migratedAccounts: accountIds };
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
    }
    catch (err) {
        console.error('migration_all_error', err);
        res.status(500).json({ ok: false, error: err?.message || String(err) });
        return;
    }
});
/**
 * Migrate from top-level collections into accounts/lpc-main/*
 * Copies: users, chatbots, aiConfigs, knowledgeSources, tickets
 */
exports.migrateRootCollectionsToSharedScope = (0, https_1.onRequest)({
    region: 'us-central1',
    secrets: [MIGRATION_TOKEN],
    timeoutSeconds: 540,
}, async (req, res) => {
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
    if (!requireMigrationAuth(req, res))
        return;
    try {
        const db = admin.firestore();
        const collections = ['users', 'chatbots', 'aiConfigs', 'knowledgeSources', 'tickets'];
        const summary = { collections: {} };
        for (const col of collections) {
            const fromPath = col;
            const toPath = `accounts/${ACCOUNT_SCOPE_ID}/${col}`;
            const r = await copyCollection(db, fromPath, toPath);
            summary.collections[col] = r;
        }
        res.status(200).json({ ok: true, summary });
        return;
    }
    catch (err) {
        console.error('migration_root_error', err);
        res.status(500).json({ ok: false, error: err?.message || String(err) });
        return;
    }
});
/* ---------------------- INVITES ---------------------- */
exports.createInvite = (0, https_1.onRequest)({ region: 'us-central1' }, async (req, res) => {
    if (cors(req, res, 'POST,OPTIONS'))
        return;
    if (req.method !== 'POST') {
        res.status(405).json({ ok: false, error: 'Method not allowed' });
        return;
    }
    try {
        await requireBearerAuth(req); // any authenticated portal user can create invites (MVP)
        const { email, role, name } = (req.body || {});
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const safeRole = role === 'Admin' ? 'Admin' : 'Agent';
        const safeName = String(name || '').trim() || normalizedEmail.split('@')[0];
        if (!normalizedEmail || !normalizedEmail.includes('@')) {
            res.status(400).json({ ok: false, error: 'Invalid email' });
            return;
        }
        const code = randomCode(8);
        const codeHash = sha256(code);
        const inviteId = `inv-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
        const db = admin.firestore();
        await db.doc(`accounts/${ACCOUNT_SCOPE_ID}/invites/${inviteId}`).set({
            id: inviteId,
            email: normalizedEmail,
            name: safeName,
            role: safeRole,
            codeHash,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(200).json({ ok: true, inviteId, code });
        return;
    }
    catch (err) {
        console.error('create_invite_error', err);
        res.status(500).json({ ok: false, error: err?.message || String(err) });
        return;
    }
});
exports.acceptInvite = (0, https_1.onRequest)({ region: 'us-central1' }, async (req, res) => {
    if (cors(req, res, 'POST,OPTIONS'))
        return;
    if (req.method !== 'POST') {
        res.status(405).json({ ok: false, error: 'Method not allowed' });
        return;
    }
    try {
        const { email, code, password } = (req.body || {});
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const codeStr = String(code || '').trim().toUpperCase();
        const pass = String(password || '');
        if (!normalizedEmail || !codeStr || pass.length < 8) {
            res.status(400).json({ ok: false, error: 'Missing/invalid fields' });
            return;
        }
        const db = admin.firestore();
        const invitesSnap = await db
            .collection(`accounts/${ACCOUNT_SCOPE_ID}/invites`)
            .where('email', '==', normalizedEmail)
            .where('status', '==', 'pending')
            .limit(5)
            .get();
        const match = invitesSnap.docs.find((d) => d.data().codeHash === sha256(codeStr));
        if (!match) {
            res.status(403).json({ ok: false, error: 'Invalid invite code' });
            return;
        }
        const invite = match.data();
        // Create auth user
        const userRecord = await admin.auth().createUser({
            email: normalizedEmail,
            password: pass,
            displayName: invite.name || normalizedEmail.split('@')[0],
        });
        // Create portal user doc (source of truth for UI)
        await db.doc(`accounts/${ACCOUNT_SCOPE_ID}/users/${userRecord.uid}`).set({
            id: userRecord.uid,
            name: invite.name || normalizedEmail.split('@')[0],
            email: normalizedEmail,
            role: invite.role || 'Agent',
            status: 'active',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        await match.ref.set({
            status: 'used',
            usedAt: admin.firestore.FieldValue.serverTimestamp(),
            usedByUid: userRecord.uid,
        }, { merge: true });
        res.status(200).json({ ok: true });
        return;
    }
    catch (err) {
        console.error('accept_invite_error', err);
        res.status(500).json({ ok: false, error: err?.message || String(err) });
        return;
    }
});
// ---- existing migrateRootCollectionsToSharedScope removed/overridden above ----
// END INVITES
// NOTE: Any remaining old migrateRootCollectionsToSharedScope implementation below should be removed manually if present.
// (rest of file continues)
// ----- PLACEHOLDER -----
// DO NOT ADD CODE BELOW
//
