import React, { useState, useEffect } from 'react';
import type { KnowledgeSource, Chatbot, AIConfig } from '../types';
import Card from './ui/Card';
import { EditIcon } from './icons/EditIcon';
import { DeleteIcon } from './icons/DeleteIcon';
import EditKnowledgeModal from './EditKnowledgeModal';
import AddKnowledgeModal from './AddKnowledgeModal';

interface KnowledgeProps {
    chatbots: Chatbot[];
    sources: KnowledgeSource[];
    setSources: React.Dispatch<React.SetStateAction<KnowledgeSource[]>>;
    aiConfigs: AIConfig[];
    setAiConfigs: React.Dispatch<React.SetStateAction<AIConfig[]>>;
}

const statusClasses = {
    synced: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const Knowledge: React.FC<KnowledgeProps> = ({ chatbots, sources, setSources, aiConfigs, setAiConfigs }) => {
    const [selectedBotId, setSelectedBotId] = useState<string | null>(chatbots[0]?.id || null);
    const [currentConfig, setCurrentConfig] = useState<AIConfig | undefined>(aiConfigs.find(c => c.botId === selectedBotId));
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [editingSource, setEditingSource] = useState<KnowledgeSource | null>(null);
    const [addSourceType, setAddSourceType] = useState<'file' | 'url' | 'faq' | null>(null);

    useEffect(() => {
        const config = aiConfigs.find(c => c.botId === selectedBotId);
        setCurrentConfig(config ? { ...config } : undefined);
    }, [selectedBotId, aiConfigs]);

    const handleConfigChange = (field: keyof AIConfig, value: string | number) => {
        if (currentConfig) {
            setCurrentConfig({ ...currentConfig, [field]: value });
        }
    };

    const handleSaveConfig = () => {
        if (!currentConfig || !selectedBotId) return;
        setSaveStatus('saving');
        
        const configExists = aiConfigs.some(c => c.botId === selectedBotId);
        let newConfigs;
        if (configExists) {
            newConfigs = aiConfigs.map(c => c.botId === selectedBotId ? currentConfig : c);
        } else {
            newConfigs = [...aiConfigs, { ...currentConfig, botId: selectedBotId }];
        }
        setAiConfigs(newConfigs);

        setTimeout(() => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        }, 1000);
    };

    const handleSaveSource = (updatedSource: KnowledgeSource) => {
        setSources(sources.map(s => s.id === updatedSource.id ? updatedSource : s));
        setEditingSource(null);
    };

    const handleConfirmAddSource = (data: { name: string, content?: { question: string, answer: string }}) => {
        if (!addSourceType || !selectedBotId) return;
        
        const newSource: KnowledgeSource = {
            id: Date.now().toString(),
            botId: selectedBotId,
            type: addSourceType,
            name: data.name,
            status: 'pending',
            lastSynced: new Date().toISOString().split('T')[0],
            content: data.content,
        };

        setSources(prev => [...prev, newSource]);
        setAddSourceType(null);

        setTimeout(() => {
            setSources(prev => prev.map(s => s.id === newSource.id ? { ...s, status: 'synced' } : s));
        }, 2000);
    };

    const handleDeleteSource = (id: string) => {
        setSources(sources.filter(s => s.id !== id));
    };

    const filteredSources = sources.filter(s => s.botId === selectedBotId);

    return (
        <>
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <label htmlFor="bot-select" className="text-sm font-medium">Selected Bot:</label>
                    <select
                        id="bot-select"
                        value={selectedBotId || ''}
                        onChange={e => setSelectedBotId(e.target.value)}
                        className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                        {chatbots.map(bot => (
                            <option key={bot.id} value={bot.id}>{bot.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex gap-2">
                     <button onClick={() => setAddSourceType('file')} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                        + Add File
                    </button>
                    <button onClick={() => setAddSourceType('url')} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                        + Add URL
                    </button>
                     <button onClick={() => setAddSourceType('faq')} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                        + Add FAQ
                    </button>
                </div>
            </div>
            
            <Card className="mb-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">AI Configuration</h3>
                {currentConfig ? (
                    <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                             <label htmlFor="personality" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Personality</label>
                            <select id="personality" value={currentConfig.personality} onChange={e => handleConfigChange('personality', e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600">
                                <option>friendly</option>
                                <option>professional</option>
                                <option>witty</option>
                            </select>
                        </div>
                         <div>
                             <label htmlFor="tone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tone</label>
                            <select id="tone" value={currentConfig.tone} onChange={e => handleConfigChange('tone', e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600">
                                <option>formal</option>
                                <option>casual</option>
                                <option>enthusiastic</option>
                            </select>
                        </div>
                         <div>
                             <label htmlFor="responseLength" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Response Length</label>
                            <select id="responseLength" value={currentConfig.responseLength} onChange={e => handleConfigChange('responseLength', e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600">
                                <option value="short">Short</option>
                                <option value="medium">Medium</option>
                                <option value="detailed">Detailed</option>
                            </select>
                        </div>
                        <div>
                             <label htmlFor="interactionLimit" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Interaction Limit</label>
                            <input
                                type="number"
                                id="interactionLimit"
                                value={currentConfig.interactionLimit}
                                onChange={e => handleConfigChange('interactionLimit', parseInt(e.target.value, 10))}
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="goal" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bot Goal</label>
                            <textarea
                                id="goal"
                                rows={3}
                                value={currentConfig.goal}
                                onChange={e => handleConfigChange('goal', e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="e.g., The goal is to book appointments for the sales team."
                            />
                        </div>
                         <div className="md:col-span-2">
                            <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Additional Information</label>
                            <textarea
                                id="additionalInfo"
                                rows={4}
                                value={currentConfig.additionalInfo}
                                onChange={e => handleConfigChange('additionalInfo', e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="e.g., Do not discuss pricing. Always be friendly and use emojis."
                            />
                        </div>
                    </div>
                ) : (
                    <p className="mt-4 text-gray-500">Select a bot to view its configuration, or create one by saving changes.</p>
                )}
                 <div className="mt-6 flex justify-end items-center gap-4">
                     {saveStatus === 'saving' && <p className="text-sm text-gray-500">Saving...</p>}
                     {saveStatus === 'saved' && <p className="text-sm text-green-600">Configuration saved!</p>}
                    <button onClick={handleSaveConfig} disabled={!currentConfig || saveStatus === 'saving'} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400">
                        Save Configuration
                    </button>
                </div>
            </Card>

            <Card>
                 <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Synced Sources</h3>
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Source Name</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Last Synced</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredSources.map(source => (
                                <tr key={source.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white truncate max-w-sm">{source.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">{source.type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[source.status]}`}>
                                            {source.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{source.lastSynced}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => setEditingSource(source)} className="p-2 text-gray-400 hover:text-blue-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><EditIcon className="w-5 h-5" /></button>
                                        <button onClick={() => handleDeleteSource(source.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><DeleteIcon className="w-5 h-5" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {editingSource && <EditKnowledgeModal source={editingSource} onClose={() => setEditingSource(null)} onSave={handleSaveSource} />}
            {addSourceType && <AddKnowledgeModal type={addSourceType} onClose={() => setAddSourceType(null)} onAdd={handleConfirmAddSource} />}
        </>
    );
};

export default Knowledge;