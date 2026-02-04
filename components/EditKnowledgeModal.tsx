import React, { useState, useEffect } from 'react';
import type { KnowledgeSource } from '../types';
import Card from './ui/Card';

interface EditKnowledgeModalProps {
  source: KnowledgeSource;
  onClose: () => void;
  onSave: (updatedSource: KnowledgeSource) => void;
}

const EditKnowledgeModal: React.FC<EditKnowledgeModalProps> = ({ source, onClose, onSave }) => {
  const [name, setName] = useState(source.name);
  const [question, setQuestion] = useState(source.content?.question || '');
  const [answer, setAnswer] = useState(source.content?.answer || '');

  useEffect(() => {
    setName(source.name);
    setQuestion(source.content?.question || '');
    setAnswer(source.content?.answer || '');
  }, [source]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSource = { ...source };
    if (source.type === 'faq') {
        updatedSource.content = { question, answer };
        updatedSource.name = question;
    } else {
        updatedSource.name = name;
    }
    onSave(updatedSource);
  };

  const renderFormFields = () => {
    switch (source.type) {
      case 'file':
        return (
          <div>
            <label htmlFor="fileName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">File Name</label>
            <input
              type="text"
              id="fileName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm"
            />
          </div>
        );
      case 'url':
        return (
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">URL</label>
            <input
              type="url"
              id="url"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm"
            />
          </div>
        );
      case 'faq':
        return (
          <>
            <div>
              <label htmlFor="question" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Question</label>
              <textarea
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm"
              />
            </div>
            <div>
              <label htmlFor="answer" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Answer</label>
              <textarea
                id="answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm"
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Knowledge Source</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {renderFormFields()}
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
              Save Changes
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default EditKnowledgeModal;
