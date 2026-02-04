import type { Content } from "@google/genai";

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
    conversation: ChatMessage[];
    history: TicketActivity[];
}

export interface Chatbot {
    id: string;
    name: string;
    phone: string;
    status: 'active' | 'inactive';
    conversations: number;
    responseRate: number;
    knowledgeSources: number;
}

export interface KnowledgeSource {
    id: string;
    botId: string;
    type: 'file' | 'url' | 'faq';
    name: string;
    status: 'synced' | 'pending' | 'error';
    lastSynced: string;
    content?: {
        question: string;
        answer: string;
    }
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