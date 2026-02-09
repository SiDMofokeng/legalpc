// components/AuthGate.tsx
import React, { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../services/firebase";

type Props = {
    children: (user: User) => React.ReactNode;
    fallback: React.ReactNode;
};

const AuthGate: React.FC<Props> = ({ children, fallback }) => {
    const [user, setUser] = useState<User | null>(null);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setChecking(false);
        });

        return () => unsub();
    }, []);

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                <div className="text-gray-700 dark:text-gray-200 text-sm">
                    Checking session...
                </div>
            </div>
        );
    }

    if (!user) return <>{fallback}</>;

    return <>{children(user)}</>;
};

export default AuthGate;
