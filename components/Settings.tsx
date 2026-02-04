
import React, { useState } from 'react';
import Card from './ui/Card';
import AddUserModal from './AddUserModal';
import type { User } from '../types';

interface SettingsProps {
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const Settings: React.FC<SettingsProps> = ({ users, setUsers }) => {
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

    const handleAddUser = (name: string, email: string, role: 'Admin' | 'Agent') => {
        const newUser: User = {
            id: Date.now().toString(),
            name,
            email,
            role,
            avatar: `https://picsum.photos/100/100?a=${Date.now()}`,
            status: 'pending'
        };
        setUsers(prev => [...prev, newUser]);
        setIsAddUserModalOpen(false);
        // Explicitly explain the demo nature and provide clear instructions
        alert(`SUCCESS: Simulated Invite Sent to ${email}\n\nSince this is a demo environment, no actual email was sent.\n\nTo test the user flow:\n1. Log out\n2. Click "Invited to the team?" on the login page\n3. Enter ${email} to set a password.`);
    };

    const handleResendInvite = (email: string) => {
        alert(`Invitation resent to ${email}. (Simulated)`);
    };

    const handleDeleteUser = (userId: string) => {
        // Prevent deleting the main demo admin to avoid lockout
        if (userId === '1') {
            alert("You cannot remove the primary Admin account in this demo.");
            return;
        }

        if (window.confirm("Are you sure you want to remove this user? This action cannot be undone.")) {
            // Ensure we are filtering based on the exact ID and creating a new array reference
            setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
        }
    };

    return (
        <>
        <div className="space-y-6">
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">User Management</h3>
                    <button 
                        onClick={() => setIsAddUserModalOpen(true)}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                        + Add User
                    </button>
                </div>
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <img className="h-10 w-10 rounded-full" src={user.avatar} alt="" />
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'Admin' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                                        {user.status === 'pending' && (
                                            <button onClick={() => handleResendInvite(user.email)} className="text-blue-600 hover:text-blue-900">Resend Invite</button>
                                        )}
                                        {user.id !== '1' ? (
                                             <button 
                                                onClick={() => handleDeleteUser(user.id)} 
                                                className="text-red-600 hover:text-red-900"
                                                title="Remove user"
                                            >
                                                Remove
                                            </button>
                                        ) : (
                                            <span className="text-gray-400 cursor-not-allowed" title="Cannot remove admin">Remove</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Other settings cards can go here */}
            <Card>
                 <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4">API Settings</h3>
                 <p className="text-gray-600 dark:text-gray-400">API keys and integration settings would be managed here.</p>
            </Card>
        </div>

        {isAddUserModalOpen && (
            <AddUserModal
                onClose={() => setIsAddUserModalOpen(false)}
                onAddUser={handleAddUser}
            />
        )}
        </>
    );
};

export default Settings;
