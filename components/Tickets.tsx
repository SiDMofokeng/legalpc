import React, { useMemo, useState } from 'react';
import type { Ticket } from '../types';
import Card from './ui/Card';
import TicketConversation from './TicketConversation';
import { upsertTicket } from '../services/firestoreStore';
import type { User } from '../types';

const statusClasses: Record<Ticket['status'], string> = {
  open: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const baseSelectClasses =
  'w-full px-6 py-1.5 text-[11px] font-semibold rounded-full border-0 focus:ring-2 focus:ring-[#C79A2A]/40 capitalize appearance-none text-center cursor-pointer hover:opacity-90 whitespace-nowrap';

type TicketsProps = {
  tickets: Ticket[];
  setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
  users: User[];
  loading?: boolean;
};

const Tickets: React.FC<TicketsProps> = ({ tickets, setTickets, users, loading }) => {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || null;

  const persist = async (t: Ticket) => {
    setSavingId(t.id);
    try {
      await upsertTicket(t);
    } catch (err: any) {
      console.error('Failed to save ticket:', err);
      alert(`Could not save ticket: ${err?.message || 'Unknown error'}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleUpdateTicket = async (updatedTicket: Ticket) => {
    setTickets((prev) => prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t)));
    await persist(updatedTicket);
  };

  const meEmail = ((window as any).__lpc_me_email as string | undefined) || undefined;

  const meUser = useMemo(() => {
    if (!meEmail) return null;
    const email = String(meEmail).toLowerCase();
    return users.find((x) => String(x.email || '').toLowerCase() === email) || null;
  }, [users, meEmail]);

  const isAdmin = meUser?.role === 'Admin';

  const actorName = useMemo(() => {
    // Prefer the current signed-in user's name if present in the users list
    if (meUser?.name) return meUser.name;
    const admin = users.find((u) => u.role === 'Admin' && u.status === 'active');
    return admin?.name || users.find((u) => u.status === 'active')?.name || 'System';
  }, [users, meUser]);

  const handleStatusChange = async (ticketId: string, newStatus: Ticket['status']) => {
    if (!isAdmin) return;
    const current = tickets.find((t) => t.id === ticketId);
    if (!current) return;

    const updated: Ticket = {
      ...current,
      status: newStatus,
      lastUpdate: new Date().toISOString().split('T')[0],
      history: [
        ...current.history,
        {
          id: Date.now().toString(),
          user: actorName,
          action: `changed status from ${current.status.replace('_', ' ')} to ${newStatus.replace('_', ' ')}`,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
    await persist(updated);
  };

  const handleAgentChange = async (ticketId: string, newAgent: string) => {
    const current = tickets.find((t) => t.id === ticketId);
    if (!current) return;

    const targetUser = users.find((u) => String(u.name || '').trim() === String(newAgent || '').trim());

    const updated: Ticket = {
      ...current,
      agent: newAgent,
      assignedToUid: newAgent === 'Unassigned' ? undefined : (targetUser?.id || current.assignedToUid),
      lastUpdate: new Date().toISOString().split('T')[0],
      history: [
        ...current.history,
        {
          id: Date.now().toString(),
          user: actorName,
          action: `assigned agent to ${newAgent}`,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
    await persist(updated);
  };

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
    <Card>
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th
                scope="col"
                className="w-[170px] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                Ticket ID
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                Customer
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                Subject
              </th>
              <th
                scope="col"
                className="w-[150px] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="w-[170px] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                Agent
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                Last Update
              </th>
            </tr>
          </thead>

          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#C79A2A] cursor-pointer"
                >
                  {(() => {
                    // Short ID for layout: TKT-001, TKT-002... based on createdAt ordering
                    const sorted = [...tickets].sort((a: any, b: any) => {
                      const ax = a?.createdAt?.seconds ? a.createdAt.seconds * 1000 : Date.parse(a?.createdAt) || 0;
                      const bx = b?.createdAt?.seconds ? b.createdAt.seconds * 1000 : Date.parse(b?.createdAt) || 0;
                      return ax - bx;
                    });
                    const idx = sorted.findIndex((t) => t.id === ticket.id);
                    const n = idx >= 0 ? idx + 1 : 0;
                    return `TKT-${String(n).padStart(3, '0')}`;
                  })()}
                  {savingId === ticket.id ? (
                    <span className="ml-2 text-[10px] text-slate-400">saving…</span>
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
                  <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                    <select
                      title={isAdmin ? 'Click to change status' : 'Only admins can change status'}
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(ticket.id, e.target.value as Ticket['status'])}
                      disabled={!isAdmin}
                      className={`${baseSelectClasses} ${statusClasses[ticket.status]} ${isAdmin ? '' : 'opacity-70 cursor-not-allowed'}`}
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
                  <div className="relative inline-block w-full" onClick={(e) => e.stopPropagation()}>
                    <select
                      title={isAdmin ? 'Click to assign/change agent' : 'Only admins can re-assign tickets'}
                      value={ticket.agent || 'Unassigned'}
                      onChange={(e) => handleAgentChange(ticket.id, e.target.value)}
                      disabled={!isAdmin}
                      className={`w-full bg-transparent border border-transparent hover:border-gray-200 dark:hover:border-gray-600 focus:border-[#C79A2A]/60 focus:ring-2 focus:ring-[#C79A2A]/40 rounded-md px-2 py-1 text-[12px] font-semibold text-gray-700 dark:text-gray-200 ${isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
                    >
                      {(() => {
                        const activeAgents = users
                          .filter((u) => u.status === 'active')
                          .map((u) => u.name)
                          .filter(Boolean);
                        const base = ['Unassigned', ...activeAgents];
                        // Ensure current value is always present, even if user was deleted
                        const current = ticket.agent && !base.includes(ticket.agent) ? [ticket.agent, ...base] : base;
                        const deduped = Array.from(new Set(current));
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
                <td
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 cursor-pointer"
                >
                  {ticket.lastUpdate}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tickets.length === 0 ? (
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">No tickets yet.</div>
      ) : null}
    </Card>
  );
};

export default Tickets;
