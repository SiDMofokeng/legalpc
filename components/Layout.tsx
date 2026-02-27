// FILE: components/Layout.tsx
import React, { useState } from "react";
import { Page } from "../App";
import { DashboardIcon } from "./icons/DashboardIcon";
import { KnowledgeIcon } from "./icons/KnowledgeIcon";
import { AnalyticsIcon } from "./icons/AnalyticsIcon";
import { TicketsIcon } from "./icons/TicketsIcon";
import { LogoutIcon } from "./icons/LogoutIcon";
import { SettingsIcon } from "./icons/SettingsIcon";
import { ChatbotIcon } from "./icons/ChatbotIcon";
import lpcLogo from "../images/LPC-WEB-LOGO.png";

interface LayoutProps {
  children: React.ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
  isAdmin?: boolean;
  profileName?: string;
  avatarUrl?: string;
}

const NavLink: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`group flex items-center w-full px-3 py-2 text-[12px] leading-4 font-semibold transition-all duration-200 rounded-xl ${isActive
        ? "text-white bg-white/10 ring-1 ring-white/15"
        : "text-white/70 hover:text-white hover:bg-white/5"
      }`}
  >
    <span
      className={`transition-colors ${isActive ? "text-[#F2B233]" : "text-white/70 group-hover:text-[#F2B233]"
        }`}
    >
      {icon}
    </span>
    <span className="ml-2.5">{label}</span>
  </button>
);

const Layout: React.FC<LayoutProps> = ({
  children,
  currentPage,
  onNavigate,
  onLogout,
  isAdmin = false,
  profileName,
  avatarUrl,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const pageTitles: Record<Page, string> = {
    dashboard: "Dashboard",
    chatbots: "Chatbots",
    knowledge: "Knowledge Base",
    analytics: "Analytics",
    tickets: "Tickets",
    profile: "Your Profile",
    settings: "Settings",
  };

  const canSee = (p: Page) => {
    if (isAdmin) return true;
    return !(["chatbots", "knowledge", "settings"] as Page[]).includes(p);
  };

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 px-4 py-4 bg-gradient-to-b from-[#0A2A1F] to-[#0B0F14] border-r border-white/10 transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          } transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col`}
      >
        {/* Brand (smaller) */}
        <div className="flex items-center justify-center text-white">
          <div className="flex flex-col items-center gap-2">
            <img
              src={lpcLogo}
              alt="Legal Practice Council"
              className="h-[78px] w-[78px] object-contain"
            />
            <div className="text-center leading-tight">
              <div className="text-[11px] text-white/70">Operations Portal</div>
              <div className="mt-2 w-44">
                <div className="lpc-animated-line opacity-70" />
              </div>
            </div>
          </div>
        </div>

        {/* Nav (no centering, no scroll, tighter) */}
        <nav className="mt-4 flex flex-col gap-2">
          {canSee("dashboard") && (
            <NavLink
              icon={<DashboardIcon className="w-4.5 h-4.5" />}
              label="Dashboard"
              isActive={currentPage === "dashboard"}
              onClick={() => onNavigate("dashboard")}
            />
          )}
          {canSee("chatbots") && (
            <NavLink
              icon={<ChatbotIcon className="w-4.5 h-4.5" />}
              label="Chatbots"
              isActive={currentPage === "chatbots"}
              onClick={() => onNavigate("chatbots")}
            />
          )}
          {canSee("knowledge") && (
            <NavLink
              icon={<KnowledgeIcon className="w-4.5 h-4.5" />}
              label="Knowledge"
              isActive={currentPage === "knowledge"}
              onClick={() => onNavigate("knowledge")}
            />
          )}
          {canSee("analytics") && (
            <NavLink
              icon={<AnalyticsIcon className="w-4.5 h-4.5" />}
              label="Analytics"
              isActive={currentPage === "analytics"}
              onClick={() => onNavigate("analytics")}
            />
          )}
          {canSee("tickets") && (
            <NavLink
              icon={<TicketsIcon className="w-4.5 h-4.5" />}
              label="Tickets"
              isActive={currentPage === "tickets"}
              onClick={() => onNavigate("tickets")}
            />
          )}
        </nav>

        {/* Footer (normal flow, pushes down, not absolute) */}
        <div className="mt-auto pt-3 space-y-2">
          <div className="lpc-animated-line opacity-60" />

          {canSee("settings") && (
            <NavLink
              icon={<SettingsIcon className="w-4.5 h-4.5" />}
              label="Settings"
              isActive={currentPage === "settings"}
              onClick={() => onNavigate("settings")}
            />
          )}

          <button
            onClick={onLogout}
            className="flex items-center w-full px-3 py-2 text-[12px] leading-4 font-semibold text-white/70 transition-colors duration-200 rounded-xl hover:text-white hover:bg-white/5"
          >
            <LogoutIcon className="w-4.5 h-4.5" />
            <span className="ml-2.5">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 w-full lpc-content-bg">
        <header className="flex items-center justify-between h-16 px-6 py-4 bg-white/70 backdrop-blur border-b border-black/5">
          <div className="flex items-center">
            <button
              className="text-gray-700 focus:outline-none md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 6H20M4 12H20M4 18H11"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-900 ml-4 md:ml-0 tracking-tight">
              {pageTitles[currentPage] || "Portal"}
            </h1>
          </div>

          <div className="flex items-center">
            <button
              onClick={() => onNavigate("profile")}
              className="flex items-center gap-3 focus:outline-none"
            >
              <div className="subtle-anim-border rounded-full">
                <div className="bg-white dark:bg-gray-800 rounded-full p-[2px]">
                  <img
                    className="object-cover w-10 h-10 rounded-full"
                    src={avatarUrl || "https://picsum.photos/100"}
                    alt="Avatar"
                  />
                </div>
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-bold text-gray-900 leading-tight">
                  {profileName || "User"}
                </div>
                <div className="text-xs text-gray-500">View profile</div>
              </div>
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto overflow-x-hidden lpc-content-bg-soft">
          <div className="mb-4 lpc-animated-line opacity-20" aria-hidden="true" />
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
