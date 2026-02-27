// FILE: components/TicketConversation.tsx
import React, { useEffect, useMemo, useState } from "react";
import type { Ticket, ChatMessage, TicketActivity } from "../types";
import Card from "./ui/Card";

interface TicketConversationProps {
  ticket: Ticket;
  onBack: () => void;
  onUpdateTicket: (updatedTicket: Ticket) => void;
}

const ChatBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const sender = String((message as any).sender || "").toLowerCase();

  const label =
    sender === "user"
      ? "Customer"
      : sender === "ai"
        ? "Bot"
        : sender === "agent"
          ? "Agent"
          : "Agent";

  const isUser = sender === "user";
  const isAi = sender === "ai";

  return (
    <div className={`flex items-end ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-lg px-4 py-3 rounded-2xl ${isUser
          ? "bg-blue-500 text-white rounded-br-none"
          : isAi
            ? "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none"
            : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none"
          }`}
      >
        <p className="text-xs font-semibold opacity-80 mb-1">{label}</p>
        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        <p
          className={`text-right text-xs mt-1 ${isUser ? "text-blue-200" : "text-gray-500 dark:text-gray-400"
            }`}
        >
          {message.timestamp}
        </p>
      </div>
    </div>
  );
};

const TicketConversation: React.FC<TicketConversationProps> = ({
  ticket,
  onBack,
  onUpdateTicket,
}) => {
  const [replyText, setReplyText] = useState("");

  const suggestedReply = useMemo(() => {
    // Keep it tolerant even if types don’t include it yet
    const sr = (ticket as any).suggestedReply;
    return typeof sr === "string" ? sr.trim() : "";
  }, [ticket]);

  // Optional: auto-fill the reply box once per ticket if empty
  useEffect(() => {
    if (!replyText.trim() && suggestedReply) {
      setReplyText(suggestedReply);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedReply, ticket.id]);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as Ticket["status"];

    const newActivity: TicketActivity = {
      id: Date.now().toString(),
      user: "System",
      action: `changed status from ${String(ticket.status || "open").replace(
        "_",
        " "
      )} to ${String(newStatus).replace("_", " ")}`,
      timestamp: new Date().toISOString(),
    };

    const updatedTicket: Ticket = {
      ...ticket,
      status: newStatus,
      lastUpdate: new Date().toISOString().split("T")[0],
      history: [...(ticket.history || []), newActivity],
    };

    onUpdateTicket(updatedTicket);
  };

  const handleUseDraft = () => {
    if (!suggestedReply) return;
    setReplyText(suggestedReply);
  };

  const handleSend = () => {
    const text = replyText.trim();
    if (!text) return;

    const nowIso = new Date().toISOString();

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "agent" as any, // keep tolerant if sender union doesn’t include agent
      text,
      timestamp: nowIso,
    };

    const newActivity: TicketActivity = {
      id: `h-${Date.now()}`,
      user: "Agent",
      action: "sent a reply in the portal",
      timestamp: nowIso,
    };

    const updatedTicket: Ticket = {
      ...ticket,
      lastUpdate: nowIso,
      conversation: [...(ticket.conversation || []), newMsg],
      history: [...(ticket.history || []), newActivity],
    };

    onUpdateTicket(updatedTicket);
    setReplyText("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Back to Tickets
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Ticket ID: {ticket.id}
            </span>
          </div>

          {/* Suggested reply (draft) */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                Suggested Reply
              </h4>
              <button
                onClick={handleUseDraft}
                disabled={!suggestedReply}
                className={`text-xs font-bold px-3 py-1 rounded-full ${suggestedReply
                  ? "bg-[#C79A2A] text-black hover:opacity-90"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                  }`}
              >
                Use draft
              </button>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
              {suggestedReply ? (
                <pre className="text-xs whitespace-pre-wrap font-sans text-gray-800 dark:text-gray-200">
                  {suggestedReply}
                </pre>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  No suggested reply yet.
                </p>
              )}
            </div>
          </div>

          {/* Conversation */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg h-[52vh] overflow-y-auto flex flex-col space-y-4">
            {(ticket.conversation || []).map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
          </div>

          {/* Reply box */}
          <div className="mt-4 flex items-center">
            <input
              type="text"
              placeholder="Type your reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSend}
              className="ml-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700"
            >
              Send
            </button>
          </div>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card>
          <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-white">
            Ticket Details
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-500 dark:text-gray-400">
                Status:
              </span>
              <select
                value={ticket.status}
                onChange={handleStatusChange}
                className="font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md py-1 px-2 focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="flex justify-between">
              <span className="font-medium text-gray-500 dark:text-gray-400">
                Customer:
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {ticket.customerName}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="font-medium text-gray-500 dark:text-gray-400">
                Priority:
              </span>
              <span className="font-semibold text-gray-900 dark:text-white capitalize">
                {(ticket as any).priority}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="font-medium text-gray-500 dark:text-gray-400">
                Agent:
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {(ticket as any).agent}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="font-medium text-gray-500 dark:text-gray-400">
                Last Update:
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {(ticket as any).lastUpdate}
              </span>
            </div>

            <div>
              <span className="font-medium text-gray-500 dark:text-gray-400">
                Subject:
              </span>
              <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                {ticket.subject}
              </p>
            </div>
          </div>
        </Card>

        <Card className="mt-6">
          <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-white">
            Ticket History
          </h3>
          <ul className="space-y-4 max-h-48 overflow-y-auto">
            {(ticket.history || [])
              .slice()
              .reverse()
              .map((activity) => (
                <li
                  key={activity.id}
                  className="text-sm border-l-2 border-gray-200 dark:border-gray-700 pl-3"
                >
                  <p className="text-gray-800 dark:text-gray-300">
                    <span className="font-semibold">{activity.user}</span>{" "}
                    {activity.action}.
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </li>
              ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default TicketConversation;