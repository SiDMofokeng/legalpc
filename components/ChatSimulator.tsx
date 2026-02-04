import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage, Chatbot, AIConfig, KnowledgeSource } from '../types';
import { generateChatResponse } from '../services/geminiService';
import { Content } from '@google/genai';
import { ThumbUpIcon } from './icons/ThumbUpIcon';
import { ThumbDownIcon } from './icons/ThumbDownIcon';
import FeedbackModal from './FeedbackModal';

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

const ChatSimulator: React.FC<ChatSimulatorProps> = ({ bot, config, sources, onClose, onAddFeedbackToKnowledge }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [feedbackContext, setFeedbackContext] = useState<FeedbackContext | null>(null);
    const [interactionCount, setInteractionCount] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);
    
    const isConversationOver = config && interactionCount >= config.interactionLimit;

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || isConversationOver) return;

        const userMessage: ChatMessage = {
            id: Date.now(),
            sender: 'user',
            text: input,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setInteractionCount(prev => prev + 1);

        const history: Content[] = messages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        const aiResponseText = await generateChatResponse(input, history, config, sources);
        
        const aiMessage: ChatMessage = {
            id: Date.now() + 1,
            sender: 'ai',
            text: aiResponseText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            feedback: null,
        };
        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
    };

    const handleFeedback = (messageId: string | number, feedback: 'good' | 'bad') => {
        const messageIndex = messages.findIndex(msg => msg.id === messageId);

        if(feedback === 'bad' && messageIndex > 0) {
            const userMessage = messages[messageIndex - 1];
            const aiMessage = messages[messageIndex];
            if (userMessage.sender === 'user' && aiMessage.sender === 'ai') {
                 setFeedbackContext({
                    userQuery: userMessage.text,
                    aiResponse: aiMessage.text,
                    messageId: aiMessage.id
                });
            }
        } else {
            setMessages(messages.map(msg => msg.id === messageId ? {...msg, feedback} : msg));
        }
    };
    
    const submitFeedback = (correctedAnswer: string) => {
        if (feedbackContext) {
            onAddFeedbackToKnowledge(bot.id, feedbackContext.userQuery, correctedAnswer);
            setMessages(messages.map(msg => msg.id === feedbackContext.messageId ? {...msg, feedback: 'bad'} : msg));
        }
        setFeedbackContext(null);
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg h-[80vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Simulating: {bot.name}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {messages.map((message) => (
                        <div key={message.id} className={`flex items-end gap-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                             {message.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0"></div>}
                            <div className={`max-w-md p-3 rounded-2xl ${message.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700 rounded-bl-none'}`}>
                                <p className="text-sm">{message.text}</p>
                                <div className="flex justify-end items-center mt-1">
                                    <span className={`text-xs ${message.sender === 'user' ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>{message.timestamp}</span>
                                    {message.sender === 'ai' && (
                                        <div className="ml-2 flex gap-1">
                                            <button onClick={() => handleFeedback(message.id, 'good')} className={message.feedback === 'good' ? 'text-green-500' : 'text-gray-400 hover:text-green-500'}><ThumbUpIcon className="w-4 h-4" /></button>
                                            <button onClick={() => handleFeedback(message.id, 'bad')} className={message.feedback === 'bad' ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}><ThumbDownIcon className="w-4 h-4" /></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-end gap-2 justify-start">
                             <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0"></div>
                             <div className="max-w-md p-3 rounded-2xl bg-gray-200 dark:bg-gray-700 rounded-bl-none">
                                <div className="flex items-center space-x-1">
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                                </div>
                             </div>
                        </div>
                    )}
                     <div ref={messagesEndRef} />
                </div>
                
                <div className="p-4 border-t dark:border-gray-700">
                    {isConversationOver ? (
                        <div className="text-center p-2 text-sm text-yellow-700 bg-yellow-100 rounded-lg">
                            Interaction limit reached. The bot would now escalate to a human agent.
                        </div>
                    ) : (
                        <form onSubmit={handleSendMessage} className="flex items-center">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading}
                            />
                            <button type="submit" className="ml-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 disabled:bg-blue-400" disabled={isLoading || !input.trim()}>
                                Send
                            </button>
                        </form>
                    )}
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