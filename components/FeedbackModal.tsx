import React, { useState } from 'react';
import Card from './ui/Card';

interface FeedbackModalProps {
  userQuery: string;
  aiResponse: string;
  onClose: () => void;
  onSubmit: (feedback: string) => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ userQuery, aiResponse, onClose, onSubmit }) => {
  const [correctedAnswer, setCorrectedAnswer] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(correctedAnswer);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Provide Feedback</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <div className="space-y-4 mb-6 text-sm">
            <div>
                <label className="font-semibold text-gray-600 dark:text-gray-400">User asked:</label>
                <p className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded-md italic">"{userQuery}"</p>
            </div>
             <div>
                <label className="font-semibold text-gray-600 dark:text-gray-400">Bot responded:</label>
                <p className="mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded-md italic">"{aiResponse}"</p>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="corrected-answer" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              What should the bot have said?
            </label>
            <textarea
              id="corrected-answer"
              value={correctedAnswer}
              onChange={(e) => setCorrectedAnswer(e.target.value)}
              required
              rows={4}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter the ideal response here..."
            />
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none"
            >
              Update Knowledge
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default FeedbackModal;