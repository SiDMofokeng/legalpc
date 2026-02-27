// FILE: components/Chatbots.tsx
import React, { useEffect, useMemo, useState } from "react";
import type { Chatbot, AIConfig, KnowledgeSource, Ticket } from "../types";
import Card from "./ui/Card";
import { EditIcon } from "./icons/EditIcon";
import { DeleteIcon } from "./icons/DeleteIcon";
import ConnectBotModal from "./ConnectBotModal";
import EditBotModal from "./EditBotModal";
import ChatSimulator from "./ChatSimulator";

import {
    getChatbots as fsGetChatbots,
    upsertChatbot as fsUpsertChatbot,
    updateChatbot as fsUpdateChatbot,
    deleteChatbot as fsDeleteChatbot,
    subscribeTickets as fsSubscribeTickets,
} from "../services/firestoreStore";

import { subscribeTickets } from "../services/firestoreStore";

interface ChatbotsProps {
    chatbots: Chatbot[];
    setChatbots: React.Dispatch<React.SetStateAction<Chatbot[]>>;
    aiConfigs: AIConfig[];
    sources: KnowledgeSource[];
    onAddFeedbackToKnowledge: (botId: string, question: string, answer: string) => void;
}

const BotCard: React.FC<{
    bot: Chatbot;
    sourceCount: number;
    conversations: number;
    responseRate: number;
    testBtnClassName: string;
    onEdit: () => void;
    onSimulate: () => void;
    onToggleStatus: () => void;
    onDelete: () => void;
}> = ({ bot, sourceCount, conversations, responseRate, testBtnClassName, onEdit, onSimulate, onToggleStatus, onDelete }) => (

    <Card>
        <div className="flex justify-between items-start">
            <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {(bot.name || "").trim() || "Unnamed Bot"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {(bot.phone || "").trim() || "—"}
                </p>
                <div
                    className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bot.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                >
                    <span
                        className={`h-2 w-2 rounded-full mr-1.5 ${bot.status === "active" ? "bg-green-400" : "bg-gray-400"
                            }`}
                    ></span>
                    {bot.status === "active" ? "Active" : "Inactive"}
                </div>
            </div>

            <div className="flex space-x-2">
                <button
                    onClick={onEdit}
                    className="p-2 text-gray-400 hover:text-lpc-gold rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Edit"
                >
                    <EditIcon className="w-5 h-5" />
                </button>
                <button
                    onClick={onDelete}
                    className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Delete"
                >
                    <DeleteIcon className="w-5 h-5" />
                </button>
            </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div>
                <p className="text-2xl font-semibold">{conversations}</p>
                <p className="text-xs text-gray-500">Messages</p>
            </div>
            <div>
                <p className="text-2xl font-semibold">{responseRate}%</p>
                <p className="text-xs text-gray-500">Response Rate</p>
            </div>
            <div>
                <p className="text-2xl font-semibold">{sourceCount}</p>
                <p className="text-xs text-gray-500">Sources</p>
            </div>
        </div>

        <div className="mt-4 flex space-x-2">
            <button
                onClick={onSimulate}
                className={`flex-1 px-4 py-2 text-sm font-bold rounded-lg ${testBtnClassName}`}
            >
                Chat
            </button>

            <label htmlFor={`toggle-${bot.id}`} className="flex items-center cursor-pointer">
                <div className="relative">
                    <input
                        type="checkbox"
                        id={`toggle-${bot.id}`}
                        className="sr-only"
                        checked={bot.status === "active"}
                        onChange={onToggleStatus}
                    />
                    <div
                        className={`block w-10 h-6 rounded-full ring-1 ring-black/5 transition-colors ${bot.status === "active" ? "bg-[#0B0F14]/15" : "bg-gray-200"
                            }`}
                    ></div>
                    <div
                        className={`dot absolute left-1 top-1 w-4 h-4 rounded-full transition ${bot.status === "active"
                            ? "transform translate-x-full bg-[#0B0F14]"
                            : "bg-white ring-1 ring-black/10"
                            }`}
                    ></div>
                </div>
            </label>
        </div>
    </Card>
);

const makeId = () => {
    // @ts-ignore
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `bot-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

function ticketBelongsToBot(t: any, bot: Chatbot): boolean {
    const metaBotId = String(t?.suggestedReplyMeta?.botId || "").trim();
    if (metaBotId && metaBotId === bot.id) return true;

    const tPhoneNumberId = String(t?.meta?.phoneNumberId || "").trim();
    const botPhoneNumberId = String((bot as any)?.phoneNumberId || "").trim();
    if (tPhoneNumberId && botPhoneNumberId && tPhoneNumberId === botPhoneNumberId) return true;

    return false;
}

function countInboundMessagesForBot(tickets: any[], bot: Chatbot): number {
    let count = 0;
    for (const t of tickets) {
        if (!ticketBelongsToBot(t, bot)) continue;
        const conv = Array.isArray(t?.conversation) ? t.conversation : [];
        for (const m of conv) {
            const sender = String(m?.sender || "").toLowerCase().trim();
            const text = String(m?.text || "").trim();
            if (sender === "user" && text) count++;
        }
    }
    return count;
}

function didBotRespond(t: any): boolean {
    // treat as "responded" if AI message exists OR botProcessedAt exists OR botDraft exists
    if (t?.botProcessedAt) return true;
    if (String(t?.botDraft || "").trim()) return true;

    const conv = Array.isArray(t?.conversation) ? t.conversation : [];
    return conv.some((m: any) => String(m?.sender || "").toLowerCase().trim() === "ai");
}

function responseRateForBot(tickets: any[], bot: Chatbot): number {
    const related = tickets.filter((t) => ticketBelongsToBot(t, bot));
    if (related.length === 0) return 0;
    const responded = related.filter(didBotRespond).length;
    return Math.round((responded / related.length) * 100);
}

function hasAiResponse(t: any): boolean {
    const conv = Array.isArray(t?.conversation) ? t.conversation : [];
    const hasAiMsg = conv.some((m: any) => String(m?.sender || "").toLowerCase() === "ai");
    if (hasAiMsg) return true;
    if (String(t?.botProcessedAt || "").trim()) return true;
    if (String(t?.botDraft || "").trim()) return true;
    if (String(t?.suggestedReply || "").trim()) return true;
    return false;
}

const Chatbots: React.FC<ChatbotsProps> = ({
    chatbots,
    setChatbots,
    aiConfigs,
    sources,
    onAddFeedbackToKnowledge,
}) => {
    const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
    const [editingBot, setEditingBot] = useState<Chatbot | null>(null);
    const [simulatingBot, setSimulatingBot] = useState<Chatbot | null>(null);
    const [loading, setLoading] = useState(true);

    // live tickets for stats
    const [tickets, setTickets] = useState<Ticket[]>([]);

    // ---- Firestore: load chatbots ----
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                setLoading(true);
                const remote = await fsGetChatbots();
                if (!cancelled) setChatbots(remote);
            } catch (err: any) {
                console.error("Failed to load chatbots from Firestore:", err);
                alert(`Could not load chatbots: ${err?.message || "Unknown error"}`);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const unsub = subscribeTickets((items) => setTickets(items));
        return () => unsub();
    }, []);



    // ---- Firestore: subscribe tickets (for stats + simulator linkage) ----
    useEffect(() => {
        const unsub = fsSubscribeTickets((items) => setTickets(items));
        return () => unsub();
    }, []);

    const handleConnectBot = async (
        botName: string,
        phoneNumber: string,
        phoneNumberId?: string,
        wabaId?: string
    ) => {
        const newBot: Chatbot = {
            id: makeId(),
            name: botName,
            phone: phoneNumber,
            phoneNumberId: phoneNumberId || undefined,
            whatsappBusinessAccountId: wabaId || undefined,
            status: "active",
            conversations: 0,
            responseRate: 0,
            knowledgeSources: 0,
        };

        try {
            await fsUpsertChatbot(newBot);
            setChatbots((prev) => [...prev, newBot]);
            setIsConnectModalOpen(false);
        } catch (err: any) {
            console.error("Failed to create bot:", err);
            alert(`Could not create bot: ${err?.message || "Unknown error"}`);
        }
    };

    const handleSaveBot = async (updatedBot: Chatbot) => {
        try {
            await fsUpsertChatbot(updatedBot);
            setChatbots((prev) => prev.map((b) => (b.id === updatedBot.id ? updatedBot : b)));
            setEditingBot(null);
        } catch (err: any) {
            console.error("Failed to save bot:", err);
            alert(`Could not save bot: ${err?.message || "Unknown error"}`);
        }
    };

    const handleToggleStatus = async (botId: string) => {
        const current = chatbots.find((b) => b.id === botId);
        if (!current) return;

        const nextStatus: Chatbot["status"] = current.status === "active" ? "inactive" : "active";

        setChatbots((prev) => prev.map((b) => (b.id === botId ? { ...b, status: nextStatus } : b)));

        try {
            await fsUpdateChatbot(botId, { status: nextStatus });
        } catch (err: any) {
            console.error("Failed to toggle status:", err);
            setChatbots((prev) => prev.map((b) => (b.id === botId ? { ...b, status: current.status } : b)));
            alert(`Could not update status: ${err?.message || "Unknown error"}`);
        }
    };

    const handleDeleteBot = async (bot: Chatbot) => {
        const ok = window.confirm(`Delete "${bot.name}"?\n\nThis removes it from the dashboard for your account.`);
        if (!ok) return;

        const before = chatbots;
        setChatbots((prev) => prev.filter((b) => b.id !== bot.id));

        try {
            await fsDeleteChatbot(bot.id);
        } catch (err: any) {
            console.error("Failed to delete bot:", err);
            setChatbots(before);
            alert(`Could not delete bot: ${err?.message || "Unknown error"}`);
        }
    };

    const botToSimulateConfig = useMemo(
        () => aiConfigs.find((c) => c.botId === simulatingBot?.id),
        [aiConfigs, simulatingBot]
    );

    const botToSimulateSources = useMemo(
        () => sources.filter((s) => s.botId === simulatingBot?.id),
        [sources, simulatingBot]
    );

    const sourceCountByBotId = useMemo(() => {
        const map: Record<string, number> = {};
        for (const s of sources) {
            if (!s.botId) continue;
            map[s.botId] = (map[s.botId] || 0) + 1;
        }
        return map;
    }, [sources]);

    const statsByBotId = useMemo(() => {
        const map: Record<string, { conversations: number; responseRate: number }> = {};
        for (const b of chatbots) {
            map[b.id] = {
                conversations: countInboundMessagesForBot(tickets as any[], b),
                responseRate: responseRateForBot(tickets as any[], b),
            };
        }
        return map;
    }, [tickets, chatbots]);

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">Your Chatbots</h1>
                <button
                    onClick={() => setIsConnectModalOpen(true)}
                    className="px-4 py-2 text-sm font-extrabold rounded-lg btn-primary-gold"
                >
                    + Connect New Bot
                </button>
            </div>

            {loading ? (
                <Card>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Loading chatbots…</p>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {chatbots.map((bot) => {
                        const stat = statsByBotId[bot.id] || { ticketCount: 0, respondedCount: 0, responseRatePct: 0 };
                        return (
                            <BotCard
                                key={bot.id}
                                bot={bot}
                                sourceCount={sourceCountByBotId[bot.id] || 0}
                                conversations={statsByBotId[bot.id]?.conversations ?? 0}
                                responseRate={statsByBotId[bot.id]?.responseRate ?? 0}
                                testBtnClassName={'btn-primary-ink'}
                                onEdit={() => setEditingBot(bot)}
                                onSimulate={() => setSimulatingBot(bot)}
                                onToggleStatus={() => handleToggleStatus(bot.id)}
                                onDelete={() => handleDeleteBot(bot)}
                            />
                        );
                    })}
                </div>
            )}

            {isConnectModalOpen && (
                <ConnectBotModal onClose={() => setIsConnectModalOpen(false)} onConnect={handleConnectBot} />
            )}

            {editingBot && <EditBotModal bot={editingBot} onClose={() => setEditingBot(null)} onSave={handleSaveBot} />}

            {simulatingBot && (
                <ChatSimulator
                    bot={simulatingBot}
                    config={botToSimulateConfig}
                    sources={botToSimulateSources}
                    onClose={() => setSimulatingBot(null)}
                    onAddFeedbackToKnowledge={onAddFeedbackToKnowledge}
                />
            )}
        </>
    );
};

export default Chatbots;
