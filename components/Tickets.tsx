
import React, { useState } from 'react';
import type { Ticket, ChatMessage } from '../types';
import Card from './ui/Card';
import TicketConversation from './TicketConversation';

const mockConversation: ChatMessage[] = [
    { id: 1, sender: 'user', text: 'I hired a lawyer who claimed to be registered with the council, but I think he took my money and disappeared. He is not answering my calls.', timestamp: '10:30 AM' },
    { id: 2, sender: 'ai', text: 'I am sorry to hear that. This is a serious matter. Could you please provide the name of the lawyer or their practice number if you have it?', timestamp: '10:31 AM' },
    { id: 3, sender: 'user', text: 'His name is Richard Roe, and his office was in Pretoria Central.', timestamp: '10:32 AM' },
    { id: 4, sender: 'ai', text: 'I have checked our registry and no Richard Roe is currently licensed to practice in that area. I am escalating this to our investigations team immediately.', timestamp: '10:34 AM' },
    { id: 5, sender: 'ai', text: 'I have created ticket TKT-001. A compliance officer will contact you to take a formal statement.', timestamp: '10:34 AM' },
];

const initialMockTickets: Ticket[] = [
  { id: 'TKT-001', customerName: 'John Doe', subject: 'Fake lawyer stole', status: 'open', priority: 'high', lastUpdate: '2023-10-27', agent: 'Support Bot', conversation: mockConversation, history: [{id: 'h1', user: 'System', action: 'Ticket created', timestamp: '2023-10-27T10:34:00Z'}] },
  { id: 'TKT-002', customerName: 'Jane Smith', subject: 'Code of Conduct', status: 'in_progress', priority: 'medium', lastUpdate: '2023-10-26', agent: 'Alex Green', conversation: [{ id: 1, sender: 'user', text: 'Where can I find the official Code of Conduct for legal practitioners?', timestamp: 'Yesterday'}], history: [{id: 'h2', user: 'Alex Green', action: 'Changed status from open to in_progress', timestamp: '2023-10-26T14:00:00Z'}, {id: 'h1', user: 'System', action: 'Ticket created', timestamp: '2023-10-26T09:12:00Z'}] },
  { id: 'TKT-003', customerName: 'Sam Wilson', subject: 'Feature Request: Dark Mode', status: 'resolved', priority: 'low', lastUpdate: '2023-10-25', agent: 'Support Bot', conversation: [], history: [{id: 'h1', user: 'System', action: 'Ticket created', timestamp: '2023-10-25T11:00:00Z'}] },
  { id: 'TKT-004', customerName: 'Bucky Barnes', subject: 'Report a Lawyer', status: 'open', priority: 'high', lastUpdate: '2023-10-27', agent: 'Unassigned', conversation: [], history: [{id: 'h1', user: 'System', action: 'Ticket created', timestamp: '2023-10-27T18:30:00Z'}] },
  { id: 'TKT-005', customerName: 'Peter Parker', subject: 'Question about pricing plans', status: 'closed', priority: 'low', lastUpdate: '2023-10-24', agent: 'Sales Bot', conversation: [], history: [{id: 'h1', user: 'System', action: 'Ticket created', timestamp: '2023-10-24T16:45:00Z'}] },
];

const mockAgents = [
    'Unassigned',
    'Demo User',
    'Alex Green',
    'Maria Garcia',
    'Support Bot',
    'Sales Bot',
];

const statusClasses: Record<Ticket['status'], string> = {
    open: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    closed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};
const baseSelectClasses = 'w-full px-2 py-1 text-xs font-medium rounded-full border-0 focus:ring-2 focus:ring-blue-500 capitalize appearance-none text-center';


const Tickets: React.FC = () => {
    const [tickets, setTickets] = useState<Ticket[]>(initialMockTickets);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

    const selectedTicket = tickets.find(t => t.id === selectedTicketId) || null;

    const handleUpdateTicket = (updatedTicket: Ticket) => {
        setTickets(prevTickets =>
            prevTickets.map(t => t.id === updatedTicket.id ? updatedTicket : t)
        );
    };
    
    const handleStatusChange = (ticketId: string, newStatus: Ticket['status']) => {
        setTickets(prevTickets =>
            prevTickets.map(ticket => {
                if (ticket.id === ticketId) {
                    const newActivity = {
                        id: Date.now().toString(),
                        user: 'Demo User',
                        action: `changed status from ${ticket.status.replace('_', ' ')} to ${newStatus.replace('_', ' ')}`,
                        timestamp: new Date().toISOString(),
                    };
                    return { ...ticket, status: newStatus, history: [...ticket.history, newActivity] };
                }
                return ticket;
            })
        );
    };

    const handleAgentChange = (ticketId: string, newAgent: string) => {
        setTickets(prevTickets =>
            prevTickets.map(t => t.id === ticketId ? { ...t, agent: newAgent } : t)
        );
    };


    if (selectedTicket) {
        return <TicketConversation ticket={selectedTicket} onBack={() => setSelectedTicketId(null)} onUpdateTicket={handleUpdateTicket} />;
    }

    return (
        <Card>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ticket ID</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Customer</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Subject</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Agent</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Last Update</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {tickets.map((ticket) => (
                            <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td onClick={() => setSelectedTicketId(ticket.id)} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400 cursor-pointer">{ticket.id}</td>
                                <td onClick={() => setSelectedTicketId(ticket.id)} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white cursor-pointer">{ticket.customerName}</td>
                                <td onClick={() => setSelectedTicketId(ticket.id)} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs cursor-pointer">{ticket.subject}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <select
                                        value={ticket.status}
                                        onChange={(e) => handleStatusChange(ticket.id, e.target.value as Ticket['status'])}
                                        onClick={(e) => e.stopPropagation()}
                                        className={`${baseSelectClasses} ${statusClasses[ticket.status]}`}
                                    >
                                        <option value="open">Open</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="resolved">Resolved</option>
                                        <option value="closed">Closed</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                     <select
                                        value={ticket.agent}
                                        onChange={(e) => handleAgentChange(ticket.id, e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm text-gray-500 dark:text-gray-400"
                                    >
                                        {mockAgents.map(agent => (
                                            <option key={agent} value={agent}>{agent}</option>
                                        ))}
                                    </select>
                                </td>
                                <td onClick={() => setSelectedTicketId(ticket.id)} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 cursor-pointer">{ticket.lastUpdate}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

export default Tickets;
