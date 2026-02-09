import React, { useEffect, useRef, useState } from 'react';
import Card from './ui/Card';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getAccountProfile, upsertAccountProfile } from '../services/firestoreStore';

type Tab = 'profile' | 'security';

const Profile: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('profile');

    // Profile state
    const [avatarPreview, setAvatarPreview] = useState(auth.currentUser?.photoURL || 'https://picsum.photos/100');
    const [profileName, setProfileName] = useState(auth.currentUser?.displayName || auth.currentUser?.email || '');
    const [username, setUsername] = useState(auth.currentUser?.email ? auth.currentUser.email.split('@')[0] : '');

    // Prevent async profile load from overwriting user edits
    const [dirty, setDirty] = useState({ name: false, username: false, avatar: false });
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const [loadingProfile, setLoadingProfile] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);

    // Security state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                setLoadingProfile(true);
                const p = await getAccountProfile();
                if (cancelled) return;

                const fallbackName = auth.currentUser?.displayName || auth.currentUser?.email || '';

                if (!dirty.name) setProfileName(p?.displayName || fallbackName);
                if (!dirty.username) setUsername(p?.username || (auth.currentUser?.email ? auth.currentUser.email.split('@')[0] : ''));
                if (!dirty.avatar && p?.avatarDataUrl) setAvatarPreview(p.avatarDataUrl);
            } catch (err) {
                console.error('Failed to load profile:', err);
                const fallbackName = auth.currentUser?.displayName || auth.currentUser?.email || '';
                if (!dirty.name) setProfileName(fallbackName);
                if (!dirty.username) setUsername(auth.currentUser?.email ? auth.currentUser.email.split('@')[0] : '');
            } finally {
                if (!cancelled) setLoadingProfile(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDirty((d) => ({ ...d, avatar: true }));
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result as string;
            // Firestore document limit is 1MB. Keep this conservative.
            if (dataUrl && dataUrl.length > 250_000) {
                alert('That image is too large to store as a profile avatar right now. Please use a smaller image.');
                return;
            }
            setAvatarPreview(dataUrl);
        };
        reader.readAsDataURL(file);
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (savingProfile) return;

        try {
            setSavingProfile(true);
            const displayName = profileName.trim();
            const avatarUrl = avatarPreview;

            await upsertAccountProfile({
                displayName,
                username: username.trim(),
                avatarDataUrl: avatarUrl,
            });

            // Best-effort: keep Firebase Auth profile aligned (optional)
            if (auth.currentUser) {
                try {
                    await updateProfile(auth.currentUser, {
                        displayName,
                        photoURL: avatarUrl,
                    });
                } catch {
                    // ignore; Firestore is our source of truth for portal UI
                }
            }

            window.dispatchEvent(new CustomEvent('lpc_profile_updated', { detail: { displayName, avatarUrl } }));
            setDirty({ name: false, username: false, avatar: false });
            alert('Profile saved');
        } catch (err: any) {
            console.error('Save profile failed:', err);
            alert(`Save profile failed: ${err?.message || 'Unknown error'}`);
        } finally {
            setSavingProfile(false);
        }
    };

    const renderProfileTab = () => (
        <Card>
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Profile Information</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Update your photo and personal details.</p>
            
            <form className="mt-6 space-y-6" onSubmit={handleSaveProfile}>
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
                        onChange={(e) => {
                            setDirty((d) => ({ ...d, name: true }));
                            setProfileName(e.target.value);
                        }}
                        disabled={loadingProfile}
                        className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                 <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => {
                            setDirty((d) => ({ ...d, username: true }));
                            setUsername(e.target.value);
                        }}
                        disabled={loadingProfile}
                        className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={loadingProfile || savingProfile}
                        className="px-4 py-2 text-sm font-extrabold rounded-lg btn-primary disabled:opacity-50"
                    >
                        {savingProfile ? 'Saving…' : 'Save Profile'}
                    </button>
                </div>
            </form>
        </Card>
    );
    
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (changingPassword) return;

        if (!currentPassword || !newPassword) {
            alert('Please fill in all password fields.');
            return;
        }
        if (newPassword !== confirmPassword) {
            alert('New password and confirmation do not match.');
            return;
        }
        if (newPassword.length < 8) {
            alert('New password must be at least 8 characters.');
            return;
        }

        const user = auth.currentUser;
        if (!user || !user.email) {
            alert('You are not logged in.');
            return;
        }

        try {
            setChangingPassword(true);

            // Re-authenticate (required by Firebase for sensitive actions)
            const cred = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, cred);

            await updatePassword(user, newPassword);

            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');

            alert('Password updated');
        } catch (err: any) {
            console.error('Change password failed:', err);
            alert(`Change password failed: ${err?.message || 'Unknown error'}`);
        } finally {
            setChangingPassword(false);
        }
    };

    const renderSecurityTab = () => (
         <Card>
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Change Password</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Update your password for better security.</p>
            
            <form className="mt-6 space-y-6" onSubmit={handleChangePassword}>
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
                    <button
                        type="submit"
                        disabled={changingPassword}
                        className="px-4 py-2 text-sm font-extrabold rounded-lg btn-primary disabled:opacity-50"
                    >
                        {changingPassword ? 'Changing…' : 'Change Password'}
                    </button>
                </div>
            </form>
        </Card>
    );

    return (
        <div className="max-w-3xl mx-auto">
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <nav className="flex -mb-px space-x-6">
                    <button onClick={() => setActiveTab('profile')} className={`py-4 px-1 border-b-2 font-extrabold text-sm ${activeTab === 'profile' ? 'border-lpc-gold text-lpc-forest' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Profile</button>
                    <button onClick={() => setActiveTab('security')} className={`py-4 px-1 border-b-2 font-extrabold text-sm ${activeTab === 'security' ? 'border-lpc-gold text-lpc-forest' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Security</button>
                </nav>
            </div>
            
            <div>
                {activeTab === 'profile' ? renderProfileTab() : renderSecurityTab()}
            </div>
        </div>
    );
};

export default Profile;
