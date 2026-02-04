import React, { useState } from 'react';
import type { Chatbot, AIConfig, KnowledgeSource } from '../types';
import Card from './ui/Card';
import { EditIcon } from './icons/EditIcon';
import { DeleteIcon } from './icons/DeleteIcon';
import ConnectBotModal from './ConnectBotModal';
import EditBotModal from './EditBotModal';
import ChatSimulator from './ChatSimulator';

interface ChatbotsProps {
    chatbots: Chatbot[];
    setChatbots: React.Dispatch<React.SetStateAction<Chatbot[]>>;
    aiConfigs: AIConfig[];
    sources: KnowledgeSource[];
    onAddFeedbackToKnowledge: (botId: string, question: string, answer: string) => void;
}

const BotCard: React.FC<{ bot: Chatbot; onEdit: () => void; onSimulate: () => void; onToggleStatus: () => void; }> = ({ bot, onEdit, onSimulate, onToggleStatus }) => (
    <Card>
        <div className="flex justify-between items-start">
            <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{bot.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{bot.phone}</p>
                <div className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bot.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                    <span className={`h-2 w-2 rounded-full mr-1.5 ${bot.status === 'active' ? 'bg-green-400' : 'bg-gray-400'}`}></span>
                    {bot.status === 'active' ? 'Active' : 'Inactive'}
                </div>
            </div>
            <div className="flex space-x-2">
                <button onClick={onEdit} className="p-2 text-gray-400 hover:text-blue-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><EditIcon className="w-5 h-5" /></button>
                <button className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><DeleteIcon className="w-5 h-5" /></button>
            </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div>
                <p className="text-2xl font-semibold">{bot.conversations}</p>
                <p className="text-xs text-gray-500">Conversations</p>
            </div>
            <div>
                <p className="text-2xl font-semibold">{bot.responseRate}%</p>
                <p className="text-xs text-gray-500">Response Rate</p>
            </div>
            <div>
                <p className="text-2xl font-semibold">{bot.knowledgeSources}</p>
                <p className="text-xs text-gray-500">Sources</p>
            </div>
        </div>
        <div className="mt-4 flex space-x-2">
            <button onClick={onSimulate} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Test Bot</button>
            <label htmlFor={`toggle-${bot.id}`} className="flex items-center cursor-pointer">
                <div className="relative">
                    <input type="checkbox" id={`toggle-${bot.id}`} className="sr-only" checked={bot.status === 'active'} onChange={onToggleStatus} />
                    <div className="block bg-gray-200 dark:bg-gray-600 w-10 h-6 rounded-full"></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${bot.status === 'active' ? 'transform translate-x-full bg-blue-600' : ''}`}></div>
                </div>
            </label>
        </div>
    </Card>
);

const Chatbots: React.FC<ChatbotsProps> = ({ chatbots, setChatbots, aiConfigs, sources, onAddFeedbackToKnowledge }) => {
    const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
    const [editingBot, setEditingBot] = useState<Chatbot | null>(null);
    const [simulatingBot, setSimulatingBot] = useState<Chatbot | null>(null);

    const handleConnectBot = (botName: string, phoneNumber: string) => {
        const newBot: Chatbot = {
            id: (chatbots.length + 1).toString(),
            name: botName,
            phone: phoneNumber,
            status: 'active',
            conversations: 0,
            responseRate: 0,
            knowledgeSources: 0,
        };
        setChatbots(prev => [...prev, newBot]);
        setIsConnectModalOpen(false);
    };

    const handleSaveBot = (updatedBot: Chatbot) => {
        setChatbots(chatbots.map(b => b.id === updatedBot.id ? updatedBot : b));
        setEditingBot(null);
    };

    const handleToggleStatus = (botId: string) => {
        setChatbots(chatbots.map(b => b.id === botId ? { ...b, status: b.status === 'active' ? 'inactive' : 'active' } : b));
    };
    
    const botToSimulateConfig = aiConfigs.find(c => c.botId === simulatingBot?.id);
    const botToSimulateSources = sources.filter(s => s.botId === simulatingBot?.id);

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">Your Chatbots</h1>
                <button onClick={() => setIsConnectModalOpen(true)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                    + Connect New Bot
                </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {chatbots.map(bot => (
                    <BotCard 
                        key={bot.id} 
                        bot={bot} 
                        onEdit={() => setEditingBot(bot)} 
                        onSimulate={() => setSimulatingBot(bot)}
                        onToggleStatus={() => handleToggleStatus(bot.id)}
                    />
                ))}
            </div>

            {isConnectModalOpen && <ConnectBotModal onClose={() => setIsConnectModalOpen(false)} onConnect={handleConnectBot} />}
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