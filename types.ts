export interface ChatMessage {
    id: number | string;
    sender: 'user' | 'ai' | 'agent';
    text: string;
    timestamp: string;
    feedback?: 'good' | 'bad' | null;
}

export interface TicketActivity {
    id: string;
    user: string;
    action: string;
    timestamp: string;
}

export interface Ticket {
    id: string;
    customerName: string;
    subject: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high';
    lastUpdate: string;
    agent: string;
    /** Firebase Auth uid of the assigned agent (used for security rules). */
    assignedToUid?: string;
    conversation: ChatMessage[];
    history: TicketActivity[];
}

export interface Chatbot {
    id: string;
    name: string;
    /** E.164 display phone number (e.g. +15551234567). */
    phone: string;

    /** Meta WhatsApp Cloud API phone_number_id (optional until connected). */
    phoneNumberId?: string;

    /** Meta WhatsApp Business Account / WABA id (optional until connected). */
    whatsappBusinessAccountId?: string;

    status: 'active' | 'inactive';
    conversations: number;
    responseRate: number;
    /** Legacy/stored count (UI should derive from knowledgeSources collection). */
    knowledgeSources: number;
}

export interface KnowledgeSource {
    id: string;
    botId: string;
    type: "file" | "url" | "faq";
    name: string;
    status: "synced" | "pending" | "error";
    lastSynced: string;
    content?: {
        // faq
        question?: string;
        answer?: string;

        // url
        url?: string;

        // file
        storagePath?: string;
        fileName?: string;
        mimeType?: string | null;

        // optional sync outputs (functions may write these)
        extractedText?: string;
        summary?: string;
    };
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: 'Admin' | 'Agent';
    avatar: string;
    status: 'active' | 'pending';
}

export interface AIConfig {
    botId: string;
    personality: 'friendly' | 'professional' | 'witty';
    tone: 'formal' | 'casual' | 'enthusiastic';
    goal: string;
    additionalInfo: string;
    interactionLimit: number;
    responseLength: 'short' | 'medium' | 'detailed';
}