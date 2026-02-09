import React, { useState } from 'react';
import { ChatbotIcon } from './icons/ChatbotIcon';

interface AcceptInviteProps {
  onAccept: (email: string) => void;
  onBackToLogin: () => void;
}

const AcceptInvite: React.FC<AcceptInviteProps> = ({ onAccept, onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!email || !code) {
      alert('Please enter your email and invite code.');
      return;
    }
    if (password !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      alert('Password must be at least 8 characters long.');
      return;
    }

    try {
      setSubmitting(true);
      const { acceptInvite } = await import('../services/inviteService');
      await acceptInvite({ email, code, password });
      alert('Account created. You can now sign in.');
      onBackToLogin();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Invite failed');
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-xl dark:bg-gray-800">
        <div className="flex flex-col items-center">
          <div className="p-3 bg-[#C79A2A]/10 rounded-full ring-1 ring-[#C79A2A]/20">
            <ChatbotIcon className="w-10 h-10 text-[#C79A2A]" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-center text-gray-900 dark:text-white">Accept Your Invitation</h2>
          <p className="mt-2 text-sm text-center text-gray-600 dark:text-gray-400">Enter your email + login code, then set your password.</p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email-address" className="sr-only">Email address</label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="relative block w-full px-3 py-3 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-1 focus:ring-[#C79A2A]/50 focus:border-[#C79A2A]/50 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              placeholder="Email address"
            />
          </div>

          <div>
            <label htmlFor="invite-code" className="sr-only">Invite code</label>
            <input
              id="invite-code"
              name="code"
              type="text"
              required
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              className="relative block w-full px-3 py-3 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-1 focus:ring-[#C79A2A]/50 focus:border-[#C79A2A]/50 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              placeholder="Login code (e.g. 8 characters)"
            />
          </div>

          <div>
            <label htmlFor="password">New Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="relative block w-full px-3 py-3 mt-1 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-1 focus:ring-[#C79A2A]/50 focus:border-[#C79A2A]/50 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="relative block w-full px-3 py-3 mt-1 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-1 focus:ring-[#C79A2A]/50 focus:border-[#C79A2A]/50 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest btn-primary-ink disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create Account'}
          </button>
        </form>
       
        <div className="text-sm text-center">
            <p className="text-gray-600 dark:text-gray-400">
                <button
                    onClick={onBackToLogin}
                    className="font-semibold link-accent"
                >
                    &larr; Back to Login
                </button>
            </p>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvite;
