
import React from 'react';
import { ChatbotIcon } from './icons/ChatbotIcon';

interface LoginProps {
  onLogin: () => void;
  onGoToAcceptInvite: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onGoToAcceptInvite }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-xl dark:bg-gray-800">
        <div className="flex flex-col items-center">
          <div className="p-3 bg-blue-100 rounded-full dark:bg-blue-900">
            <ChatbotIcon className="w-10 h-10 text-blue-600 dark:text-blue-300" />
          </div>
          <h2 className="mt-6 text-2xl font-extrabold text-center text-gray-900 dark:text-white">
            Welcome to<br/>Legal Practice Council Agents
          </h2>
          <p className="mt-2 text-sm text-center text-gray-600 dark:text-gray-400">
            Sign in to manage your AI WhatsApp Chatbots
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={(e) => { e.preventDefault(); onLogin(); }}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full px-3 py-3 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                placeholder="Email address"
                defaultValue="demo@chatportal.ai"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full px-3 py-3 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                placeholder="Password"
                defaultValue="password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="relative flex justify-center w-full px-4 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md group hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300"
            >
              Sign in
            </button>
          </div>
        </form>
         <div className="text-sm text-center">
            <p className="text-gray-600 dark:text-gray-400">
                Invited to the team?{' '}
                <button
                    onClick={onGoToAcceptInvite}
                    className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
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
