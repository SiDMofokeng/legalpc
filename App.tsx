import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Chatbots from './components/Chatbots';
import Knowledge from './components/Knowledge';
import Analytics from './components/Analytics';
import Tickets from './components/Tickets';
import Profile from './components/Profile';
import Settings from './components/Settings';
import AcceptInvite from './components/AcceptInvite';
import type { User, Chatbot, KnowledgeSource, AIConfig } from './types';

export type Page = 'dashboard' | 'chatbots' | 'knowledge' | 'analytics' | 'tickets' | 'profile' | 'settings';
type AuthState = 'login' | 'accept-invite' | 'authenticated';

const initialUsers: User[] = [
    { id: '1', name: 'Demo User', email: 'demo@chatportal.ai', role: 'Admin', avatar: 'https://picsum.photos/100', status: 'active' },
    { id: '2', name: 'Alex Green', email: 'alex@chatportal.ai', role: 'Agent', avatar: 'https://picsum.photos/100/100?a=2', status: 'pending' },
    { id: '3', name: 'Maria Garcia', email: 'maria@chatportal.ai', role: 'Agent', avatar: 'https://picsum.photos/100/100?a=3', status: 'active' },
];

const initialChatbots: Chatbot[] = [
    { id: '1', name: 'Customer Support Bot', phone: '+15551234567', status: 'active', conversations: 1204, responseRate: 95, knowledgeSources: 3 },
    { id: '2', name: 'Sales Inquiry Bot', phone: '+15557654321', status: 'inactive', conversations: 350, responseRate: 98, knowledgeSources: 1 },
];

const initialKnowledgeSources: KnowledgeSource[] = [
    { botId: '1', id: '1', type: 'file', name: 'product_manual.pdf', status: 'synced', lastSynced: '2023-10-26' },
    { botId: '1', id: '2', type: 'url', name: 'https://chatportal.ai/pricing', status: 'synced', lastSynced: '2023-10-27' },
    { botId: '1', id: '3', type: 'faq', name: 'What are your business hours?', status: 'synced', lastSynced: 'N/A', content: { question: 'What are your business hours?', answer: 'Our support team is available 24/7.' } },
    { botId: '2', id: '4', type: 'file', name: 'onboarding_guide.docx', status: 'error', lastSynced: '2023-10-25' },
];

const initialAiConfigs: AIConfig[] = [
  { botId: '1', personality: 'friendly', tone: 'casual', goal: 'Assist users with support questions and create tickets.', additionalInfo: 'Never discuss pricing. Always be positive.', interactionLimit: 10, responseLength: 'medium' },
  { botId: '2', personality: 'professional', tone: 'formal', goal: 'Qualify leads and book meetings for the sales team.', additionalInfo: 'If a user is not a good fit, politely end the conversation.', interactionLimit: 5, responseLength: 'short' },
];

// Helper to get state from localStorage
const getInitialState = <T,>(key: string, fallback: T): T => {
    try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (error) {
        console.error("Error reading from localStorage", key, error);
        return fallback;
    }
};


function App() {
  const [authState, setAuthState] = useState<AuthState>('login');
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  
  // Initialize state from localStorage or fallback to initial data
  const [users, setUsers] = useState<User[]>(() => getInitialState('app_users', initialUsers));
  const [chatbots, setChatbots] = useState<Chatbot[]>(() => getInitialState('app_chatbots', initialChatbots));
  const [sources, setSources] = useState<KnowledgeSource[]>(() => getInitialState('app_sources', initialKnowledgeSources));
  const [aiConfigs, setAiConfigs] = useState<AIConfig[]>(() => getInitialState('app_aiConfigs', initialAiConfigs));

  // Save state to localStorage whenever it changes
  useEffect(() => {
    window.localStorage.setItem('app_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    window.localStorage.setItem('app_chatbots', JSON.stringify(chatbots));
  }, [chatbots]);
  
  useEffect(() => {
    window.localStorage.setItem('app_sources', JSON.stringify(sources));
  }, [sources]);

  useEffect(() => {
    window.localStorage.setItem('app_aiConfigs', JSON.stringify(aiConfigs));
  }, [aiConfigs]);


  const handleLogin = () => {
    setAuthState('authenticated');
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setAuthState('login');
  };
  
  const handleAcceptInvite = (email: string) => {
      const userExists = users.find(u => u.email === email && u.status === 'pending');
      if (userExists) {
        setUsers(users.map(u => u.email === email ? { ...u, status: 'active' } : u));
        alert(`Welcome, ${userExists.name}! Your account is now active. Please log in.`);
        setAuthState('login');
      } else {
        alert('No pending invitation found for this email address.');
      }
  };

  const handleAddFeedbackToKnowledge = (botId: string, question: string, answer: string) => {
    const newFaq: KnowledgeSource = {
      id: `faq-${Date.now()}`,
      botId,
      type: 'faq',
      name: question,
      status: 'synced',
      lastSynced: new Date().toISOString().split('T')[0],
      content: { question, answer },
    };
    setSources(prev => [...prev, newFaq]);
    setChatbots(prev => prev.map(bot => 
      bot.id === botId ? { ...bot, knowledgeSources: bot.knowledgeSources + 1 } : bot
    ));
    alert('Feedback added to bot knowledge base as a new FAQ!');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'chatbots':
        return <Chatbots chatbots={chatbots} setChatbots={setChatbots} aiConfigs={aiConfigs} sources={sources} onAddFeedbackToKnowledge={handleAddFeedbackToKnowledge} />;
      case 'knowledge':
        return <Knowledge chatbots={chatbots} sources={sources} setSources={setSources} aiConfigs={aiConfigs} setAiConfigs={setAiConfigs} />;
      case 'analytics':
        return <Analytics />;
      case 'tickets':
        return <Tickets />;
      case 'profile':
        return <Profile />;
      case 'settings':
        return <Settings users={users} setUsers={setUsers} />;
      default:
        return <Dashboard />;
    }
  };

  if (authState === 'login') {
    return <Login onLogin={handleLogin} onGoToAcceptInvite={() => setAuthState('accept-invite')} />;
  }
  
  if (authState === 'accept-invite') {
    return <AcceptInvite onAccept={handleAcceptInvite} onBackToLogin={() => setAuthState('login')} />
  }

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      onLogout={handleLogout}
    >
      {renderPage()}
    </Layout>
  );
}

export default App;