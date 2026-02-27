// FILE: services/firestoreStore.ts
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    writeBatch,
    serverTimestamp,
    query,
    orderBy,
    deleteDoc,
    onSnapshot,
    where,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import type { Chatbot, User, AIConfig, KnowledgeSource, Ticket, ChatMessage, TicketActivity } from "../types";

import { deleteField, updateDoc } from "firebase/firestore";


type CollectionName = "users" | "chatbots" | "aiConfigs" | "knowledgeSources" | "tickets";

export type AccountProfile = {
    displayName: string;
    username: string;
    avatarDataUrl?: string;
};

// Single-account mode: all signed-in users operate on ONE Firestore account scope.
// This is the admin portal view of the whole system.

const ACCOUNT_SCOPE_ID = "lpc-main";

function requireUid(): string {
    const authUid = auth.currentUser?.uid;
    if (!authUid) throw new Error("Not authenticated.");
    return ACCOUNT_SCOPE_ID;
}

function stripUndefinedDeep(obj: any) {
    if (Array.isArray(obj)) {
        return obj.map(stripUndefinedDeep).filter((v) => v !== undefined);
    }
    if (obj && typeof obj === "object") {
        const out: any = {};
        for (const [k, v] of Object.entries(obj)) {
            if (v === undefined) continue;
            out[k] = stripUndefinedDeep(v);
        }
        return out;
    }
    return obj;
}

/**
 * Storage layout (single account scope):
 * /accounts/{ACCOUNT_SCOPE_ID}/{collectionName}/{docId}
 */
function userCollectionRef(name: CollectionName) {
    const uid = requireUid();
    return collection(db, "accounts", uid, name);
}

/* ------------------------- CHATBOTS ------------------------- */

export async function getChatbots(): Promise<Chatbot[]> {
    const q = query(userCollectionRef("chatbots"), orderBy("createdAt", "asc"));
    const snap = await getDocs(q);

    return snap.docs.map((d) => {
        const data = d.data() as any;
        const id = String(data.id || d.id);
        return {
            ...data,
            id,
            name: String(data.name || ""),
            phone: String(data.phone || ""),
            phoneNumberId: data.phoneNumberId ? String(data.phoneNumberId) : undefined,
            whatsappBusinessAccountId: data.whatsappBusinessAccountId
                ? String(data.whatsappBusinessAccountId)
                : undefined,
            status: (data.status === "inactive" ? "inactive" : "active") as Chatbot["status"],
            conversations: Number.isFinite(Number(data.conversations)) ? Number(data.conversations) : 0,
            responseRate: Number.isFinite(Number(data.responseRate)) ? Number(data.responseRate) : 0,
            knowledgeSources: Number.isFinite(Number(data.knowledgeSources)) ? Number(data.knowledgeSources) : 0,
        } as Chatbot;
    });
}

export async function upsertChatbot(bot: Chatbot): Promise<void> {
    const uid = requireUid();
    const ref = doc(db, "accounts", uid, "chatbots", bot.id);

    // Firestore rejects `undefined`, so build a safe payload explicitly.
    const safe: any = {
        id: bot.id,
        name: String(bot.name || ""),
        phone: String(bot.phone || ""),
        status: bot.status === "inactive" ? "inactive" : "active",
        conversations: Number.isFinite(Number(bot.conversations)) ? Number(bot.conversations) : 0,
        responseRate: Number.isFinite(Number(bot.responseRate)) ? Number(bot.responseRate) : 0,
        knowledgeSources: Number.isFinite(Number(bot.knowledgeSources)) ? Number(bot.knowledgeSources) : 0,
        createdAt: (bot as any).createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    // Only include optional fields if they have a real value
    const pnid = (bot.phoneNumberId || "").toString().trim();
    if (pnid) safe.phoneNumberId = pnid;

    const waba = (bot.whatsappBusinessAccountId || "").toString().trim();
    if (waba) safe.whatsappBusinessAccountId = waba;

    await setDoc(ref, safe, { merge: true });
}

export async function updateChatbot(
    botId: string,
    patch: Partial<Chatbot>
): Promise<void> {
    const uid = requireUid();
    const ref = doc(db, "accounts", uid, "chatbots", botId);

    // Build a safe patch (no `undefined`)
    const safe: any = {
        id: botId,
        updatedAt: serverTimestamp(),
    };

    if (patch.name !== undefined) safe.name = String(patch.name || "");
    if (patch.phone !== undefined) safe.phone = String(patch.phone || "");
    if (patch.status !== undefined) safe.status = patch.status === "inactive" ? "inactive" : "active";
    if (patch.conversations !== undefined) safe.conversations = Number(patch.conversations) || 0;
    if (patch.responseRate !== undefined) safe.responseRate = Number(patch.responseRate) || 0;
    if (patch.knowledgeSources !== undefined) safe.knowledgeSources = Number(patch.knowledgeSources) || 0;

    // Optional fields: only set if non-empty string
    if (patch.phoneNumberId !== undefined) {
        const pnid = (patch.phoneNumberId || "").toString().trim();
        if (pnid) safe.phoneNumberId = pnid;
        // If it's empty, we simply DON'T send it (no undefined, no empty overwrite)
    }

    if (patch.whatsappBusinessAccountId !== undefined) {
        const waba = (patch.whatsappBusinessAccountId || "").toString().trim();
        if (waba) safe.whatsappBusinessAccountId = waba;
    }

    await setDoc(ref, safe, { merge: true });
}

export async function deleteChatbot(botId: string): Promise<void> {
    const uid = requireUid();
    const ref = doc(db, "accounts", uid, "chatbots", botId);
    await deleteDoc(ref);
}

export async function seedChatbotsIfEmpty(chatbots: Chatbot[]): Promise<boolean> {
    const existing = await getDocs(userCollectionRef("chatbots"));
    if (!existing.empty) return false;

    const uid = requireUid();
    const batch = writeBatch(db);

    for (const bot of chatbots) {
        const ref = doc(db, "accounts", uid, "chatbots", bot.id);
        batch.set(ref, {
            ...bot,
            id: bot.id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    }

    await batch.commit();
    return true;
}

/* ------------------------- AI CONFIGS ------------------------- */

export async function getAiConfigs(): Promise<AIConfig[]> {
    const q = query(userCollectionRef("aiConfigs"), orderBy("createdAt", "asc"));
    const snap = await getDocs(q);

    return snap.docs.map((d) => {
        const data = d.data() as any;
        return { botId: data.botId || d.id, ...data } as AIConfig;
    });
}

export async function upsertAiConfig(config: AIConfig): Promise<void> {
    const uid = requireUid();
    const botId = config.botId;
    if (!botId) throw new Error("AI config is missing botId.");

    const ref = doc(db, "accounts", uid, "aiConfigs", botId);

    await setDoc(
        ref,
        {
            ...config,
            botId,
            createdAt: (config as any).createdAt ?? serverTimestamp(),
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );
}

export async function seedAiConfigsIfEmpty(aiConfigs: AIConfig[]): Promise<boolean> {
    const existing = await getDocs(userCollectionRef("aiConfigs"));
    if (!existing.empty) return false;

    const uid = requireUid();
    const batch = writeBatch(db);

    for (const cfg of aiConfigs) {
        if (!cfg.botId) continue;
        const ref = doc(db, "accounts", uid, "aiConfigs", cfg.botId);
        batch.set(ref, {
            ...cfg,
            botId: cfg.botId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    }

    await batch.commit();
    return true;
}

/* ------------------------- KNOWLEDGE SOURCES ------------------------- */

export async function getKnowledgeSources(): Promise<KnowledgeSource[]> {
    const q = query(
        userCollectionRef("knowledgeSources"),
        orderBy("createdAt", "asc")
    );
    const snap = await getDocs(q);

    return snap.docs.map((d) => {
        const data = d.data() as any;
        return { id: data.id || d.id, ...data } as KnowledgeSource;
    });
}

export async function upsertKnowledgeSource(source: KnowledgeSource): Promise<void> {
    const uid = requireUid();
    const ref = doc(db, "accounts", uid, "knowledgeSources", source.id);

    // IMPORTANT: Firestore rejects `undefined` anywhere inside the object.
    // Do NOT spread `source` directly because it may contain `content: undefined`.
    const safe: any = {
        id: source.id,
        botId: source.botId,
        type: source.type,
        name: source.name,
        status: source.status,
        lastSynced: source.lastSynced,
        createdAt: (source as any).createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    if (source.content) safe.content = source.content;

    await setDoc(ref, safe, { merge: true });
}

export async function deleteKnowledgeSource(sourceId: string): Promise<void> {
    const uid = requireUid();
    const ref = doc(db, "accounts", uid, "knowledgeSources", sourceId);
    await deleteDoc(ref);
}

export async function seedKnowledgeSourcesIfEmpty(
    sources: KnowledgeSource[]
): Promise<boolean> {
    const existing = await getDocs(userCollectionRef("knowledgeSources"));
    if (!existing.empty) return false;

    const uid = requireUid();
    const batch = writeBatch(db);

    for (const s of sources) {
        const ref = doc(db, "accounts", uid, "knowledgeSources", s.id);
        const safe: any = {
            ...s,
            id: s.id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        if (!s.content) delete safe.content;

        batch.set(ref, safe);
    }

    await batch.commit();
    return true;
}

/* ------------------------- TICKETS ------------------------- */

function sanitizeChatMessage(m: ChatMessage): any {
    const safe: any = {
        id: m.id,
        sender: m.sender,
        text: m.text,
        timestamp: m.timestamp,
    };
    if (m.feedback !== undefined) safe.feedback = m.feedback;
    return safe;
}

function sanitizeTicketActivity(a: TicketActivity): any {
    return {
        id: a.id,
        user: a.user,
        action: a.action,
        timestamp: a.timestamp,
    };
}

function sanitizeTicket(t: Ticket): any {
    const out: any = {
        id: t.id,
        customerName: t.customerName,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        lastUpdate: t.lastUpdate,
        agent: t.agent,
        conversation: Array.isArray(t.conversation) ? t.conversation.map(sanitizeChatMessage) : [],
        history: Array.isArray(t.history) ? t.history.map(sanitizeTicketActivity) : [],
    };
    if ((t as any).assignedToUid) out.assignedToUid = (t as any).assignedToUid;
    return out;
}

export async function getTickets(): Promise<Ticket[]> {
    const q = query(userCollectionRef('tickets'), orderBy('createdAt', 'asc'));
    const snap = await getDocs(q);

    return snap.docs.map((d) => {
        const data = d.data() as any;
        return { id: data.id || d.id, ...data } as Ticket;
    });
}

export function subscribeTickets(onChange: (tickets: Ticket[]) => void): () => void {
    const q = query(userCollectionRef('tickets'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snap) => {
        const items = snap.docs.map((d) => {
            const data = d.data() as any;
            return { id: data.id || d.id, ...data } as Ticket;
        });
        onChange(items);
    });
}

export function subscribeTicketsAssignedTo(uid: string, onChange: (tickets: Ticket[]) => void): () => void {
    const q = query(
        userCollectionRef('tickets'),
        where('assignedToUid', '==', uid),
        orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snap) => {
        const items = snap.docs.map((d) => {
            const data = d.data() as any;
            return { id: data.id || d.id, ...data } as Ticket;
        });
        onChange(items);
    });
}

export async function upsertTicket(ticket: Ticket): Promise<void> {
    const uid = requireUid();
    const ref = doc(db, 'accounts', uid, 'tickets', ticket.id);

    await setDoc(
        ref,
        {
            ...sanitizeTicket(ticket),
            createdAt: (ticket as any).createdAt ?? serverTimestamp(),
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );
}

export async function updateTicket(ticketId: string, patch: Partial<Ticket>): Promise<void> {
    const uid = requireUid();
    const ref = doc(db, "accounts", uid, "tickets", ticketId);

    // Build a safe patch with NO undefined values (Firestore rejects undefined)
    const safe: any = {
        id: ticketId,
        updatedAt: serverTimestamp(),
    };

    if (patch.customerName !== undefined) safe.customerName = patch.customerName;
    if (patch.subject !== undefined) safe.subject = patch.subject;
    if (patch.status !== undefined) safe.status = patch.status;
    if (patch.priority !== undefined) safe.priority = patch.priority;
    if (patch.lastUpdate !== undefined) safe.lastUpdate = patch.lastUpdate;
    if (patch.agent !== undefined) safe.agent = patch.agent;

    // assignedToUid: allow removing the field when unassigning
    if ((patch as any).assignedToUid !== undefined) {
        const v = String((patch as any).assignedToUid || "").trim();
        safe.assignedToUid = v ? v : deleteField();
    }

    if (patch.conversation !== undefined) {
        safe.conversation = Array.isArray(patch.conversation)
            ? patch.conversation.map(sanitizeChatMessage)
            : [];
    }

    if (patch.history !== undefined) {
        safe.history = Array.isArray(patch.history)
            ? patch.history.map(sanitizeTicketActivity)
            : [];
    }

    // Final deep-clean (extra safety)
    const cleaned = stripUndefinedDeep(safe);

    await updateDoc(ref, cleaned);
}

export async function deleteTicket(ticketId: string): Promise<void> {
    const uid = requireUid();
    const ref = doc(db, 'accounts', uid, 'tickets', ticketId);
    await deleteDoc(ref);
}

export async function deleteTicketsById(ids: string[]): Promise<void> {
    const uid = requireUid();
    const batch = writeBatch(db);
    for (const id of ids) {
        const ref = doc(db, 'accounts', uid, 'tickets', id);
        batch.delete(ref);
    }
    await batch.commit();
}

export async function seedTicketsIfEmpty(tickets: Ticket[]): Promise<boolean> {
    const existing = await getDocs(userCollectionRef('tickets'));
    if (!existing.empty) return false;

    const uid = requireUid();
    const batch = writeBatch(db);

    for (const t of tickets) {
        const ref = doc(db, 'accounts', uid, 'tickets', t.id);
        batch.set(ref, {
            ...sanitizeTicket(t),
            id: t.id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    }

    await batch.commit();
    return true;
}

/* ------------------------- USERS ------------------------- */

export async function getUserById(userId: string): Promise<User | null> {
    const uid = requireUid();
    const ref = doc(db, 'accounts', uid, 'users', userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() as any;
    return { id: data.id || snap.id, ...data } as User;
}

export async function getUsers(): Promise<User[]> {
    const q = query(userCollectionRef("users"), orderBy("createdAt", "asc"));
    const snap = await getDocs(q);

    return snap.docs.map((d) => {
        const data = d.data() as any;
        return { id: data.id || d.id, ...data } as User;
    });
}

export async function upsertUser(user: User): Promise<void> {
    const uid = requireUid();
    const ref = doc(db, "accounts", uid, "users", user.id);

    await setDoc(
        ref,
        {
            ...user,
            id: user.id,
            createdAt: (user as any).createdAt ?? serverTimestamp(),
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );
}

export async function updateUser(userId: string, patch: Partial<User>): Promise<void> {
    const uid = requireUid();
    const ref = doc(db, "accounts", uid, "users", userId);

    await setDoc(
        ref,
        {
            ...patch,
            id: userId,
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );
}

export async function deleteUser(userId: string): Promise<void> {
    const uid = requireUid();
    const ref = doc(db, "accounts", uid, "users", userId);
    await deleteDoc(ref);
}

export async function deleteUsersById(ids: string[]): Promise<void> {
    const uid = requireUid();
    const batch = writeBatch(db);
    for (const id of ids) {
        const ref = doc(db, "accounts", uid, "users", id);
        batch.delete(ref);
    }
    await batch.commit();
}

export async function seedUsersIfEmpty(users: User[]): Promise<boolean> {
    const existing = await getDocs(userCollectionRef("users"));
    if (!existing.empty) return false;

    const uid = requireUid();
    const batch = writeBatch(db);

    for (const u of users) {
        const ref = doc(db, "accounts", uid, "users", u.id);
        batch.set(ref, {
            ...u,
            id: u.id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    }

    await batch.commit();
    return true;
}

/* ------------------------- ACCOUNT PROFILE ------------------------- */

export async function getAccountProfile(): Promise<AccountProfile | null> {
    const uid = requireUid();
    const ref = doc(db, 'accounts', uid, 'profile', 'main');
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const data = snap.data() as any;
    return {
        displayName: String(data.displayName || ''),
        username: String(data.username || ''),
        avatarDataUrl: data.avatarDataUrl ? String(data.avatarDataUrl) : undefined,
    };
}

export async function upsertAccountProfile(patch: AccountProfile): Promise<void> {
    const uid = requireUid();
    const ref = doc(db, 'accounts', uid, 'profile', 'main');

    const safe: any = {
        displayName: String(patch.displayName || ''),
        username: String(patch.username || ''),
        updatedAt: serverTimestamp(),
    };
    if (patch.avatarDataUrl) safe.avatarDataUrl = String(patch.avatarDataUrl);

    await setDoc(ref, safe, { merge: true });
}
