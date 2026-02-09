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
} from "firebase/firestore";
import { auth, db } from "./firebase";
import type { Chatbot, User, AIConfig, KnowledgeSource, Ticket, ChatMessage, TicketActivity } from "../types";

type CollectionName = "users" | "chatbots" | "aiConfigs" | "knowledgeSources" | "tickets";

export type AccountProfile = {
    displayName: string;
    username: string;
    avatarDataUrl?: string;
};

function requireUid(): string {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("Not authenticated.");
    return uid;
}

/**
 * Storage layout (per signed-in Firebase user):
 * /accounts/{uid}/{collectionName}/{docId}
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
        return { id: data.id || d.id, ...data } as Chatbot;
    });
}

export async function upsertChatbot(bot: Chatbot): Promise<void> {
    const uid = requireUid();
    const ref = doc(db, "accounts", uid, "chatbots", bot.id);

    await setDoc(
        ref,
        {
            ...bot,
            id: bot.id,
            createdAt: (bot as any).createdAt ?? serverTimestamp(),
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );
}

export async function updateChatbot(
    botId: string,
    patch: Partial<Chatbot>
): Promise<void> {
    const uid = requireUid();
    const ref = doc(db, "accounts", uid, "chatbots", botId);

    await setDoc(
        ref,
        {
            ...patch,
            id: botId,
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );
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
    return {
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
}

export async function getTickets(): Promise<Ticket[]> {
    const q = query(userCollectionRef('tickets'), orderBy('createdAt', 'asc'));
    const snap = await getDocs(q);

    return snap.docs.map((d) => {
        const data = d.data() as any;
        return { id: data.id || d.id, ...data } as Ticket;
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
    const ref = doc(db, 'accounts', uid, 'tickets', ticketId);

    const safe: any = { ...patch, id: ticketId, updatedAt: serverTimestamp() };
    if (patch.conversation) safe.conversation = patch.conversation.map(sanitizeChatMessage);
    if (patch.history) safe.history = patch.history.map(sanitizeTicketActivity);

    await setDoc(ref, safe, { merge: true });
}

export async function deleteTicket(ticketId: string): Promise<void> {
    const uid = requireUid();
    const ref = doc(db, 'accounts', uid, 'tickets', ticketId);
    await deleteDoc(ref);
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
