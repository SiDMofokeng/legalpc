
import React, { useState } from 'react';
import { Page } from '../App';
import { DashboardIcon } from './icons/DashboardIcon';
import { KnowledgeIcon } from './icons/KnowledgeIcon';
import { AnalyticsIcon } from './icons/AnalyticsIcon';
import { TicketsIcon } from './icons/TicketsIcon';
import { LogoutIcon } from './icons/LogoutIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { ChatbotIcon } from './icons/ChatbotIcon';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

const NavLink: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full px-4 py-3 text-sm font-medium transition-colors duration-200 ${
      isActive
        ? 'text-white bg-gray-900'
        : 'text-gray-400 hover:text-white hover:bg-gray-700'
    } rounded-lg`}
  >
    {icon}
    <span className="ml-4">{label}</span>
  </button>
);

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const pageTitles: Record<Page, string> = {
    dashboard: 'Dashboard',
    chatbots: 'Chatbots',
    knowledge: 'Knowledge Base',
    analytics: 'Analytics',
    tickets: 'Tickets',
    profile: 'Your Profile',
    settings: 'Settings'
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 px-4 py-8 overflow-y-auto bg-gray-800 border-r dark:bg-gray-800 dark:border-gray-700 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:relative md:translate-x-0`}>
        <div className="flex items-center justify-center h-20 px-4 text-white">
          <div className="text-center">
            <div className="font-bold text-lg tracking-wide">LEGAL PRACTICE</div>
            <div className="font-bold text-lg tracking-wide">COUNCIL AGENTS</div>
          </div>
        </div>

        <nav className="mt-8 space-y-2">
          <NavLink icon={<DashboardIcon className="w-5 h-5" />} label="Dashboard" isActive={currentPage === 'dashboard'} onClick={() => onNavigate('dashboard')} />
          <NavLink icon={<ChatbotIcon className="w-5 h-5" />} label="Chatbots" isActive={currentPage === 'chatbots'} onClick={() => onNavigate('chatbots')} />
          <NavLink icon={<KnowledgeIcon className="w-5 h-5" />} label="Knowledge" isActive={currentPage === 'knowledge'} onClick={() => onNavigate('knowledge')} />
          <NavLink icon={<AnalyticsIcon className="w-5 h-5" />} label="Analytics" isActive={currentPage === 'analytics'} onClick={() => onNavigate('analytics')} />
          <NavLink icon={<TicketsIcon className="w-5 h-5" />} label="Tickets" isActive={currentPage === 'tickets'} onClick={() => onNavigate('tickets')} />
          <NavLink icon={<SettingsIcon className="w-5 h-5" />} label="Settings" isActive={currentPage === 'settings'} onClick={() => onNavigate('settings')} />
        </nav>
        
        <div className="absolute bottom-0 left-0 w-full p-4">
          <button
            onClick={onLogout}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-400 transition-colors duration-200 rounded-lg hover:text-white hover:bg-gray-700"
          >
            <LogoutIcon className="w-5 h-5" />
            <span className="ml-4">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 w-full overflow-y-auto">
        <header className="flex items-center justify-between h-16 px-6 py-4 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
            <div className="flex items-center">
                 <button className="text-gray-500 focus:outline-none md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 6H20M4 12H20M4 18H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>
                <h1 className="text-2xl font-semibold text-gray-800 dark:text-white ml-4 md:ml-0">{pageTitles[currentPage]}</h1>
            </div>

            <div className="flex items-center">
                <div className="relative">
                    <button onClick={() => onNavigate('profile')} className="flex items-center focus:outline-none">
                        <img className="object-cover w-10 h-10 rounded-full" src="https://picsum.photos/100" alt="Avatar"/>
                        <span className="hidden ml-2 font-semibold md:inline">Demo User</span>
                    </button>
                </div>
            </div>
        </header>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
