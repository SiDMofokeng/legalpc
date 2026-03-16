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
exports.acceptInvite = exports.createInvite = exports.migrateRootCollectionsToSharedScope = exports.migrateAllAccountsToSharedScope = exports.migrateTicketsToSharedScope = exports.syncKnowledgeSourceOnWrite = exports.clearThreadOnTicketClose = exports.botProcessInboundTicket = exports.whatsappWebhook = void 0;
// FILE: functions/src/index.ts
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
;
const crypto_1 = __importDefault(require("crypto"));
const firestore_1 = require("firebase-functions/v2/firestore");
// ✅ Gemini SDK (CommonJS-friendly)
const generative_ai_1 = require("@google/generative-ai");
const firestore_2 = require("firebase-functions/v2/firestore");
admin.initializeApp();
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "";
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";
const WHATSAPP_API_VERSION = "v22.0";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const ACCOUNT_SCOPE_ID = "lpc-main";
const LEGACY_UID_SCOPE = "IMFpbePnzhhX6h4xP21cMGOPsjs1";
const MIGRATION_TOKEN = process.env.MIGRATION_TOKEN || "";
// If you want to override, set env var in runtime later.
// Otherwise this default matches what you said you’re using.
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
function makeTicketId() {
    const n = Date.now();
    const r = Math.random().toString(16).slice(2, 8).toUpperCase();
    return `TKT-${n}-${r}`;
}
function cors(req, res, methods) {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", methods);
    res.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return true;
    }
    return false;
}
function normalizeWaFrom(from) {
    return String(from || "").replace(/[^\d]/g, "");
}
function threadDocId(phoneNumberId, from) {
    const pn = normalizeWaFrom(phoneNumberId || "unknown");
    const fr = normalizeWaFrom(from || "unknown");
    return `${pn}_${fr}`;
}
async function requireBearerAuth(req) {
    const authz = String(req.headers.authorization || "");
    const m = authz.match(/^Bearer\s+(.+)$/i);
    if (!m)
        throw new Error("Missing Authorization Bearer token");
    const decoded = await admin.auth().verifyIdToken(m[1]);
    return decoded.uid;
}
function randomCode(len = 8) {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < len; i++)
        out += alphabet[Math.floor(Math.random() * alphabet.length)];
    return out;
}
function sha256(s) {
    return crypto_1.default.createHash("sha256").update(s).digest("hex");
}
async function pickBotId(db) {
    const snap = await db
        .collection(`accounts/${ACCOUNT_SCOPE_ID}/chatbots`)
        .orderBy("createdAt", "asc")
        .limit(10)
        .get();
    if (snap.empty)
        return null;
    const active = snap.docs.find((d) => d.data().status !== "inactive");
    return (active ? active.data().id || active.id : snap.docs[0].data().id || snap.docs[0].id);
}
async function loadAiConfig(db, botId) {
    const ref = db.doc(`accounts/${ACCOUNT_SCOPE_ID}/aiConfigs/${botId}`);
    const snap = await ref.get();
    return snap.exists ? snap.data() : null;
}
async function loadSyncedKnowledge(db, botId) {
    const snap = await db
        .collection(`accounts/${ACCOUNT_SCOPE_ID}/knowledgeSources`)
        .where("botId", "==", botId)
        .where("status", "==", "synced")
        .orderBy("createdAt", "asc")
        .limit(50)
        .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
function stripHtmlToText(html) {
    // super-light HTML stripping (MVP)
    const withoutScripts = html
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ");
    const text = withoutScripts
        .replace(/<\/(p|div|br|li|h1|h2|h3|h4|h5|h6)>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    return text;
}
function clampText(s, max = 18000) {
    const t = String(s || "").trim();
    if (t.length <= max)
        return t;
    return t.slice(0, max) + "…";
}
async function summarizeWithGemini(rawText) {
    const apiKey = String(GEMINI_API_KEY).trim();
    if (!apiKey)
        throw new Error("Missing GEMINI_API_KEY secret");
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const modelName = String(process.env.GEMINI_MODEL || "").trim() || DEFAULT_GEMINI_MODEL;
    const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
            temperature: 0.2,
            topP: 0.9,
            maxOutputTokens: 2048,
        },
    });
    const prompt = [
        "You are summarizing a knowledge source for a support chatbot.",
        "Write a compact, factual summary that is useful for answering user questions.",
        "Include key procedures, requirements, contact routes, rules, hours, SLAs, and constraints if present.",
        "Avoid fluff. Prefer short sentences.",
        "",
        "TEXT:",
        clampText(rawText, 18000),
        "",
        "OUTPUT: 6–12 bullet points maximum.",
    ].join("\n");
    const result = await model.generateContent(prompt);
    return (result.response.text() || "").trim();
}
async function fetchUrlText(url) {
    const u = String(url || "").trim();
    if (!u)
        throw new Error("Missing URL");
    const resp = await fetch(u, {
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (KnowledgeSyncBot)" },
    });
    if (!resp.ok)
        throw new Error(`Fetch failed (${resp.status})`);
    const ct = String(resp.headers.get("content-type") || "");
    const body = await resp.text();
    // If it's HTML, strip
    if (ct.includes("text/html") || body.includes("<html") || body.includes("<body")) {
        return stripHtmlToText(body);
    }
    // Plain text
    return String(body || "").trim();
}
async function readStorageText(storagePath) {
    const path = String(storagePath || "").trim();
    if (!path)
        throw new Error("Missing storagePath");
    const bucket = admin.storage().bucket();
    const file = bucket.file(path);
    const [meta] = await file.getMetadata();
    const mimeType = String(meta?.contentType || "");
    // MVP: only handle text-like files safely
    const allowed = mimeType.startsWith("text/") ||
        mimeType.includes("json") ||
        mimeType.includes("xml") ||
        mimeType.includes("csv") ||
        path.toLowerCase().endsWith(".txt") ||
        path.toLowerCase().endsWith(".md");
    if (!allowed) {
        throw new Error(`Unsupported file type for extraction (mime=${mimeType || "unknown"})`);
    }
    const [buf] = await file.download();
    const text = buf.toString("utf8");
    return { text: text.trim(), mimeType };
}
function buildKnowledgeContext(knowledge) {
    const items = (knowledge || [])
        .filter((k) => k.status === "synced")
        .slice(0, 20)
        .map((k) => {
        // FAQ
        if (k.type === "faq" && k.content?.question && k.content?.answer) {
            return `FAQ:\nQ: ${String(k.content.question).trim()}\nA: ${String(k.content.answer).trim()}`;
        }
        // URL / FILE summaries (extracted by sync worker)
        const summary = String(k.content?.summary || "").trim();
        if (summary) {
            const label = String(k.type || "source").toUpperCase();
            const name = String(k.name || "").trim();
            return `${label}${name ? ` (${name})` : ""}:\n${summary}`;
        }
        return "";
    })
        .filter(Boolean);
    if (items.length === 0)
        return "";
    return [
        "KNOWLEDGE (ground truth for this bot):",
        ...items,
        "",
        "RULE: Use ONLY the above knowledge. If not enough info, ask clarifying questions instead of guessing.",
    ].join("\n\n");
}
function buildConversationContext(conversation, maxMessages = 8) {
    const items = Array.isArray(conversation) ? conversation.slice(-maxMessages) : [];
    const lines = items
        .map((m) => {
        const sender = String(m?.sender || "").toLowerCase().trim();
        const text = String(m?.text || "").trim();
        if (!text)
            return "";
        const label = sender === "user"
            ? "CUSTOMER"
            : sender === "ai"
                ? "BOT"
                : sender === "agent"
                    ? "AGENT"
                    : "SYSTEM";
        return `${label}: ${text}`;
    })
        .filter(Boolean);
    if (lines.length === 0)
        return "";
    return [
        "RECENT CONVERSATION HISTORY:",
        ...lines,
        "",
        "Use this history to understand the current message in context.",
        "Do not restart the conversation if the user is clearly replying to a previous prompt.",
    ].join("\n");
}
function buildSystemInstruction(config) {
    const tone = String(config?.tone || "casual");
    const personality = String(config?.personality || "friendly");
    const goal = String(config?.goal || "").trim();
    const extra = String(config?.additionalInfo || "").trim();
    const responseLength = String(config?.responseLength || "medium");
    return [
        "You are a support assistant drafting a reply for a human agent to send.",
        "Output must be ONLY the draft reply text (no headings, no JSON, no analysis).",
        "",
        `Style: tone=${tone}, personality=${personality}, length=${responseLength}.`,
        goal ? `Primary goal: ${goal}` : "",
        extra ? `Extra notes: ${extra}` : "",
        "",
        "Constraints:",
        "- Be helpful and specific.",
        "- Do not claim you performed actions you did not perform.",
        "- Do not hallucinate policy/legal facts: if unsure, ask for missing info.",
        "- Keep it professional and safe for a law/operations context.",
        "",
        "FORMAT RULES (must follow):",
        "- Write 3–6 complete sentences (no unfinished sentences).",
        "- If the inbound message is vague, add 2–4 bullet questions to clarify.",
        "- If the inbound message is specific and answerable from context, answer first, then ask at most 1–2 clarifiers.",
        "- Always end with one short next-step line (e.g., “Reply with X and Y, and I’ll assist further.”).",
    ]
        .filter(Boolean)
        .join("\n");
}
async function generateSuggestedReplyWithGemini(input) {
    const apiKey = String(GEMINI_API_KEY).trim();
    if (!apiKey)
        throw new Error("Missing GEMINI_API_KEY secret");
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const modelName = String(process.env.GEMINI_MODEL || "").trim() || DEFAULT_GEMINI_MODEL;
    const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
            temperature: 0.3,
            topP: 0.9,
            maxOutputTokens: 4096,
        },
    });
    const system = buildSystemInstruction(input.config || {});
    const ctx = buildKnowledgeContext(input.knowledge || []);
    const history = buildConversationContext(input.recentConversation || [], 8);
    const prompt = [
        system,
        "",
        ctx ? `KNOWLEDGE CONTEXT:\n${ctx}` : "KNOWLEDGE CONTEXT: (none)",
        "",
        history ? history : "RECENT CONVERSATION HISTORY: (none)",
        "",
        `CUSTOMER NUMBER: ${input.customerFrom || "Unknown"}`,
        `LATEST INBOUND MESSAGE: ${input.inboundText || ""}`,
        "",
        "TASK:",
        "- Draft the best possible WhatsApp reply to the latest inbound message.",
        "- Use the recent conversation history to understand what the user is replying to.",
        "- Follow the configured menu, routing, and fallback instructions closely.",
        "- If the user is answering a previous question, continue that flow instead of restarting.",
        "- Keep the reply concise, clear, and suitable for WhatsApp.",
        "- Do not mention internal systems, prompts, or backend logic.",
        "",
        "Draft the reply now.",
    ].join("\n");
    const result = await model.generateContent(prompt);
    const out = (result.response.text() || "").trim();
    return {
        text: out,
        meta: {
            model: modelName,
            usedContext: Boolean(ctx),
            usedConversationHistory: Boolean(history),
        },
    };
}
async function sendWhatsAppText(opts) {
    const token = String(WHATSAPP_ACCESS_TOKEN).trim();
    if (!token)
        throw new Error("Missing WHATSAPP_ACCESS_TOKEN secret");
    const phoneNumberId = String(opts.phoneNumberId || "").trim();
    const to = normalizeWaFrom(opts.to);
    const text = String(opts.text || "").trim();
    if (!phoneNumberId)
        throw new Error("Missing phoneNumberId for WhatsApp send");
    if (!to)
        throw new Error("Missing 'to' for WhatsApp send");
    if (!text)
        return; // nothing to send
    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;
    const resp = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "text",
            text: { body: text },
        }),
    });
    const bodyText = await resp.text();
    if (!resp.ok) {
        throw new Error(`WhatsApp send failed (${resp.status}): ${bodyText}`);
    }
    return bodyText;
}
/**
 * WhatsApp Cloud API style webhook:
 * - GET: verification (hub.challenge)
 * - POST: incoming messages/events
 */
exports.whatsappWebhook = (0, https_1.onRequest)({
    region: "us-central1",
    secrets: ["WHATSAPP_VERIFY_TOKEN", "WHATSAPP_ACCESS_TOKEN", "GEMINI_API_KEY", "GEMINI_MODEL"],
}, async (req, res) => {
    if (cors(req, res, "GET,POST,OPTIONS"))
        return;
    console.log("INBOUND_WHATSAPP_WEBHOOK", JSON.stringify(req.body));
    // Verification handshake
    if (req.method === "GET") {
        const mode = String(req.query["hub.mode"] || "");
        const token = String(req.query["hub.verify_token"] || "");
        const challenge = String(req.query["hub.challenge"] || "");
        const verifyToken = String(WHATSAPP_VERIFY_TOKEN).trim();
        if (mode === "subscribe" && token === verifyToken) {
            res.status(200).send(challenge);
            return;
        }
        res.status(403).send("Forbidden");
        return;
    }
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        const body = req.body || {};
        const eventType = body?.object || "unknown";
        const rawStr = JSON.stringify(body || {});
        const rawTrimmed = rawStr.length > 50000 ? rawStr.slice(0, 50000) + "...[trimmed]" : rawStr;
        const entries = Array.isArray(body?.entry) ? body.entry : [];
        let from = "";
        let text = "";
        let phoneNumberId = "";
        for (const e of entries) {
            const changes = Array.isArray(e?.changes) ? e.changes : [];
            for (const c of changes) {
                const v = c?.value;
                if (v?.metadata?.phone_number_id) {
                    phoneNumberId = String(v.metadata.phone_number_id);
                }
                const msgs = Array.isArray(v?.messages) ? v.messages : [];
                for (const m of msgs) {
                    from = String(m?.from || from);
                    const t = m?.text?.body;
                    if (typeof t === "string")
                        text = t;
                    if (text)
                        break;
                }
            }
        }
        const nowIso = new Date().toISOString();
        const db = admin.firestore();
        console.log("FIREBASE_PROJECT", admin.app().options.projectId);
        const ticketsCol = db.collection(`accounts/${ACCOUNT_SCOPE_ID}/tickets`);
        const threadsCol = db.collection(`accounts/${ACCOUNT_SCOPE_ID}/waThreads`);
        const fromNorm = normalizeWaFrom(from);
        const pnId = String(phoneNumberId || "");
        const threadId = threadDocId(pnId, fromNorm);
        let ticketId = "";
        let existingTicket = null;
        await db.runTransaction(async (tx) => {
            const threadRef = threadsCol.doc(threadId);
            const threadSnap = await tx.get(threadRef);
            console.log("THREAD_SNAP", threadId, threadSnap.exists ? threadSnap.data() : null);
            const existingTicketId = threadSnap.exists ? String(threadSnap.data()?.openTicketId || "") : "";
            // Ignore reusing a closed mapping, but still create a NEW ticket and re-open the thread
            const threadData = threadSnap.exists ? threadSnap.data() : null;
            if (threadData?.closedAt) {
                // ✅ Create a new ticket and re-open the mapping by clearing closedAt
                ticketId = makeTicketId();
                tx.set(threadRef, {
                    id: threadId,
                    from: fromNorm,
                    phoneNumberId: pnId || null,
                    openTicketId: ticketId,
                    closedAt: admin.firestore.FieldValue.delete(), // ✅ remove the "closed" marker
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
                return;
            }
            console.log("THREAD_OPEN_TICKET_ID", existingTicketId);
            if (existingTicketId) {
                const existingRef = ticketsCol.doc(existingTicketId);
                const existingSnap = await tx.get(existingRef);
                console.log("CHECK_EXISTING_TICKET", existingTicketId, "exists=", existingSnap.exists);
                if (existingSnap.exists) {
                    const t = existingSnap.data();
                    const statusLower = String(t?.status || "").trim().toLowerCase();
                    console.log("EXISTING_TICKET_STATUS", existingTicketId, statusLower);
                    const isReusable = statusLower === "open" ||
                        statusLower === "in_progress" ||
                        statusLower === "in progress" ||
                        statusLower === "new";
                    if (isReusable) {
                        // ✅ Reuse this still-active ticket
                        ticketId = existingTicketId;
                        existingTicket = t;
                        return;
                    }
                }
            }
            // ✅ No valid open ticket mapped -> create a new one and map it
            ticketId = makeTicketId();
            tx.set(threadRef, {
                id: threadId,
                from: fromNorm,
                phoneNumberId: pnId || null,
                openTicketId: ticketId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        });
        console.log("DECISION_RESULT", {
            threadId,
            ticketId,
            reusedExisting: Boolean(existingTicket),
        });
        // ✅ ticketRef is created AFTER tx (always defined if ticketId is set)
        if (!ticketId)
            throw new Error("ticketId was not set by transaction");
        const ticketRef = ticketsCol.doc(ticketId);
        const threadRef = threadsCol.doc(threadId);
        const threadSnap = await threadRef.get();
        console.log("THREAD_EXISTS_AFTER_TX", threadId, threadSnap.exists, threadSnap.data() || null);
        // Find bot by phoneNumberId
        let botId = null;
        if (phoneNumberId) {
            const botSnap = await db
                .collection(`accounts/${ACCOUNT_SCOPE_ID}/chatbots`)
                .where("phoneNumberId", "==", phoneNumberId)
                .where("status", "==", "active")
                .limit(1)
                .get();
            if (!botSnap.empty) {
                const botData = botSnap.docs[0].data();
                botId = botData.id || botSnap.docs[0].id;
            }
        }
        if (!botId)
            botId = await pickBotId(db);
        if (!botId)
            botId = "default";
        // Load AI + Knowledge for that bot
        const aiConfig = botId !== "default" ? await loadAiConfig(db, botId) : null;
        const knowledge = botId !== "default" ? await loadSyncedKnowledge(db, botId) : [];
        // ✅ LLM-generated suggested reply
        let suggestedReply = "";
        let suggestedMeta = {};
        try {
            const r = await generateSuggestedReplyWithGemini({
                inboundText: text,
                customerFrom: from,
                config: aiConfig,
                knowledge,
                recentConversation: Array.isArray(existingTicket?.conversation) ? existingTicket.conversation : [],
            });
            suggestedReply = r.text;
            suggestedMeta = r.meta;
        }
        catch (e) {
            // Hard fallback: don’t break ticket creation if Gemini fails
            console.error("gemini_suggested_reply_error", e);
            suggestedReply =
                "Thanks for your message. Can you share your full name and your case/reference number so we can assist?";
            suggestedMeta = { model: null, error: e?.message || String(e) };
        }
        // ✅ ALWAYS force a bot reply text (never empty)
        const botReplyText = String(suggestedReply || "").trim()
            ? String(suggestedReply).trim()
            : "Thanks for your message. Please share your full name and your case/reference number so we can assist.";
        // ✅ AUTO-REPLY on WhatsApp with the bot-generated response
        try {
            // Only send if we actually have an inbound user text and sender number
            if (text && fromNorm && pnId) {
                await sendWhatsAppText({
                    phoneNumberId: pnId,
                    to: fromNorm,
                    text: botReplyText,
                });
                console.log("WHATSAPP_SENT_OK", { to: fromNorm, phoneNumberId: pnId });
            }
        }
        catch (e) {
            // IMPORTANT: never fail the webhook if sending fails (otherwise Meta retries & you get duplicates)
            console.error("WHATSAPP_SEND_ERROR", e?.message || e, e?.stack || null);
        }
        // ✅ Always build the inbound "user" message
        const inboundUserMsg = text
            ? {
                id: `user-${Date.now()}`,
                sender: "user",
                text,
                timestamp: nowIso,
            }
            : null;
        // ✅ ALWAYS build a bot "ai" message (even on Gemini failure)
        const inboundAiMsg = {
            id: `ai-${Date.now() + 1}`,
            sender: "ai",
            text: botReplyText,
            timestamp: nowIso,
        };
        const ticketDoc = {
            id: ticketId,
            customerName: from ? `WhatsApp ${from}` : "WhatsApp User",
            subject: text ? text.slice(0, 60) : "New inbound message",
            status: "open",
            priority: "medium",
            lastUpdate: nowIso,
            agent: "Webhook",
            suggestedReply,
            suggestedReplyStatus: "ready",
            suggestedReplyCreatedAt: nowIso,
            suggestedReplyMeta: {
                botId,
                tone: aiConfig?.tone || null,
                personality: aiConfig?.personality || null,
                responseLength: aiConfig?.responseLength || null,
                model: suggestedMeta?.model || null,
                usedContext: suggestedMeta?.usedContext ?? null,
                error: suggestedMeta?.error || null,
            },
            // ✅ New ticket includes BOTH: user msg + ai msg
            conversation: [
                ...(inboundUserMsg ? [inboundUserMsg] : []),
                ...(inboundAiMsg ? [inboundAiMsg] : []),
            ],
            history: [
                {
                    id: "h1",
                    user: "System",
                    action: `Ticket created from webhook (${eventType})`,
                    timestamp: nowIso,
                },
            ],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            meta: {
                provider: "whatsapp",
                from,
                fromNorm: normalizeWaFrom(from),
                raw: rawTrimmed,
                phoneNumberId: phoneNumberId || null,
            },
        };
        if (existingTicket) {
            console.log("PATH_APPEND_EXISTING", ticketId);
            const prevConversation = Array.isArray(existingTicket.conversation)
                ? existingTicket.conversation
                : [];
            const nextConversation = [
                ...prevConversation,
                ...(inboundUserMsg ? [inboundUserMsg] : []),
            ];
            // ✅ append bot msg unless last message is already the same botReplyText
            const last = nextConversation[nextConversation.length - 1];
            const lastIsSameAi = String(last?.sender || "").toLowerCase() === "ai" &&
                String(last?.text || "").trim() === botReplyText;
            if (!lastIsSameAi)
                nextConversation.push(inboundAiMsg);
            // ✅ IMPORTANT: force status open when appending (prevents “new” in any frontend)
            await ticketRef.set({
                status: "open",
                lastUpdate: nowIso,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                subject: text ? text.slice(0, 60) : existingTicket.subject,
                conversation: nextConversation,
                // ✅ ensure meta always has what clearThreadOnTicketClose needs
                meta: {
                    ...(existingTicket.meta || {}),
                    provider: "whatsapp",
                    from,
                    fromNorm: normalizeWaFrom(from),
                    phoneNumberId: phoneNumberId || (existingTicket.meta?.phoneNumberId ?? null),
                },
                suggestedReply,
                suggestedReplyStatus: "ready",
                suggestedReplyCreatedAt: nowIso,
                suggestedReplyMeta: {
                    ...(existingTicket.suggestedReplyMeta || {}),
                    botId,
                    tone: aiConfig?.tone || null,
                    personality: aiConfig?.personality || null,
                    responseLength: aiConfig?.responseLength || null,
                    model: suggestedMeta?.model || null,
                    usedContext: suggestedMeta?.usedContext ?? null,
                    error: suggestedMeta?.error || null,
                },
                history: [
                    ...(Array.isArray(existingTicket.history) ? existingTicket.history : []),
                    {
                        id: `h-${Date.now()}`,
                        user: "System",
                        action: "Inbound WhatsApp message appended to existing open ticket",
                        timestamp: nowIso,
                    },
                ],
            }, { merge: true });
        }
        else {
            console.log("PATH_CREATE_NEW", ticketId);
            // Create brand new ticket (your existing behavior)
            await ticketRef.set(ticketDoc, { merge: true });
        }
        res.status(200).json({ ok: true, ticketId });
        return;
    }
    catch (err) {
        console.error("webhook_error", err);
        res.status(500).json({
            ok: false,
            error: err?.message || String(err),
            stack: err?.stack || null,
        });
        return;
    }
});
exports.botProcessInboundTicket = (0, firestore_1.onDocumentCreated)({
    region: "us-central1",
    document: "accounts/{accountId}/tickets/{ticketId}",
    // ✅ not required here because we’re NOT calling Gemini here anymore
}, async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const ticket = snap.data();
    const ticketId = event.params.ticketId;
    const accountId = event.params.accountId;
    if (ticket?.meta?.provider !== "whatsapp")
        return;
    if (ticket?.botProcessedAt)
        return;
    const suggested = String(ticket?.suggestedReply || "").trim();
    const nowIso = new Date().toISOString();
    const db = admin.firestore();
    const ref = db.doc(`accounts/${accountId}/tickets/${ticketId}`);
    const nextConversation = Array.isArray(ticket?.conversation) ? ticket.conversation.slice() : [];
    // Avoid duplicating the same suggested reply if it’s already appended
    const alreadyHasSame = suggested
        ? nextConversation.some((m) => String(m?.sender || "").toLowerCase() === "ai" && String(m?.text || "").trim() === suggested)
        : true;
    if (suggested && !alreadyHasSame) {
        nextConversation.push({
            id: `ai-${Date.now()}`,
            sender: "ai",
            text: suggested,
            timestamp: nowIso,
        });
    }
    await ref.set({
        botProcessedAt: nowIso,
        botProcessedBy: "botProcessInboundTicket",
        botDraft: suggested || null,
        conversation: nextConversation,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
});
exports.clearThreadOnTicketClose = (0, firestore_2.onDocumentWritten)({
    region: "us-central1",
    document: "accounts/{accountId}/tickets/{ticketId}",
}, async (event) => {
    const after = event.data?.after;
    if (!after?.exists)
        return;
    const ticket = after.data();
    const accountId = event.params.accountId;
    if (ticket?.meta?.provider !== "whatsapp")
        return;
    const statusLower = String(ticket?.status || "").trim().toLowerCase();
    // ✅ Only clear mapping when the ticket is truly finished
    const isClosed = statusLower === "closed" ||
        statusLower === "resolved";
    if (!isClosed)
        return; // keep mapping for open/in_progress/etc
    const fromNorm = String(ticket?.meta?.fromNorm || normalizeWaFrom(ticket?.meta?.from || "")).trim();
    const phoneNumberId = String(ticket?.meta?.phoneNumberId || "").trim();
    if (!fromNorm)
        return;
    const threadId = threadDocId(phoneNumberId, fromNorm);
    const threadRef = admin.firestore().doc(`accounts/${accountId}/waThreads/${threadId}`);
    // Only clear if it still points to this ticket
    const snap = await threadRef.get();
    if (!snap.exists)
        return;
    const openTicketId = String(snap.data()?.openTicketId || "");
    if (openTicketId !== String(ticket?.id || event.params.ticketId))
        return;
    await threadRef.set({
        openTicketId: null,
        closedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
});
exports.syncKnowledgeSourceOnWrite = (0, firestore_2.onDocumentWritten)({
    region: "us-central1",
    document: "accounts/{accountId}/knowledgeSources/{sourceId}",
    secrets: ["GEMINI_API_KEY", "GEMINI_MODEL"],
}, async (event) => {
    const afterSnap = event.data?.after;
    if (!afterSnap?.exists)
        return;
    const source = afterSnap.data();
    const accountId = event.params.accountId;
    const sourceId = event.params.sourceId;
    const type = String(source?.type || "").toLowerCase();
    const status = String(source?.status || "").toLowerCase();
    // Only auto-sync faq/url/file
    if (type !== "faq" && type !== "url" && type !== "file")
        return;
    const ref = admin.firestore().doc(`accounts/${accountId}/knowledgeSources/${sourceId}`);
    // Prevent looping forever
    if (status === "syncing")
        return;
    const alreadyHasSummary = Boolean(String(source?.content?.summary || "").trim());
    const alreadyHasExtractedText = Boolean(String(source?.content?.extractedText || "").trim());
    if (status === "synced" && (alreadyHasSummary || type === "faq"))
        return;
    // Mark syncing
    await ref.set({
        status: "syncing",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    try {
        let extractedText = "";
        let summary = "";
        if (type === "faq") {
            const question = String(source?.content?.question || "").trim();
            const answer = String(source?.content?.answer || "").trim();
            if (!question || !answer) {
                throw new Error("FAQ requires both question and answer");
            }
            extractedText = `FAQ\nQuestion: ${question}\nAnswer: ${answer}`;
            summary = `- FAQ\n- Question: ${question}\n- Answer: ${answer}`;
        }
        if (type === "url") {
            const url = String(source?.content?.url || source?.name || "").trim();
            extractedText = await fetchUrlText(url);
            extractedText = clampText(extractedText, 30000);
            summary = await summarizeWithGemini(extractedText);
        }
        if (type === "file") {
            const storagePath = String(source?.content?.storagePath || "").trim();
            const r = await readStorageText(storagePath);
            extractedText = clampText(r.text, 30000);
            summary = await summarizeWithGemini(extractedText);
            await ref.set({
                content: {
                    ...(source.content || {}),
                    mimeType: r.mimeType || (source?.content?.mimeType || null),
                },
            }, { merge: true });
        }
        await ref.set({
            status: "synced",
            lastSynced: new Date().toISOString().split("T")[0],
            errorMessage: admin.firestore.FieldValue.delete(),
            content: {
                ...(source.content || {}),
                extractedText,
                summary,
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
    catch (err) {
        await ref.set({
            status: "error",
            lastSynced: new Date().toISOString().split("T")[0],
            errorMessage: err?.message || String(err),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
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
    const token = String(req.headers["x-migration-token"] || "");
    if (!token || token !== String(MIGRATION_TOKEN).trim()) {
        res.status(403).json({ ok: false, error: "Forbidden" });
        return false;
    }
    return true;
}
exports.migrateTicketsToSharedScope = (0, https_1.onRequest)({
    region: "us-central1",
    secrets: ["MIGRATION_TOKEN"],
}, async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type,Authorization,x-migration-token");
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    if (req.method !== "POST") {
        res.status(405).json({ ok: false, error: "Method not allowed" });
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
        console.error("migration_error", err);
        res.status(500).json({ ok: false, error: err?.message || String(err) });
        return;
    }
});
exports.migrateAllAccountsToSharedScope = (0, https_1.onRequest)({
    region: "us-central1",
    secrets: ["MIGRATION_TOKEN"],
    timeoutSeconds: 540,
}, async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type,Authorization,x-migration-token");
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    if (req.method !== "POST") {
        res.status(405).json({ ok: false, error: "Method not allowed" });
        return;
    }
    if (!requireMigrationAuth(req, res))
        return;
    try {
        const db = admin.firestore();
        const accountsSnap = await db.collection("accounts").get();
        const accountIds = accountsSnap.docs.map((d) => d.id).filter((id) => id !== ACCOUNT_SCOPE_ID);
        const collections = ["users", "chatbots", "aiConfigs", "knowledgeSources", "tickets"];
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
        console.error("migration_all_error", err);
        res.status(500).json({ ok: false, error: err?.message || String(err) });
        return;
    }
});
exports.migrateRootCollectionsToSharedScope = (0, https_1.onRequest)({
    region: "us-central1",
    secrets: ["MIGRATION_TOKEN"],
    timeoutSeconds: 540,
}, async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type,Authorization,x-migration-token");
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    if (req.method !== "POST") {
        res.status(405).json({ ok: false, error: "Method not allowed" });
        return;
    }
    if (!requireMigrationAuth(req, res))
        return;
    try {
        const db = admin.firestore();
        const collections = ["users", "chatbots", "aiConfigs", "knowledgeSources", "tickets"];
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
        console.error("migration_root_error", err);
        res.status(500).json({ ok: false, error: err?.message || String(err) });
        return;
    }
});
/* ---------------------- INVITES ---------------------- */
exports.createInvite = (0, https_1.onRequest)({ region: "us-central1" }, async (req, res) => {
    if (cors(req, res, "POST,OPTIONS"))
        return;
    if (req.method !== "POST") {
        res.status(405).json({ ok: false, error: "Method not allowed" });
        return;
    }
    try {
        await requireBearerAuth(req);
        const { email, role, name } = (req.body || {});
        const normalizedEmail = String(email || "").trim().toLowerCase();
        const safeRole = role === "Admin" ? "Admin" : "Agent";
        const safeName = String(name || "").trim() || normalizedEmail.split("@")[0];
        if (!normalizedEmail || !normalizedEmail.includes("@")) {
            res.status(400).json({ ok: false, error: "Invalid email" });
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
            status: "pending",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(200).json({ ok: true, inviteId, code });
        return;
    }
    catch (err) {
        console.error("create_invite_error", err);
        res.status(500).json({ ok: false, error: err?.message || String(err) });
        return;
    }
});
exports.acceptInvite = (0, https_1.onRequest)({ region: "us-central1" }, async (req, res) => {
    if (cors(req, res, "POST,OPTIONS"))
        return;
    if (req.method !== "POST") {
        res.status(405).json({ ok: false, error: "Method not allowed" });
        return;
    }
    try {
        const { email, code, password } = (req.body || {});
        const normalizedEmail = String(email || "").trim().toLowerCase();
        const codeStr = String(code || "").trim().toUpperCase();
        const pass = String(password || "");
        if (!normalizedEmail || !codeStr || pass.length < 8) {
            res.status(400).json({ ok: false, error: "Missing/invalid fields" });
            return;
        }
        const db = admin.firestore();
        const invitesSnap = await db
            .collection(`accounts/${ACCOUNT_SCOPE_ID}/invites`)
            .where("email", "==", normalizedEmail)
            .where("status", "==", "pending")
            .limit(5)
            .get();
        const match = invitesSnap.docs.find((d) => d.data().codeHash === sha256(codeStr));
        if (!match) {
            res.status(403).json({ ok: false, error: "Invalid invite code" });
            return;
        }
        const invite = match.data();
        const userRecord = await admin.auth().createUser({
            email: normalizedEmail,
            password: pass,
            displayName: invite.name || normalizedEmail.split("@")[0],
        });
        await db.doc(`accounts/${ACCOUNT_SCOPE_ID}/users/${userRecord.uid}`).set({
            id: userRecord.uid,
            name: invite.name || normalizedEmail.split("@")[0],
            email: normalizedEmail,
            role: invite.role || "Agent",
            status: "active",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        await match.ref.set({
            status: "used",
            usedAt: admin.firestore.FieldValue.serverTimestamp(),
            usedByUid: userRecord.uid,
        }, { merge: true });
        res.status(200).json({ ok: true });
        return;
    }
    catch (err) {
        console.error("accept_invite_error", err);
        res.status(500).json({ ok: false, error: err?.message || String(err) });
        return;
    }
});
