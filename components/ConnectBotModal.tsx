// components/ConnectBotModal.tsx
import React, { useState } from 'react';
import Card from './ui/Card';

interface ConnectBotModalProps {
  onClose: () => void;
  onConnect: (botName: string, phoneNumber: string, phoneNumberId?: string, wabaId?: string) => void;
}

const ConnectBotModal: React.FC<ConnectBotModalProps> = ({ onClose, onConnect }) => {
  const [botName, setBotName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (botName && phoneNumber) {
      // Persisted details live on the bot doc (editable later)
      onConnect(botName, phoneNumber, phoneNumberId || undefined, wabaId || undefined);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Connect WhatsApp API</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Add the bot details. If you don’t have Meta IDs yet, you can save with just a name + phone and fill the rest in later.
          <a
            href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
            target="_blank"
            rel="noopener noreferrer"
            className="link-accent ml-1"
          >
            Find your Meta details
          </a>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="botName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bot Display Name</label>
            <input
              type="text"
              id="botName"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm lpc-focus sm:text-sm"
              placeholder="e.g., Customer Support Bot"
            />
          </div>
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">WhatsApp Phone Number</label>
            <input
              type="tel"
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm lpc-focus sm:text-sm"
              placeholder="+15551234567"
            />
          </div>
           <div>
            <label htmlFor="phoneNumberId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number ID</label>
            <input
              type="text"
              id="phoneNumberId"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm lpc-focus sm:text-sm"
              placeholder="Meta phone_number_id (optional)"
            />
          </div>
          <div>
            <label htmlFor="wabaId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">WABA ID</label>
            <input
              type="text"
              id="wabaId"
              value={wabaId}
              onChange={(e) => setWabaId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm lpc-focus sm:text-sm"
              placeholder="WhatsApp Business Account ID (optional)"
            />
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold rounded-lg btn-primary-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-extrabold rounded-lg btn-primary-gold"
            >
              Connect Bot
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ConnectBotModal;