// FILE: components/Tickets.tsx
import React, { useMemo, useState } from "react";
import type { Ticket, User } from "../types";
import Card from "./ui/Card";
import TicketConversation from "./TicketConversation";
import { updateTicket } from "../services/firestoreStore";

const statusClasses: Record<Ticket["status"], string> = {
  open: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  in_progress:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

const baseSelectClasses =
  "px-8 py-1.5 text-[11px] font-semibold rounded-full border-0 focus:ring-2 focus:ring-[#C79A2A]/40 capitalize appearance-none text-center cursor-pointer hover:opacity-90 whitespace-nowrap";

type TicketsProps = {
  tickets: Ticket[];
  setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
  users: User[];
  loading?: boolean;
  isAdmin?: boolean;
};

function normalizeStatus(raw: any): Ticket["status"] {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  if (s === "inprogress") return "in_progress";
  if (s === "in_progress") return "in_progress";
  if (s === "open") return "open";
  if (s === "resolved") return "resolved";
  if (s === "closed") return "closed";

  return "open";
}

function safeString(raw: any): string {
  return String(raw ?? "").trim();
}

/**
 * Build a safe Firestore PATCH from a full Ticket object.
 * (No createdAt, no undefined)
 */
function buildTicketPatchFromTicket(t: Ticket): Partial<Ticket> {
  const patch: any = {
    customerName: (t as any).customerName ?? "",
    subject: (t as any).subject ?? "",
    status: (t as any).status ?? "open",
    priority: (t as any).priority ?? "medium",
    lastUpdate: (t as any).lastUpdate ?? "",
    agent: (t as any).agent ?? "",
    conversation: Array.isArray((t as any).conversation) ? (t as any).conversation : [],
    history: Array.isArray((t as any).history) ? (t as any).history : [],
  };

  // Keep assignedToUid if present; allow unassigning via empty string in updateTicket()
  if ((t as any).assignedToUid !== undefined) patch.assignedToUid = (t as any).assignedToUid;

  return patch as Partial<Ticket>;
}

const Tickets: React.FC<TicketsProps> = ({
  tickets,
  setTickets,
  users,
  loading,
  isAdmin = false,
}) => {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const usersById = useMemo(() => {
    const m = new Map<string, User>();
    for (const u of users) m.set(String(u.id || "").trim(), u);
    return m;
  }, [users]);

  const activeUserNames = useMemo(() => {
    return users
      .filter((u) => u.status === "active")
      .map((u) => safeString(u.name))
      .filter(Boolean);
  }, [users]);

  const meEmail =
    ((window as any).__lpc_me_email as string | undefined) || undefined;

  const meUser = useMemo(() => {
    if (!meEmail) return null;
    const email = String(meEmail).toLowerCase();
    return (
      users.find((x) => String(x.email || "").toLowerCase() === email) || null
    );
  }, [users, meEmail]);

  const actorName = useMemo(() => {
    if (meUser?.name) return meUser.name;
    const admin = users.find((u) => u.role === "Admin" && u.status === "active");
    return admin?.name || users.find((u) => u.status === "active")?.name || "System";
  }, [users, meUser]);

  const persist = async (t: Ticket, patch?: Partial<Ticket>) => {
    setSavingId(t.id);
    try {
      await updateTicket(t.id, patch || {});
    } catch (err: any) {
      console.error("Failed to save ticket:", err);
      alert(`Could not save ticket: ${err?.message || "Unknown error"}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleUpdateTicket = async (updatedTicket: Ticket) => {
    // Optimistic UI update
    setTickets((prev) =>
      prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
    );

    // TicketConversation sends a full updatedTicket, but our persist() needs a PATCH.
    const patch = buildTicketPatchFromTicket(updatedTicket);
    await persist(updatedTicket, patch);
  };

  const handleStatusChange = async (ticketId: string, newStatus: Ticket["status"]) => {
    if (!isAdmin) return;
    const current = tickets.find((t) => t.id === ticketId);
    if (!current) return;

    const nextHistory = [
      ...(current.history || []),
      {
        id: Date.now().toString(),
        user: actorName,
        action: `changed status from ${String(current.status || "open").replace("_", " ")} to ${String(newStatus).replace("_", " ")}`,
        timestamp: new Date().toISOString(),
      },
    ];

    const updated: Ticket = {
      ...current,
      status: newStatus,
      lastUpdate: new Date().toISOString().split("T")[0],
      history: nextHistory,
    };

    setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));

    await persist(updated, {
      status: newStatus,
      lastUpdate: updated.lastUpdate,
      history: nextHistory,
    });
  };

  const handleAgentChange = async (ticketId: string, newAgent: string) => {
    if (!isAdmin) return;

    const current = tickets.find((t) => t.id === ticketId);
    if (!current) return;

    const targetUser = users.find(
      (u) => String(u.name || "").trim() === String(newAgent || "").trim()
    );

    const assignedToUid =
      newAgent === "Unassigned"
        ? ""
        : (targetUser?.id || (current as any).assignedToUid || "");

    const nextHistory = [
      ...(current.history || []),
      {
        id: Date.now().toString(),
        user: actorName,
        action: `assigned agent to ${newAgent}`,
        timestamp: new Date().toISOString(),
      },
    ];

    const updated: Ticket = {
      ...current,
      agent: newAgent,
      assignedToUid: newAgent === "Unassigned" ? "" : assignedToUid,
      lastUpdate: new Date().toISOString().split("T")[0],
      history: nextHistory,
    };

    setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));

    await persist(updated, {
      agent: newAgent,
      assignedToUid: assignedToUid,
      lastUpdate: updated.lastUpdate,
      history: nextHistory,
    });
  };

  // Normalize tickets for rendering ONLY (no auto-writing back to Firestore)
  const viewTickets = useMemo(() => {
    return tickets.map((t) => {
      const normalizedStatus = normalizeStatus((t as any).status);

      const assignedUid = safeString((t as any).assignedToUid);
      const assignedUser = assignedUid ? usersById.get(assignedUid) : undefined;

      const agentFromDoc = safeString((t as any).agent);
      const agentDisplay =
        agentFromDoc && agentFromDoc.toLowerCase() !== "unassigned"
          ? agentFromDoc
          : assignedUser?.name
            ? safeString(assignedUser.name)
            : "Unassigned";

      const lastUpdate =
        safeString((t as any).lastUpdate) ||
        safeString((t as any).last_update) ||
        safeString((t as any).updatedAt) ||
        "";

      return {
        ...t,
        status: normalizedStatus,
        agent: agentDisplay,
        lastUpdate: lastUpdate || (t as any).lastUpdate || "",
      } as Ticket;
    });
  }, [tickets, usersById]);

  const selectedTicket =
    viewTickets.find((t) => t.id === selectedTicketId) || null;

  if (selectedTicket) {
    return (
      <TicketConversation
        ticket={selectedTicket}
        onBack={() => setSelectedTicketId(null)}
        onUpdateTicket={handleUpdateTicket}
      />
    );
  }

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-10">
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 dark:border-gray-600 dark:border-t-white" />
            Loading tickets…
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th
                  scope="col"
                  className="w-[100px] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Ticket ID
                </th>
                <th
                  scope="col"
                  className="w-[80px] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Customer
                </th>
                <th
                  scope="col"
                  className="w-[50px] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Subject
                </th>
                <th
                  scope="col"
                  className="w-[100px] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="w-[100px] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Agent
                </th>
              </tr>
            </thead>

            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {viewTickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#C79A2A] cursor-pointer"
                  >
                    {(() => {
                      const sorted = [...viewTickets].sort((a: any, b: any) => {
                        const ax = a?.createdAt?.seconds
                          ? a.createdAt.seconds * 1000
                          : Date.parse(a?.createdAt) || 0;
                        const bx = b?.createdAt?.seconds
                          ? b.createdAt.seconds * 1000
                          : Date.parse(b?.createdAt) || 0;
                        return ax - bx;
                      });
                      const idx = sorted.findIndex((t) => t.id === ticket.id);
                      const n = idx >= 0 ? idx + 1 : 0;
                      return `TKT-${String(n).padStart(3, "0")}`;
                    })()}
                    {savingId === ticket.id ? (
                      <span className="ml-2 text-[10px] text-slate-400">
                        saving…
                      </span>
                    ) : null}
                  </td>

                  <td
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white cursor-pointer"
                  >
                    {ticket.customerName}
                  </td>

                  <td
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs cursor-pointer"
                  >
                    {ticket.subject}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div
                      className="relative inline-block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <select
                        title={
                          isAdmin
                            ? "Click to change status"
                            : "Only admins can change status"
                        }
                        value={ticket.status}
                        onChange={(e) =>
                          handleStatusChange(
                            ticket.id,
                            e.target.value as Ticket["status"]
                          )
                        }
                        disabled={!isAdmin}
                        className={`${baseSelectClasses} ${statusClasses[ticket.status]
                          } ${isAdmin ? "" : "opacity-70 cursor-not-allowed"}`}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>

                      <svg
                        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div
                      className="relative inline-block w-full"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <select
                        title={
                          isAdmin
                            ? "Click to assign/change agent"
                            : "Only admins can re-assign tickets"
                        }
                        value={ticket.agent || "Unassigned"}
                        onChange={(e) =>
                          handleAgentChange(ticket.id, e.target.value)
                        }
                        disabled={!isAdmin}
                        className={`min-w-[100px] bg-transparent border border-transparent hover:border-gray-200 dark:hover:border-gray-600 focus:border-[#C79A2A]/60 focus:ring-2 focus:ring-[#C79A2A]/40 rounded-md px-2 py-1 text-[12px] font-semibold text-gray-700 dark:text-gray-200 ${isAdmin ? "cursor-pointer" : "cursor-not-allowed opacity-70"
                          }`}
                      >
                        {(() => {
                          const base = ["Unassigned", ...activeUserNames];

                          const current =
                            ticket.agent && !base.includes(ticket.agent)
                              ? [ticket.agent, ...base]
                              : base;

                          const deduped = Array.from(new Set(current)).filter(Boolean);

                          return deduped.map((agent) => (
                            <option key={agent} value={agent}>
                              {agent}
                            </option>
                          ));
                        })()}
                      </select>

                      <svg
                        className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {tickets.length === 0 ? (
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            No tickets yet.
          </div>
        ) : null}
      </Card>
    </div>
  );
};

export default Tickets;