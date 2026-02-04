import React from 'react';
import type { Ticket, ChatMessage, TicketActivity } from '../types';
import Card from './ui/Card';

interface TicketConversationProps {
  ticket: Ticket;
  onBack: () => void;
  onUpdateTicket: (updatedTicket: Ticket) => void;
}

const ChatBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const isUser = message.sender === 'user';
    return (
      <div className={`flex items-end ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-lg px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-blue-500 text-white rounded-br-none'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
          }`}
        >
          <p className="text-sm">{message.text}</p>
          <p className={`text-right text-xs mt-1 ${isUser ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>{message.timestamp}</p>
        </div>
      </div>
    );
};

const TicketConversation: React.FC<TicketConversationProps> = ({ ticket, onBack, onUpdateTicket }) => {

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as Ticket['status'];

    const newActivity: TicketActivity = {
        id: Date.now().toString(),
        user: 'Demo User', // In a real app, this would be the logged-in user
        action: `changed status from ${ticket.status.replace('_', ' ')} to ${newStatus.replace('_', ' ')}`,
        timestamp: new Date().toISOString(),
    };

    const updatedTicket: Ticket = {
        ...ticket,
        status: newStatus,
        lastUpdate: new Date().toISOString().split('T')[0],
        history: [...ticket.history, newActivity],
    };

    onUpdateTicket(updatedTicket);
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
            <div className="flex items-center justify-between mb-4">
                <button onClick={onBack} className="text-blue-600 dark:text-blue-400 hover:underline flex items-center">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Back to Tickets
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">Ticket ID: {ticket.id}</span>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg h-[60vh] overflow-y-auto flex flex-col space-y-4">
                {ticket.conversation.map(msg => <ChatBubble key={msg.id} message={msg} />)}
            </div>
             <div className="mt-4 flex items-center">
                <input
                    type="text"
                    placeholder="Type your reply..."
                    className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button className="ml-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700">
                    Send
                </button>
            </div>
        </Card>
      </div>
      <div className="lg:col-span-1">
        <Card>
            <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-white">Ticket Details</h3>
            <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-500 dark:text-gray-400">Status:</span>
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
                    <span className="font-medium text-gray-500 dark:text-gray-400">Customer:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{ticket.customerName}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-medium text-gray-500 dark:text-gray-400">Priority:</span>
                    <span className="font-semibold text-gray-900 dark:text-white capitalize">{ticket.priority}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-medium text-gray-500 dark:text-gray-400">Agent:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{ticket.agent}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="font-medium text-gray-500 dark:text-gray-400">Last Update:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{ticket.lastUpdate}</span>
                </div>
                 <div>
                    <span className="font-medium text-gray-500 dark:text-gray-400">Subject:</span>
                    <p className="mt-1 font-semibold text-gray-900 dark:text-white">{ticket.subject}</p>
                </div>
            </div>
        </Card>
        <Card className="mt-6">
            <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-white">Ticket History</h3>
            <ul className="space-y-4 max-h-48 overflow-y-auto">
                {ticket.history.slice().reverse().map(activity => (
                    <li key={activity.id} className="text-sm border-l-2 border-gray-200 dark:border-gray-700 pl-3">
                        <p className="text-gray-800 dark:text-gray-300">
                           <span className="font-semibold">{activity.user}</span> {activity.action}.
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
