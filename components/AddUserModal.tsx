
import React, { useState } from 'react';
import Card from './ui/Card';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddUser: (name: string, email: string, role: 'Admin' | 'Agent') => void;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onAddUser }) => {
  if (!isOpen) return null;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Admin' | 'Agent'>('Agent');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email) {
      onAddUser(name, email, role);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm lpc-focus sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm lpc-focus sm:text-sm"
            />
          </div>
           <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
            <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'Admin' | 'Agent')}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 lpc-focus sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
                <option>Agent</option>
                <option>Admin</option>
            </select>
          </div>
          <div className="bg-[#F2B233]/10 p-3 rounded-md mt-4 ring-1 ring-[#F2B233]/20">
             <p className="text-xs text-[#0B0F14]/80">
               <strong>Note:</strong> This creates a login code for the user to accept via “Invited to the team?” on the login screen.
             </p>
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
              Add User
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AddUserModal;
