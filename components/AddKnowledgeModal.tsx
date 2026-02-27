// components/AddKnowledgeModal.tsx
import React, { useState } from 'react';
import Card from './ui/Card';
import { ref as storageRef, uploadBytes } from "firebase/storage";
import { storage } from "../services/firebase";

type SourceType = 'file' | 'url' | 'faq';

interface AddKnowledgeModalProps {
  type: SourceType;
  onClose: () => void;
  onAdd: (data: {
    name: string;
    content?: any;
  }) => void;
}

const AddKnowledgeModal: React.FC<AddKnowledgeModalProps> = ({ type, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [fileObj, setFileObj] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (type === "faq") {
      if (question && answer) onAdd({ name: question, content: { question, answer } });
      return;
    }

    if (type === "url") {
      if (!name) return;
      onAdd({ name, content: { url: name } });
      return;
    }

    console.log("ADD_SOURCE submit", { type, name, hasFile: !!fileObj, fileObj });

    // file
    if (type === "file") {
      if (!fileObj) return;

      // store under knowledgeUploads/<timestamp>-<filename>
      const safeName = fileObj.name.replace(/[^\w.\-]+/g, "_");
      const path = `knowledgeUploads/${Date.now()}-${safeName}`;

      const sref = storageRef(storage, path);
      await uploadBytes(sref, fileObj, { contentType: fileObj.type || "application/octet-stream" });

      onAdd({
        name: fileObj.name,
        content: {
          storagePath: path,
          fileName: fileObj.name,
          mimeType: fileObj.type || null,
        },
      });
      return;
    }
  };


  const titleMap: Record<SourceType, string> = {
    file: 'Add New File Source',
    url: 'Add New URL Source',
    faq: 'Add New FAQ',
  }

  const renderFormFields = () => {
    switch (type) {
      case 'file':
        return (
          <div>
            <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Upload File</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex text-sm text-gray-600 dark:text-gray-400">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                    <span>Upload a file</span>

                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setFileObj(f);
                        setName(f?.name || "");
                      }}
                    />

                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500">PDF, DOCX, TXT up to 10MB</p>
                {name && <p className="text-sm text-green-600 dark:text-green-400 pt-2">Selected: {name}</p>}
              </div>
            </div>
          </div>
        );
      case 'url':
        return (
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Website URL
            </label>
            <input
              type="url"
              id="url"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm"
              placeholder="https://example.com/info"
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
                rows={3}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm"
                placeholder="e.g., What are your business hours?"
              />
            </div>
            <div>
              <label htmlFor="answer" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Answer</label>
              <textarea
                id="answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                required
                rows={4}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm"
                placeholder="e.g., Our support team is available 24/7."
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
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{titleMap[type]}</h2>
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
              Add Source
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AddKnowledgeModal;
