
import React, { useState } from 'react';
import Card from './ui/Card';
import AddUserModal from './AddUserModal';
import InviteResultModal from './InviteResultModal';
import type { User } from '../types';
import { deleteUser } from '../services/firestoreStore';
import { createInvite } from '../services/inviteService';

interface SettingsProps {
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const Settings: React.FC<SettingsProps> = ({ users, setUsers }) => {
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [inviteResult, setInviteResult] = useState<null | {
        ok: boolean;
        email?: string;
        role?: string;
        code?: string;
        error?: string;
    }>(null);

    const handleAddUser = async (name: string, email: string, role: 'Admin' | 'Agent') => {
        // No dummy/local users. Create a real invite code via Cloud Function.
        setIsAddUserModalOpen(false);

        try {
            const { code } = await createInvite({ name, email, role });
            setInviteResult({ ok: true, email, role, code });
        } catch (err: any) {
            console.error('Failed to create invite:', err);
            setInviteResult({ ok: false, error: err?.message || 'Could not create invite.' });
        }
    };

    const handleResendInvite = (email: string) => {
        alert(`Invitation resent to ${email}. (Simulated)`);
    };

    const handleDeleteUser = async (userId: string) => {
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
                                            <button onClick={() => handleResendInvite(user.email)} className="link-accent">Resend Invite</button>
                                        )}
                                         <button 
                                            onClick={() => handleDeleteUser(user.id)} 
                                            className="text-red-500 hover:text-red-700">
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Card>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">API Settings</h3>
                <p className="text-gray-600 dark:text-gray-400">API keys and integration settings would be managed here.</p>
            </Card>
        </div>

        <AddUserModal
            isOpen={isAddUserModalOpen}
            onClose={() => setIsAddUserModalOpen(false)}
            onAddUser={handleAddUser}
        />

        <InviteResultModal
            isOpen={Boolean(inviteResult)}
            title={inviteResult?.ok ? 'Invite Created' : 'Invite Failed'}
            message={inviteResult?.ok ? 'Share this login code with the user to onboard them.' : inviteResult?.error}
            email={inviteResult?.email}
            role={inviteResult?.role}
            code={inviteResult?.code}
            onClose={() => setInviteResult(null)}
        />
        </>
    );
};

export default Settings;
