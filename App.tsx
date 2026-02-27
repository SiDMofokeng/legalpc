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
  subscribeTickets,
  subscribeTicketsAssignedTo,
  deleteTicketsById,
  deleteUsersById,
  getAccountProfile,
  updateUser,
  upsertUser,
  getUserById,
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

// ---- Demo ticket content (kept, but we delete demo ticket IDs in Firestore as you already do) ----
const seedTicketConversation: ChatMessage[] = [
  {
    id: 1,
    sender: "user",
    text: "I hired a lawyer who claimed to be registered with the council, but I think he took my money and disappeared. He is not answering my calls.",
    timestamp: "10:30 AM",
  },
  {
    id: 2,
    sender: "ai",
    text: "I am sorry to hear that. This is a serious matter. Could you please provide the name of the lawyer or their practice number if you have it?",
    timestamp: "10:31 AM",
  },
  {
    id: 3,
    sender: "user",
    text: "His name is Richard Roe, and his office was in Pretoria Central.",
    timestamp: "10:32 AM",
  },
  {
    id: 4,
    sender: "ai",
    text: "I have checked our registry and no Richard Roe is currently licensed to practice in that area. I am escalating this to our investigations team immediately.",
    timestamp: "10:34 AM",
  },
  {
    id: 5,
    sender: "ai",
    text: "I have created ticket TKT-001. A compliance officer will contact you to take a formal statement.",
    timestamp: "10:34 AM",
  },
];

const seedTickets: Ticket[] = [
  {
    id: "TKT-001",
    customerName: "John Doe",
    subject: "Fake lawyer stole",
    status: "open",
    priority: "high",
    lastUpdate: "2023-10-27",
    agent: "Support Bot",
    conversation: seedTicketConversation,
    history: [{ id: "h1", user: "System", action: "Ticket created", timestamp: "2023-10-27T10:34:00Z" }],
  },
  {
    id: "TKT-002",
    customerName: "Jane Smith",
    subject: "Code of Conduct",
    status: "in_progress",
    priority: "medium",
    lastUpdate: "2023-10-26",
    agent: "Alex Green",
    conversation: [
      { id: 1, sender: "user", text: "Where can I find the official Code of Conduct for legal practitioners?", timestamp: "Yesterday" },
    ],
    history: [
      { id: "h2", user: "Alex Green", action: "Changed status from open to in_progress", timestamp: "2023-10-26T14:00:00Z" },
      { id: "h1", user: "System", action: "Ticket created", timestamp: "2023-10-26T09:12:00Z" },
    ],
  },
  {
    id: "TKT-003",
    customerName: "Sam Wilson",
    subject: "Feature Request: Dark Mode",
    status: "resolved",
    priority: "low",
    lastUpdate: "2023-10-25",
    agent: "Support Bot",
    conversation: [],
    history: [{ id: "h1", user: "System", action: "Ticket created", timestamp: "2023-10-25T11:00:00Z" }],
  },
];

function App() {
  const [authView, setAuthView] = useState<AuthView>("login");
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");

  // Firestore-backed state (NO demo defaults)
  const [users, setUsers] = useState<User[]>([]);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [aiConfigs, setAiConfigs] = useState<AIConfig[]>([]);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState<boolean>(true);

  const [authEmail, setAuthEmail] = useState<string>(String(auth.currentUser?.email || ""));
  const [authUid, setAuthUid] = useState<string>(String(auth.currentUser?.uid || ""));

  // Header identity (must match Firestore user profile)
  const [headerProfileName, setHeaderProfileName] = useState<string>(
    auth.currentUser?.displayName || auth.currentUser?.email || "User"
  );
  const [headerAvatarUrl, setHeaderAvatarUrl] = useState<string | undefined>(
    auth.currentUser?.photoURL || undefined
  );

  // ---- Helpers ----
  function normalizeEmail(v?: string) {
    return String(v || "").trim().toLowerCase();
  }

  // Firestore load on login
  useEffect(() => {
    let ticketsUnsub: null | (() => void) = null;

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (ticketsUnsub) {
        ticketsUnsub();
        ticketsUnsub = null;
      }

      if (!u) return;

      setAuthEmail(String(u.email || ""));
      setAuthUid(String(u.uid || ""));

      // baseline from auth
      setHeaderProfileName(u.displayName || u.email || "User");
      setHeaderAvatarUrl(u.photoURL || undefined);

      (window as any).__lpc_me_email = u.email || undefined;

      try {
        // 1) USERS: hard cleanup + load
        const myEmail = normalizeEmail(u.email);
        const allowlistedAdmin = myEmail === "sydney@dreamincolor.co.za";

        // ✅ Correct cleanup: delete demo users by DOMAIN, not by ID
        const usersCleanupKey = "lpc_demo_users_removed_v2";
        if (!window.localStorage.getItem(usersCleanupKey)) {
          try {
            const beforeUsers = await getUsers();
            const demoIds = beforeUsers
              .filter((x) => normalizeEmail(x.email).endsWith("@chatportal.ai"))
              .map((x) => x.id);

            if (demoIds.length) {
              await deleteUsersById(demoIds);
            }
          } catch {
            // ignore
          } finally {
            window.localStorage.setItem(usersCleanupKey, "1");
          }
        }

        // Load users after cleanup
        let usrs = await getUsers();

        // extra safety: never show demo domain even if rules block deletes
        usrs = usrs.filter((x) => !normalizeEmail(x.email).endsWith("@chatportal.ai"));
        setUsers(usrs);

        // Determine role from Firestore user doc
        const meFromList = usrs.find((x) => normalizeEmail(x.email) === myEmail) || null;
        const admin = allowlistedAdmin || (meFromList?.role === "Admin" && meFromList?.status === "active");

        // If allowlisted admin is missing a proper user doc, bootstrap it (and re-fetch so UI matches)
        if (allowlistedAdmin && (!meFromList || meFromList.role !== "Admin" || meFromList.status !== "active")) {
          try {
            const p = await getAccountProfile();
            await upsertUser({
              id: u.uid,
              name: meFromList?.name || p?.displayName || u.displayName || u.email || "Admin",
              email: u.email || "sydney@dreamincolor.co.za",
              role: "Admin",
              avatar: meFromList?.avatar || p?.avatarDataUrl || u.photoURL || "https://picsum.photos/100",
              status: "active",
            } as any);
          } catch {
            // ignore
          }

          // ✅ Re-fetch users so Settings matches Firestore immediately
          let after = await getUsers();
          after = after.filter((x) => !normalizeEmail(x.email).endsWith("@chatportal.ai"));
          setUsers(after);
          usrs = after;
        }

        // ✅ Header should reflect the Firestore user doc, not only auth
        // Prefer user doc by UID, then fallback to matching by email
        let meDoc: User | null = null;
        try {
          meDoc = await getUserById(u.uid);
        } catch {
          // ignore
        }
        if (!meDoc) {
          meDoc = usrs.find((x) => normalizeEmail(x.email) === myEmail) || null;
        }

        if (meDoc?.name) setHeaderProfileName(meDoc.name);
        if (meDoc?.avatar) setHeaderAvatarUrl(meDoc.avatar);

        // Legacy fallback: if admin used account profile (shared), restore it onto their user doc.
        if (admin) {
          const needsName = !meDoc?.name;
          const needsAvatar = !meDoc?.avatar;
          if (needsName || needsAvatar) {
            try {
              const p = await getAccountProfile();
              const patch: any = {};
              if (needsName && p?.displayName) patch.name = p.displayName;
              if (needsAvatar && p?.avatarDataUrl) patch.avatar = p.avatarDataUrl;

              if (Object.keys(patch).length) {
                await updateUser(u.uid, patch);
                if (patch.name) setHeaderProfileName(String(patch.name));
                if (patch.avatar) setHeaderAvatarUrl(String(patch.avatar));

                // also update users list in-memory so Settings reflects immediately
                setUsers((prev) => {
                  const exists = prev.some((x) => x.id === u.uid);
                  if (!exists) return prev;
                  return prev.map((x) => (x.id === u.uid ? ({ ...x, ...patch } as any) : x));
                });
              }
            } catch {
              // ignore
            }
          }
        }

        // 2) Restricted collections only for Admin
        if (admin) {
          const bots = await getChatbots();
          setChatbots(bots);

          const cfgs = await getAiConfigs();
          setAiConfigs(cfgs);

          const ks = await getKnowledgeSources();
          setSources(ks);
        } else {
          setChatbots([]);
          setAiConfigs([]);
          setSources([]);
        }

        // 3) Tickets: subscribe (admin: all; agent: only assigned)
        setTicketsLoading(true);

        // One-time cleanup of demo tickets
        const cleanupKey = `lpc_demo_tickets_removed_v1`;
        if (!window.localStorage.getItem(cleanupKey)) {
          try {
            await deleteTicketsById(["TKT-001", "TKT-002", "TKT-003"]);
          } catch {
            // ignore
          } finally {
            window.localStorage.setItem(cleanupKey, "1");
          }
        }

        if (admin) {
          ticketsUnsub = subscribeTickets((items) => {
            setTickets(items);
            setTicketsLoading(false);
          });
        } else {
          ticketsUnsub = subscribeTicketsAssignedTo(u.uid, (items) => {
            setTickets(items);
            setTicketsLoading(false);
          });
        }
      } catch (err) {
        console.error("Firestore load failed:", err);
        setTicketsLoading(false);
      }
    });

    return () => {
      if (ticketsUnsub) ticketsUnsub();
      unsub();
    };
  }, []);

  // ✅ Listen for Profile saves so header + users state update instantly
  useEffect(() => {
    const handler = (e: any) => {
      const d = e?.detail;
      const displayName = d?.displayName ? String(d.displayName) : "";
      const avatarUrl = d?.avatarUrl ? String(d.avatarUrl) : "";
      const uid = String(auth.currentUser?.uid || "");

      if (displayName) setHeaderProfileName(displayName);
      if (avatarUrl) setHeaderAvatarUrl(avatarUrl);

      // keep Settings table consistent too
      if (uid) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === uid
              ? ({
                ...u,
                name: displayName || u.name,
                avatar: avatarUrl || u.avatar,
              } as any)
              : u
          )
        );
      }
    };

    window.addEventListener("lpc_profile_updated", handler as any);
    return () => window.removeEventListener("lpc_profile_updated", handler as any);
  }, []);

  const handleLogin = () => {
    setCurrentPage("dashboard");
  };

  const handleLogout = async () => {
    await signOut(auth);
    setAuthView("login");
    setCurrentPage("dashboard");
  };

  // NOTE: AcceptInvite currently only flips local state.
  // We'll wire this to Firestore after invite flow is finalized.
  const handleAcceptInvite = (email: string) => {
    const userExists = users.find((u) => u.email === email && u.status === "pending");

    if (userExists) {
      setUsers(users.map((u) => (u.email === email ? { ...u, status: "active" } : u)));
      alert(`Welcome, ${userExists.name}! Your account is now active. Please log in.`);
      setAuthView("login");
    } else {
      alert("No pending invitation found for this email address.");
    }
  };

  const handleAddFeedbackToKnowledge = (botId: string, question: string, answer: string) => {
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
      prev.map((bot) => (bot.id === botId ? { ...bot, knowledgeSources: bot.knowledgeSources + 1 } : bot))
    );

    alert("Feedback added to bot knowledge base as a new FAQ!");
  };

  const me = React.useMemo(() => {
    const email = String(authEmail || "").toLowerCase();
    if (!email) return null;
    return users.find((u) => String(u.email || "").toLowerCase() === email) || null;
  }, [users, authEmail]);

  const adminEmailAllowlist = React.useMemo(() => new Set(["sydney@dreamincolor.co.za"]), []);
  const isAdmin = Boolean(
    (me?.role === "Admin" && me?.status === "active") || adminEmailAllowlist.has(String(authEmail || "").toLowerCase())
  );

  const visibleTickets = React.useMemo(() => {
    if (isAdmin) return tickets;
    const uid = String(authUid || "").trim();
    if (!uid) return [];
    return tickets.filter((t) => String((t as any).assignedToUid || "").trim() === uid);
  }, [tickets, isAdmin, authUid]);

  useEffect(() => {
    if (isAdmin) return;
    const restricted: Page[] = ["chatbots", "knowledge", "settings"];
    if (restricted.includes(currentPage)) setCurrentPage("dashboard");
  }, [isAdmin, currentPage]);

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard": {
        const totalConversations = visibleTickets.length;
        const activeBotsCount = chatbots.filter((b) => b.status === "active").length;
        const inactiveBotsCount = chatbots.filter((b) => b.status !== "active").length;
        const knowledgeSyncedCount = sources.filter((s) => s.status === "synced").length;
        const knowledgePendingCount = sources.filter((s) => s.status === "pending").length;

        return (
          <Dashboard
            tickets={visibleTickets}
            totalConversations={totalConversations}
            activeBotsCount={activeBotsCount}
            inactiveBotsCount={inactiveBotsCount}
            knowledgeSyncedCount={knowledgeSyncedCount}
            knowledgePendingCount={knowledgePendingCount}
            isAdmin={isAdmin}
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
          <Knowledge chatbots={chatbots} sources={sources} setSources={setSources} aiConfigs={aiConfigs} setAiConfigs={setAiConfigs} />
        );

      case "analytics":
        return <Analytics tickets={visibleTickets} />;

      case "tickets":
        return <Tickets tickets={visibleTickets} setTickets={setTickets} users={users} loading={ticketsLoading} isAdmin={isAdmin} />;

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
            <AcceptInvite onAccept={handleAcceptInvite} onBackToLogin={() => setAuthView("login")} />
          ) : (
            <Login onLogin={handleLogin} onGoToAcceptInvite={() => setAuthView("accept-invite")} />
          )
        }
      >
        {() => (
          <Layout
            currentPage={currentPage}
            onNavigate={setCurrentPage}
            onLogout={handleLogout}
            isAdmin={isAdmin}
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
