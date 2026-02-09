
import React, { useState } from 'react';
import Card from './ui/Card';
import AddUserModal from './AddUserModal';
import type { User } from '../types';
import { upsertUser, deleteUser } from '../services/firestoreStore';

interface SettingsProps {
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const Settings: React.FC<SettingsProps> = ({ users, setUsers }) => {
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

    const handleAddUser = async (name: string, email: string, role: 'Admin' | 'Agent') => {
        const newUser: User = {
            id: Date.now().toString(),
            name,
            email,
            role,
            avatar: `https://picsum.photos/100/100?a=${Date.now()}`,
            status: 'pending'
        };

        // Optimistic UI
        setUsers(prev => [...prev, newUser]);
        setIsAddUserModalOpen(false);

        try {
            await upsertUser(newUser);
        } catch (err: any) {
            console.error('Failed to add user:', err);
            // rollback
            setUsers(prev => prev.filter(u => u.id !== newUser.id));
            alert(`Could not add user: ${err?.message || 'Unknown error'}`);
            return;
        }

        alert(`SUCCESS: Invite Created for ${email}\n\nNo email is sent yet in this MVP.\n\nTo test the user flow:\n1. Log out\n2. Click "Invited to the team?" on the login page\n3. Enter ${email} to set a password.`);
    };

    const handleResendInvite = (email: string) => {
        alert(`Invitation resent to ${email}. (Simulated)`);
    };

    const handleDeleteUser = async (userId: string) => {
        // Prevent deleting the seeded demo admin to avoid lockout
        if (userId === '1') {
            alert("You cannot remove the primary Admin account in this demo.");
            return;
        }

        const ok = window.confirm("Are you sure you want to remove this user? This action cannot be undone.");
        if (!ok) return;

        // Optimistic UI
        const before = users;
        setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));

        try {
            await deleteUser(userId);
        } catch (err: any) {
            console.error('Failed to delete user:', err);
            setUsers(before); // rollback
            alert(`Could not delete user: ${err?.message || 'Unknown error'}`);
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
                        className="px-4 py-2 text-sm font-extrabold rounded-lg btn-primary">
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
