import React, { useState } from "react";
import lpcLogo from "../images/LPC-WEB-LOGO.png";
import { login, resetPassword } from "../services/authService";

const IconMail = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M4 4h16v16H4z" opacity="0" />
    <path d="M4 6h16v12H4z" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);

const IconLock = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

const IconArrowRight = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M5 12h12" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

const IconRotate = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M21 12a9 9 0 1 1-3-6.7" />
    <path d="M21 3v6h-6" />
  </svg>
);

interface LoginProps {
  onLogin: () => void;
  onGoToAcceptInvite: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onGoToAcceptInvite }) => {
  const [email, setEmail] = useState("demo@chatportal.ai");
  const [password, setPassword] = useState("password");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      await login(email, password);
      onLogin();
    } catch (err: any) {
      const code = err?.code || "";
      const msg = (() => {
        switch (code) {
          case "auth/invalid-credential":
          case "auth/wrong-password":
            return "Incorrect email or password.";
          case "auth/user-not-found":
            return "No account found for this email.";
          case "auth/invalid-email":
            return "That email address format looks wrong.";
          case "auth/too-many-requests":
            return "Too many attempts. Please wait a minute and try again.";
          case "auth/network-request-failed":
            return "Network error. Check your internet connection and try again.";
          default:
            return `Login failed. ${err?.message ? `Details: ${err.message}` : ""}`.trim();
        }
      })();

      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    const em = email.trim();
    if (!em) {
      alert("Enter your email first.");
      return;
    }

    try {
      setLoading(true);
      await resetPassword(em);
      alert("Password reset email sent. Check your inbox (and spam).");
    } catch (err: any) {
      const code = err?.code || "";
      const msg = (() => {
        switch (code) {
          case "auth/user-not-found":
            return "No account found for that email.";
          case "auth/invalid-email":
            return "That email address format looks wrong.";
          case "auth/too-many-requests":
            return "Too many attempts. Please wait a minute and try again.";
          case "auth/network-request-failed":
            return "Network error. Check your internet connection and try again.";
          default:
            return `Password reset failed. ${err?.message ? `Details: ${err.message}` : ""}`.trim();
        }
      })();

      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100svh] bg-gradient-to-b from-[#0A2A1F] to-[#0B0F14] text-slate-200 font-sans flex items-center justify-center px-4 py-6 relative overflow-hidden">
      {/* Sidebar-matched background + subtle pattern + KEENO-style glow */}
      <div className="absolute inset-0 lpc-bg-pattern opacity-65" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(199,154,42,0.12),transparent_60%)] animate-pulse" aria-hidden="true" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#C79A2A]/35 to-transparent" aria-hidden="true" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#C79A2A]/35 to-transparent" aria-hidden="true" />

      <div className="w-full max-w-md bg-black/30 backdrop-blur-xl border border-white/10 rounded-3xl p-6 lg:p-8 shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-4">
          <div className="flex items-center justify-center">
            <img src={lpcLogo} alt="Legal Practice Council" className="w-[120px] h-[120px] object-contain" />
          </div>
          <div className="mt-5 lpc-animated-line opacity-60" aria-hidden="true" />
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
            <div className="relative group">
              <div className="relative">
                <IconMail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-[15px] font-medium focus:ring-1 focus:ring-[#C79A2A]/60 focus:border-[#C79A2A]/60 outline-none transition-all placeholder:text-slate-600 group-hover:border-slate-700"
                  autoComplete="email"
                  required
                  autoFocus
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
            <div className="relative group">
              <div className="relative">
                <IconLock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-[15px] font-medium focus:ring-1 focus:ring-[#C79A2A]/60 focus:border-[#C79A2A]/60 outline-none transition-all placeholder:text-slate-600 group-hover:border-slate-700"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="submit"
              disabled={!email.trim() || !password.trim() || loading}
              className="w-full py-3 bg-white text-slate-950 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#F2B233]/15 hover:text-white disabled:bg-slate-800 disabled:text-slate-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-white/5"
            >
              {loading ? "Signing in…" : "Sign in"}
              <IconArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleForgot}
              disabled={!email.trim() || loading}
              className="w-full py-3 bg-slate-950/40 border border-slate-800 text-slate-300 rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-slate-600 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
            >
              Reset password
              <IconRotate className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="mt-4 text-center">
          <p className="text-[10px] text-slate-500 font-medium">
            Invited to the team?{" "}
            <button
              onClick={onGoToAcceptInvite}
              className="text-slate-300 underline decoration-slate-700 underline-offset-2 font-bold hover:text-[#C79A2A]"
              disabled={loading}
              type="button"
            >
              Set your password
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
