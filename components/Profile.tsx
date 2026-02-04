import React, { useState, useRef } from 'react';
import Card from './ui/Card';

type Tab = 'profile' | 'security';

const Profile: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('profile');
    
    // Profile state
    const [avatarPreview, setAvatarPreview] = useState('https://picsum.photos/100');
    const [profileName, setProfileName] = useState('Demo User');
    const [username, setUsername] = useState('demouser');
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // Security state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const renderProfileTab = () => (
        <Card>
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Profile Information</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Update your photo and personal details.</p>
            
            <form className="mt-6 space-y-6">
                 <div className="flex items-center space-x-5">
                    <div className="relative">
                        <img className="h-20 w-20 rounded-full" src={avatarPreview} alt="User avatar" />
                        <input type="file" ref={avatarInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
                    </div>
                    <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                    >
                        Change
                    </button>
                 </div>
                 <div>
                    <label htmlFor="profileName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Profile Name</label>
                    <input
                        type="text"
                        id="profileName"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                 <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>

                <div className="flex justify-end">
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Save Profile</button>
                </div>
            </form>
        </Card>
    );
    
    const renderSecurityTab = () => (
         <Card>
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Change Password</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Update your password for better security.</p>
            
            <form className="mt-6 space-y-6">
                <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Password</label>
                    <input
                        type="password"
                        id="currentPassword"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm"
                    />
                </div>
                <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                    <input
                        type="password"
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm"
                    />
                </div>
                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm"
                    />
                </div>
                 <div className="flex justify-end">
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Change Password</button>
                </div>
            </form>
        </Card>
    );

    return (
        <div className="max-w-3xl mx-auto">
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <nav className="flex -mb-px space-x-6">
                    <button onClick={() => setActiveTab('profile')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'profile' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Profile</button>
                    <button onClick={() => setActiveTab('security')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'security' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Security</button>
                </nav>
            </div>
            
            <div>
                {activeTab === 'profile' ? renderProfileTab() : renderSecurityTab()}
            </div>
        </div>
    );
};

export default Profile;
