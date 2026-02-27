// FILE: components/ChatSimulator.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, Chatbot, AIConfig, KnowledgeSource, Ticket } from "../types";
import { ThumbUpIcon } from "./icons/ThumbUpIcon";
import { ThumbDownIcon } from "./icons/ThumbDownIcon";
import FeedbackModal from "./FeedbackModal";
import { subscribeTickets } from "../services/firestoreStore";

interface ChatSimulatorProps {
    bot: Chatbot;
    config?: AIConfig;
    sources: KnowledgeSource[];
    onClose: () => void;
    onAddFeedbackToKnowledge: (botId: string, question: string, answer: string) => void;
}

interface FeedbackContext {
    userQuery: string;
    aiResponse: string;
    messageId: number | string;
}

function ticketBelongsToBot(t: any, bot: Chatbot): boolean {
    const metaBotId = String(t?.suggestedReplyMeta?.botId || "").trim();
    if (metaBotId && metaBotId === bot.id) return true;

    const tPhoneNumberId = String(t?.meta?.phoneNumberId || "").trim();
    const botPhoneNumberId = String((bot as any)?.phoneNumberId || "").trim();
    if (tPhoneNumberId && botPhoneNumberId && tPhoneNumberId === botPhoneNumberId) return true;

    return false;
}

function ticketSortKey(t: any): number {
    // Prefer Firestore timestamp (createdAt.seconds) if present
    if (t?.createdAt?.seconds) return Number(t.createdAt.seconds) * 1000;
    // then ISO lastUpdate
    const lu = Date.parse(String(t?.lastUpdate || ""));
    if (!Number.isNaN(lu)) return lu;
    // fallback: try updatedAt
    if (t?.updatedAt?.seconds) return Number(t.updatedAt.seconds) * 1000;
    return 0;
}

const ChatSimulator: React.FC<ChatSimulatorProps> = ({ bot, onClose, onAddFeedbackToKnowledge }) => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [activeTicket, setActiveTicket] = useState<any | null>(null);

    const [feedbackContext, setFeedbackContext] = useState<FeedbackContext | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Subscribe to ALL tickets, then filter to this bot
    useEffect(() => {
        const unsub = subscribeTickets((items) => setTickets(items));
        return () => unsub();
    }, []);

    // Pick latest ticket for this bot (live)
    useEffect(() => {
        const related = (tickets as any[]).filter((t) => ticketBelongsToBot(t, bot));
        related.sort((a, b) => ticketSortKey(b) - ticketSortKey(a));
        setActiveTicket(related[0] || null);
    }, [tickets, bot]);

    const suggestedReply = useMemo(() => {
        const sr = String(activeTicket?.suggestedReply || "").trim();
        return sr;
    }, [activeTicket]);

    const messages: ChatMessage[] = useMemo(() => {
        const conv = Array.isArray(activeTicket?.conversation) ? activeTicket.conversation : [];
        // Normalize into ChatMessage shape
        return conv.map((m: any) => ({
            id: m?.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            sender: (String(m?.sender || "user").toLowerCase() as any) || "user",
            text: String(m?.text || ""),
            timestamp: String(m?.timestamp || ""),
            feedback: m?.feedback ?? null,
        }));
    }, [activeTicket]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, suggestedReply]);

    const handleFeedback = (messageId: string | number, feedback: "good" | "bad") => {
        const idx = messages.findIndex((m) => m.id === messageId);
        if (feedback === "bad" && idx > 0) {
            const userMsg = messages[idx - 1];
            const aiMsg = messages[idx];
            if (userMsg?.sender === "user" && (aiMsg?.sender === "ai" || aiMsg?.sender === "agent")) {
                setFeedbackContext({
                    userQuery: userMsg.text,
                    aiResponse: aiMsg.text,
                    messageId: aiMsg.id,
                });
            }
        } else {
            // For now we only store knowledge feedback, not writing per-message feedback to Firestore
            // (keeps this view read-only and avoids side effects)
        }
    };

    const submitFeedback = (correctedAnswer: string) => {
        if (feedbackContext) {
            onAddFeedbackToKnowledge(bot.id, feedbackContext.userQuery, correctedAnswer);
        }
        setFeedbackContext(null);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg h-[80vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                    <div>
                        <span
                            className={`text-[11px] px-2 py-0.5 rounded-full ${String(activeTicket?.suggestedReplyStatus || "").toLowerCase() === "ready"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                                }`}
                        >
                            {String(activeTicket?.suggestedReplyStatus || "—")}
                        </span>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{bot.name}</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {activeTicket ? (
                                <>
                                    Live Ticket: <span className="font-semibold">{String(activeTicket.id || "")}</span> •{" "}
                                    {String(activeTicket.customerName || "Unknown Customer")}
                                </>
                            ) : (
                                "No tickets found for this bot yet."
                            )}
                        </p>
                    </div>

                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                {/* Conversation */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {messages.map((message) => {
                        const isUser = message.sender === "user";
                        const isAi = message.sender === "ai";
                        const isAgent = message.sender === "agent";
                        const left = isAi || isAgent;

                        return (
                            <div key={String(message.id)} className={`flex items-end gap-2 ${left ? "justify-start" : "justify-end"}`}>
                                {left && (
                                    <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0"></div>
                                )}

                                <div
                                    className={`max-w-md p-3 rounded-2xl ${isUser
                                        ? "bg-blue-600 text-white rounded-br-none"
                                        : "bg-gray-200 dark:bg-gray-700 rounded-bl-none"
                                        }`}
                                >
                                    <p className="text-[11px] font-semibold opacity-80 mb-1">
                                        {isUser ? "Customer" : isAi ? "Bot" : "Agent"}
                                    </p>

                                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>

                                    <div className="flex justify-end items-center mt-1">
                                        <span className={`text-xs ${isUser ? "text-blue-200" : "text-gray-500 dark:text-gray-400"}`}>
                                            {message.timestamp ? new Date(message.timestamp).toLocaleString() : ""}
                                        </span>

                                        {(isAi || isAgent) && (
                                            <div className="ml-2 flex gap-1">
                                                <button
                                                    onClick={() => handleFeedback(message.id, "good")}
                                                    className={"text-gray-400 hover:text-green-500"}
                                                    title="Good"
                                                >
                                                    <ThumbUpIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleFeedback(message.id, "bad")}
                                                    className={"text-gray-400 hover:text-red-500"}
                                                    title="Bad"
                                                >
                                                    <ThumbDownIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    <div ref={messagesEndRef} />
                </div>

                {/* Footer (read-only) */}
                <div className="p-4 border-t dark:border-gray-700">

                </div>
            </div>

            {feedbackContext && (
                <FeedbackModal
                    userQuery={feedbackContext.userQuery}
                    aiResponse={feedbackContext.aiResponse}
                    onClose={() => setFeedbackContext(null)}
                    onSubmit={submitFeedback}
                />
            )}
        </div>
    );
};

export default ChatSimulator;
