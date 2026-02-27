// FILE: components/TicketSimulator.tsx
import React, { useMemo, useState } from "react";
import type { Ticket, ChatMessage, TicketActivity, User } from "../types";
import Card from "./ui/Card";

import { db } from "../services/firebase";
import { doc, setDoc } from "firebase/firestore";

const ACCOUNT_SCOPE_ID = "lpc-main";

function makeTicketId() {
    const n = Date.now();
    const r = Math.random().toString(16).slice(2, 8).toUpperCase();
    return `TKT-${n}-${r}`;
}

function nowIso() {
    return new Date().toISOString();
}

function fallbackBotReply(inboundText: string) {
    const t = String(inboundText || "").trim().toLowerCase();
    // ultra-basic “demo brain” — you can refine later
    if (t.includes("refund") || t.includes("money")) {
        return "Thanks for your message. Please share your full name, the practitioner’s name (if known), and any reference number or proof of payment so we can assist. Reply with those details and we’ll guide you on the next steps.";
    }
    if (t.includes("complaint") || t.includes("report")) {
        return "Thanks for your message. Please share your full name, the practitioner’s name (or practice number if you have it), and a short summary of what happened. Reply with those details and we’ll assist further.";
    }
    return "Thanks for your message. Can you share your full name and your case/reference number so we can assist? Reply with those details and we’ll help further.";
}

type Props = {
    tickets: Ticket[];
    isAdmin: boolean;
    // Optional: lets us update UI instantly (subscription will also update it)
    setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
    users: User[];
};

const TicketSimulator: React.FC<Props> = ({ tickets, isAdmin, setTickets, users }) => {
    const [mode, setMode] = useState<"create" | "append">("append");
    const [targetTicketId, setTargetTicketId] = useState<string>("");
    const [customerName, setCustomerName] = useState<string>("WhatsApp 16315551181");
    const [inboundText, setInboundText] = useState<string>("this is a text message");
    const [priority, setPriority] = useState<Ticket["priority"]>("medium");
    const [busy, setBusy] = useState<boolean>(false);

    const openTickets = useMemo(() => {
        return tickets
            .filter((t) => String(t.status).toLowerCase() === "open")
            .slice()
            .sort((a, b) => {
                const ax = Date.parse(String((a as any).lastUpdate || "")) || 0;
                const bx = Date.parse(String((b as any).lastUpdate || "")) || 0;
                return bx - ax;
            });
    }, [tickets]);

    const actorName = useMemo(() => {
        // mirrors the logic vibe you already use in Tickets.tsx
        const admin = users.find((u) => u.role === "Admin" && u.status === "active");
        return admin?.name || users.find((u) => u.status === "active")?.name || "System";
    }, [users]);

    if (!isAdmin) return null;

    const handleSimulate = async () => {
        const text = String(inboundText || "").trim();
        if (!text) return alert("Type an inbound message to simulate.");

        setBusy(true);
        try {
            const iso = nowIso();

            const userMsg: ChatMessage = {
                id: `user-${Date.now()}`,
                sender: "user",
                text,
                timestamp: iso,
            };

            const botText = fallbackBotReply(text);

            const aiMsg: ChatMessage = {
                id: `ai-${Date.now() + 1}`,
                sender: "ai",
                text: botText,
                timestamp: iso,
            };

            if (mode === "append") {
                const tid = String(targetTicketId || "").trim();
                if (!tid) return alert("Select a ticket to append to (or switch to Create).");

                const current = tickets.find((t) => t.id === tid);
                if (!current) return alert("Ticket not found in UI list (try refresh).");

                const nextConversation = [...(current.conversation || []), userMsg, aiMsg];

                const nextHistory: TicketActivity[] = [
                    ...(current.history || []),
                    {
                        id: `h-${Date.now()}`,
                        user: "System",
                        action: "Simulated inbound message appended (demo)",
                        timestamp: iso,
                    },
                ];

                const updatedTicket: Ticket = {
                    ...current,
                    status: "open",
                    lastUpdate: iso,
                    // keep subject stable, but update if empty
                    subject: current.subject || text.slice(0, 60),
                    priority: current.priority || priority,
                    agent: current.agent || "Webhook",
                    conversation: nextConversation,
                    history: nextHistory,
                };

                // Write to Firestore (include suggestedReply too, even though Ticket type doesn’t list it)
                const ref = doc(db, "accounts", ACCOUNT_SCOPE_ID, "tickets", tid);
                await setDoc(
                    ref,
                    {
                        ...updatedTicket,
                        suggestedReply: botText,
                        suggestedReplyStatus: "ready",
                        suggestedReplyCreatedAt: iso,
                        suggestedReplyMeta: {
                            model: null,
                            usedContext: null,
                            error: "SIMULATION_MODE",
                        },
                        updatedAt: new Date(),
                    } as any,
                    { merge: true }
                );

                // Optimistic UI (subscription will confirm)
                setTickets((prev) => prev.map((t) => (t.id === tid ? updatedTicket : t)));
                return;
            }

            // mode === "create"
            const newId = makeTicketId();

            const ticket: Ticket = {
                id: newId,
                customerName: String(customerName || "WhatsApp User").trim(),
                subject: text.slice(0, 60),
                status: "open",
                priority,
                lastUpdate: iso,
                agent: "Webhook",
                conversation: [userMsg, aiMsg],
                history: [
                    {
                        id: "h1",
                        user: actorName,
                        action: "Ticket created (simulation/demo)",
                        timestamp: iso,
                    },
                ],
            };

            const ref = doc(db, "accounts", ACCOUNT_SCOPE_ID, "tickets", newId);
            await setDoc(
                ref,
                {
                    ...ticket,
                    suggestedReply: botText,
                    suggestedReplyStatus: "ready",
                    suggestedReplyCreatedAt: iso,
                    suggestedReplyMeta: {
                        model: null,
                        usedContext: null,
                        error: "SIMULATION_MODE",
                    },
                    meta: {
                        provider: "simulation",
                        from: ticket.customerName,
                        fromNorm: ticket.customerName,
                        phoneNumberId: null,
                    },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                } as any,
                { merge: true }
            );

            // Optimistic UI
            setTickets((prev) => [...prev, ticket]);
            setTargetTicketId(newId);
            setMode("append");
        } catch (e: any) {
            console.error("SIMULATOR_ERROR", e);
            alert(`Simulator failed: ${e?.message || String(e)}`);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Card className="mb-6">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">Demo Simulator (No WhatsApp / No Functions)</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                    Writes directly to Firestore: accounts/{ACCOUNT_SCOPE_ID}/tickets
                </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                <div className="lg:col-span-1">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Mode</label>
                    <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-md border dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    >
                        <option value="append">Append to existing ticket</option>
                        <option value="create">Create new ticket</option>
                    </select>
                </div>

                <div className="lg:col-span-1">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                        Ticket (Open)
                    </label>
                    <select
                        value={targetTicketId}
                        onChange={(e) => setTargetTicketId(e.target.value)}
                        disabled={mode !== "append"}
                        className="w-full px-3 py-2 rounded-md border dark:border-gray-700 bg-white dark:bg-gray-800 text-sm disabled:opacity-60"
                    >
                        <option value="">Select ticket…</option>
                        {openTickets.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.id} — {t.customerName}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="lg:col-span-1">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                        Customer (for Create)
                    </label>
                    <input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        disabled={mode !== "create"}
                        className="w-full px-3 py-2 rounded-md border dark:border-gray-700 bg-white dark:bg-gray-800 text-sm disabled:opacity-60"
                        placeholder="WhatsApp 27XXXXXXXXX"
                    />
                </div>

                <div className="lg:col-span-1">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                        Priority (Create)
                    </label>
                    <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as any)}
                        disabled={mode !== "create"}
                        className="w-full px-3 py-2 rounded-md border dark:border-gray-700 bg-white dark:bg-gray-800 text-sm disabled:opacity-60"
                    >
                        <option value="low">low</option>
                        <option value="medium">medium</option>
                        <option value="high">high</option>
                    </select>
                </div>

                <div className="lg:col-span-4">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                        Simulated inbound message
                    </label>
                    <textarea
                        value={inboundText}
                        onChange={(e) => setInboundText(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 rounded-md border dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                        placeholder="Type the customer message here…"
                    />
                </div>

                <div className="lg:col-span-4 flex justify-end">
                    <button
                        onClick={handleSimulate}
                        disabled={busy}
                        className="px-4 py-2 rounded-full bg-[#C79A2A] text-black font-semibold text-sm hover:opacity-90 disabled:opacity-60"
                    >
                        {busy ? "Simulating…" : "Simulate inbound → append bot reply"}
                    </button>
                </div>
            </div>
        </Card>
    );
};

export default TicketSimulator;