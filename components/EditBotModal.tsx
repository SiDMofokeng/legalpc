import React, { useState, useEffect } from 'react';
import type { Chatbot } from '../types';
import Card from './ui/Card';

interface EditBotModalProps {
  bot: Chatbot;
  onClose: () => void;
  onSave: (updatedBot: Chatbot) => void;
}

const EditBotModal: React.FC<EditBotModalProps> = ({ bot, onClose, onSave }) => {
  const [name, setName] = useState(bot.name || '');
  const [phone, setPhone] = useState(bot.phone || '');
  const [phoneNumberId, setPhoneNumberId] = useState(bot.phoneNumberId || '');
  const [wabaId, setWabaId] = useState(bot.whatsappBusinessAccountId || '');

  useEffect(() => {
    setName(bot.name || '');
    setPhone(bot.phone || '');
    setPhoneNumberId(bot.phoneNumberId || '');
    setWabaId(bot.whatsappBusinessAccountId || '');
  }, [bot]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Allow saving even if phone details are still missing.
    const safeName = name.trim();
    if (!safeName) return;

    onSave({
      ...bot,
      name: safeName,
      phone: phone.trim(),
      phoneNumberId: phoneNumberId.trim() || undefined,
      whatsappBusinessAccountId: wabaId.trim() || undefined,
    });
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Chatbot</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="botName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bot Name</label>
            <input
              type="text"
              id="botName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm lpc-focus"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">WhatsApp Phone Number</label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm lpc-focus"
              placeholder="e.g., +15551234567"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="phoneNumberId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number ID</label>
              <input
                type="text"
                id="phoneNumberId"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm lpc-focus"
                placeholder="Meta phone_number_id"
              />
            </div>
            <div>
              <label htmlFor="wabaId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">WABA ID</label>
              <input
                type="text"
                id="wabaId"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm lpc-focus"
                placeholder="WhatsApp Business Account ID"
              />
            </div>
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
              Save Changes
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default EditBotModal;