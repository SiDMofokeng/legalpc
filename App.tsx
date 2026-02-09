// FILE: App.tsx
import React, { useState, useEffect } from "react";
import Layout from "./components/Layout";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Chatbots from "./components/Chatbots";
import Knowledge from "./components/Knowledge";
import Analytics from "./components/Analytics";
import Tickets from "./components/Tickets";
import Profile from "./components/Profile";
import Settings from "./components/Settings";
import AcceptInvite from "./components/AcceptInvite";
import AuthGate from "./components/AuthGate";
import type { User, Chatbot, KnowledgeSource, AIConfig, Ticket, ChatMessage } from "./types";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./services/firebase";

import {
  getChatbots,
  getAiConfigs,
  getKnowledgeSources,
  getUsers,
  getTickets,
  subscribeTickets,
  deleteTicketsById,
  deleteUsersById,
  getAccountProfile,
} from "./services/firestoreStore";


export type Page =
  | "dashboard"
  | "chatbots"
  | "knowledge"
  | "analytics"
  | "tickets"
  | "profile"
  | "settings";

type AuthView = "login" | "accept-invite";

// ----- Demo data (kept as-is for now) -----
const initialUsers: User[] = [
  {
    id: "1",
    name: "Demo User",
    email: "demo@chatportal.ai",
    role: "Admin",
    avatar: "https://picsum.photos/100",
    status: "active",
  },
  {
    id: "2",
    name: "Alex Green",
    email: "alex@chatportal.ai",
    role: "Agent",
    avatar: "https://picsum.photos/100/100?a=2",
    status: "pending",
  },
  {
    id: "3",
    name: "Maria Garcia",
    email: "maria@chatportal.ai",
    role: "Agent",
    avatar: "https://picsum.photos/100/100?a=3",
    status: "active",
  },
];

const initialChatbots: Chatbot[] = [
  {
    id: "1",
    name: "Customer Support Bot",
    phone: "+15551234567",
    status: "active",
    conversations: 1204,
    responseRate: 95,
    knowledgeSources: 3,
  },
  {
    id: "2",
    name: "Sales Inquiry Bot",
    phone: "+15557654321",
    status: "inactive",
    conversations: 350,
    responseRate: 98,
    knowledgeSources: 1,
  },
];

const initialKnowledgeSources: KnowledgeSource[] = [
  {
    botId: "1",
    id: "1",
    type: "file",
    name: "product_manual.pdf",
    status: "synced",
    lastSynced: "2023-10-26",
  },
  {
    botId: "1",
    id: "2",
    type: "url",
    name: "https://chatportal.ai/pricing",
    status: "synced",
    lastSynced: "2023-10-27",
  },
  {
    botId: "1",
    id: "3",
    type: "faq",
    name: "What are your business hours?",
    status: "synced",
    lastSynced: "N/A",
    content: {
      question: "What are your business hours?",
      answer: "Our support team is available 24/7.",
    },
  },
  {
    botId: "2",
    id: "4",
    type: "file",
    name: "onboarding_guide.docx",
    status: "error",
    lastSynced: "2023-10-25",
  },
];

const initialAiConfigs: AIConfig[] = [
  {
    botId: "1",
    personality: "friendly",
    tone: "casual",
    goal: "Assist users with support questions and create tickets.",
    additionalInfo: "Never discuss pricing. Always be positive.",
    interactionLimit: 10,
    responseLength: "medium",
  },
  {
    botId: "2",
    personality: "professional",
    tone: "formal",
    goal: "Qualify leads and book meetings for the sales team.",
    additionalInfo: "If a user is not a good fit, politely end the conversation.",
    interactionLimit: 5,
    responseLength: "short",
  },
];

const seedTicketConversation: ChatMessage[] = [
  {
    id: 1,
    sender: 'user',
    text: 'I hired a lawyer who claimed to be registered with the council, but I think he took my money and disappeared. He is not answering my calls.',
    timestamp: '10:30 AM',
  },
  {
    id: 2,
    sender: 'ai',
    text: 'I am sorry to hear that. This is a serious matter. Could you please provide the name of the lawyer or their practice number if you have it?',
    timestamp: '10:31 AM',
  },
  {
    id: 3,
    sender: 'user',
    text: 'His name is Richard Roe, and his office was in Pretoria Central.',
    timestamp: '10:32 AM',
  },
  {
    id: 4,
    sender: 'ai',
    text: 'I have checked our registry and no Richard Roe is currently licensed to practice in that area. I am escalating this to our investigations team immediately.',
    timestamp: '10:34 AM',
  },
  {
    id: 5,
    sender: 'ai',
    text: 'I have created ticket TKT-001. A compliance officer will contact you to take a formal statement.',
    timestamp: '10:34 AM',
  },
];

// Seed exactly 3 tickets into Firestore (Option A: keep IDs)
const seedTickets: Ticket[] = [
  {
    id: 'TKT-001',
    customerName: 'John Doe',
    subject: 'Fake lawyer stole',
    status: 'open',
    priority: 'high',
    lastUpdate: '2023-10-27',
    agent: 'Support Bot',
    conversation: seedTicketConversation,
    history: [
      { id: 'h1', user: 'System', action: 'Ticket created', timestamp: '2023-10-27T10:34:00Z' },
    ],
  },
  {
    id: 'TKT-002',
    customerName: 'Jane Smith',
    subject: 'Code of Conduct',
    status: 'in_progress',
    priority: 'medium',
    lastUpdate: '2023-10-26',
    agent: 'Alex Green',
    conversation: [
      {
        id: 1,
        sender: 'user',
        text: 'Where can I find the official Code of Conduct for legal practitioners?',
        timestamp: 'Yesterday',
      },
    ],
    history: [
      {
        id: 'h2',
        user: 'Alex Green',
        action: 'Changed status from open to in_progress',
        timestamp: '2023-10-26T14:00:00Z',
      },
      { id: 'h1', user: 'System', action: 'Ticket created', timestamp: '2023-10-26T09:12:00Z' },
    ],
  },
  {
    id: 'TKT-003',
    customerName: 'Sam Wilson',
    subject: 'Feature Request: Dark Mode',
    status: 'resolved',
    priority: 'low',
    lastUpdate: '2023-10-25',
    agent: 'Support Bot',
    conversation: [],
    history: [{ id: 'h1', user: 'System', action: 'Ticket created', timestamp: '2023-10-25T11:00:00Z' }],
  },
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
  const [authView, setAuthView] = useState<AuthView>("login");
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");

  // Local UI state (we’ll load/overwrite these from Firestore after login)
  // No local/demo defaults. Firestore is the source of truth.
  const [users, setUsers] = useState<User[]>([]);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [aiConfigs, setAiConfigs] = useState<AIConfig[]>([]);

  // Tickets: Firestore-backed (no localStorage source of truth)
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState<boolean>(true);

  // Header profile info (FireStore-backed)
  const [headerProfileName, setHeaderProfileName] = useState<string>(
    auth.currentUser?.displayName || auth.currentUser?.email || 'User'
  );
  const [headerAvatarUrl, setHeaderAvatarUrl] = useState<string | undefined>(
    auth.currentUser?.photoURL || undefined
  );

  // No localStorage cache: admin portal must reflect real system state.

  // Firestore load on login
  useEffect(() => {
    let ticketsUnsub: null | (() => void) = null;

    const unsub = onAuthStateChanged(auth, async (u) => {
      // clean previous listener
      if (ticketsUnsub) {
        ticketsUnsub();
        ticketsUnsub = null;
      }

      if (!u) return;

      // Always keep header in sync with auth user as a baseline
      setHeaderProfileName(u.displayName || u.email || 'User');
      setHeaderAvatarUrl(u.photoURL || undefined);

      try {
        // 0) Account Profile (header)
        const p = await getAccountProfile();
        if (p?.displayName) setHeaderProfileName(p.displayName);
        if (p?.avatarDataUrl) setHeaderAvatarUrl(p.avatarDataUrl);

        // 1) Chatbots: load (no demo seeding)
        const bots = await getChatbots();
        setChatbots(bots);

        // 2) Users: load (no demo seeding)
        // One-time cleanup: remove old demo users that were seeded earlier.
        const usersCleanupKey = 'lpc_demo_users_removed_v1';
        if (!window.localStorage.getItem(usersCleanupKey)) {
          try {
            await deleteUsersById(['1', '2', '3']);
          } catch {
            // ignore
          } finally {
            window.localStorage.setItem(usersCleanupKey, '1');
          }
        }

        const usrs = await getUsers();
        // Filter any remaining demo artifacts by email domain
        setUsers(usrs.filter((u) => !String(u.email || '').endsWith('@chatportal.ai')));

        // 3) AI Configs: load
        const cfgs = await getAiConfigs();
        setAiConfigs(cfgs);

        // 4) Knowledge Sources: load
        const ks = await getKnowledgeSources();
        setSources(ks);

        // 5) Tickets: load
        setTicketsLoading(true);

        // One-time cleanup: remove demo/seeded tickets so we only see real ones.
        // (User explicitly requested this.)
        const cleanupKey = `lpc_demo_tickets_removed_v1`;
        if (!window.localStorage.getItem(cleanupKey)) {
          try {
            await deleteTicketsById(['TKT-001', 'TKT-002', 'TKT-003']);
          } catch {
            // Ignore if they don't exist or rules block deletes
          } finally {
            window.localStorage.setItem(cleanupKey, '1');
          }
        }

        // Realtime: keep tickets updated (webhook-created tickets show instantly)
        // (Initial snapshot will populate state.)
        ticketsUnsub = subscribeTickets((items) => {
          setTickets(items);
          setTicketsLoading(false);
        });
      } catch (err) {
        console.error("Firestore load failed:", err);
        setTicketsLoading(false);
        // Don’t break the app; you’ll still see cached/local data if any exists.
      }
    });

    return () => {
      if (ticketsUnsub) ticketsUnsub();
      unsub();
    };
  }, []);

  // Listen for Profile saves so the header updates instantly
  useEffect(() => {
    const handler = (e: any) => {
      const d = e?.detail;
      if (d?.displayName) setHeaderProfileName(String(d.displayName));
      if (d?.avatarUrl) setHeaderAvatarUrl(String(d.avatarUrl));
    };

    window.addEventListener('lpc_profile_updated', handler as any);
    return () => window.removeEventListener('lpc_profile_updated', handler as any);
  }, []);

  const handleLogin = () => {
    setCurrentPage("dashboard");
  };

  const handleLogout = async () => {
    await signOut(auth);

    // Optional: reset view state
    setAuthView("login");
    setCurrentPage("dashboard");
  };

  const handleAcceptInvite = (email: string) => {
    const userExists = users.find(
      (u) => u.email === email && u.status === "pending"
    );

    if (userExists) {
      setUsers(
        users.map((u) =>
          u.email === email ? { ...u, status: "active" } : u
        )
      );
      alert(`Welcome, ${userExists.name}! Your account is now active. Please log in.`);
      setAuthView("login");
    } else {
      alert("No pending invitation found for this email address.");
    }
  };

  const handleAddFeedbackToKnowledge = (
    botId: string,
    question: string,
    answer: string
  ) => {
    const newFaq: KnowledgeSource = {
      id: `faq-${Date.now()}`,
      botId,
      type: "faq",
      name: question,
      status: "synced",
      lastSynced: new Date().toISOString().split("T")[0],
      content: { question, answer },
    };

    setSources((prev) => [...prev, newFaq]);
    setChatbots((prev) =>
      prev.map((bot) =>
        bot.id === botId
          ? { ...bot, knowledgeSources: bot.knowledgeSources + 1 }
          : bot
      )
    );

    alert("Feedback added to bot knowledge base as a new FAQ!");
  };

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard": {
        // No conversation log exists yet. Use tickets count as the only real proxy for inbound interactions.
        const totalConversations = tickets.length;
        const activeBotsCount = chatbots.filter((b) => b.status === 'active').length;
        const knowledgeSyncedCount = sources.filter((s) => s.status === 'synced').length;
        const knowledgePendingCount = sources.filter((s) => s.status === 'pending').length;

        return (
          <Dashboard
            tickets={tickets}
            totalConversations={totalConversations}
            activeBotsCount={activeBotsCount}
            knowledgeSyncedCount={knowledgeSyncedCount}
            knowledgePendingCount={knowledgePendingCount}
          />
        );
      }

      case "chatbots":
        return (
          <Chatbots
            chatbots={chatbots}
            setChatbots={setChatbots}
            aiConfigs={aiConfigs}
            sources={sources}
            onAddFeedbackToKnowledge={handleAddFeedbackToKnowledge}
          />
        );

      case "knowledge":
        return (
          <Knowledge
            chatbots={chatbots}
            sources={sources}
            setSources={setSources}
            aiConfigs={aiConfigs}
            setAiConfigs={setAiConfigs}
          />
        );

      case "analytics":
        return <Analytics tickets={tickets} />;

      case "tickets":
        return (
          <Tickets
            tickets={tickets}
            setTickets={setTickets}
            users={users}
            loading={ticketsLoading}
          />
        );

      case "profile":
        return <Profile />;

      case "settings":
        return <Settings users={users} setUsers={setUsers} />;

      default:
        return <Dashboard />;
    }
  };

  return (
    <>
      <AuthGate
        fallback={
          authView === "accept-invite" ? (
            <AcceptInvite
              onAccept={handleAcceptInvite}
              onBackToLogin={() => setAuthView("login")}
            />
          ) : (
            <Login
              onLogin={handleLogin}
              onGoToAcceptInvite={() => setAuthView("accept-invite")}
            />
          )
        }
      >
        {() => (
          <Layout
            currentPage={currentPage}
            onNavigate={setCurrentPage}
            onLogout={handleLogout}
            profileName={headerProfileName}
            avatarUrl={headerAvatarUrl}
          >
            {renderPage()}
          </Layout>
        )}
      </AuthGate>
    </>
  );
}

export default App;
