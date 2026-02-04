import React, { useState } from 'react';
import { ChatbotIcon } from './icons/ChatbotIcon';

interface AcceptInviteProps {
  onAccept: (email: string) => void;
  onBackToLogin: () => void;
}

const AcceptInvite: React.FC<AcceptInviteProps> = ({ onAccept, onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you'd verify the email has a pending invite.
    // Here we just move to the next step.
    if(email) setStep(2);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
        alert("Password must be at least 8 characters long.");
        return;
    }
    onAccept(email);
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-xl dark:bg-gray-800">
        <div className="flex flex-col items-center">
          <div className="p-3 bg-blue-100 rounded-full dark:bg-blue-900">
            <ChatbotIcon className="w-10 h-10 text-blue-600 dark:text-blue-300" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-center text-gray-900 dark:text-white">
            {step === 1 ? 'Accept Your Invitation' : 'Create Your Password'}
          </h2>
          <p className="mt-2 text-sm text-center text-gray-600 dark:text-gray-400">
             {step === 1 ? 'Enter your email to find your team invite.' : `Setting up account for ${email}`}
          </p>
        </div>

        {step === 1 ? (
             <form className="mt-8 space-y-6" onSubmit={handleEmailSubmit}>
                <div className="space-y-4 rounded-md shadow-sm">
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
                            className="relative block w-full px-3 py-3 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                            placeholder="Email address"
                        />
                    </div>
                </div>
                 <div>
                    <button
                    type="submit"
                    className="relative flex justify-center w-full px-4 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md group hover:bg-blue-700"
                    >
                    Continue
                    </button>
                </div>
            </form>
        ) : (
            <form className="mt-8 space-y-6" onSubmit={handlePasswordSubmit}>
                <div className="space-y-4 rounded-md shadow-sm">
                    <div>
                        <label htmlFor="password">New Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="relative block w-full px-3 py-3 mt-1 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
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
                            className="relative block w-full px-3 py-3 mt-1 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                            placeholder="••••••••"
                        />
                    </div>
                </div>
                 <div>
                    <button
                    type="submit"
                    className="relative flex justify-center w-full px-4 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md group hover:bg-blue-700"
                    >
                    Set Password & Log In
                    </button>
                </div>
            </form>
        )}
       
        <div className="text-sm text-center">
            <p className="text-gray-600 dark:text-gray-400">
                <button
                    onClick={onBackToLogin}
                    className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
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
