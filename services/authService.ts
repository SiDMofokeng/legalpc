// services/authService.ts
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
    onAuthStateChanged,
    type User,
} from "firebase/auth";
import { auth } from "./firebase";


export function watchAuth(cb: (user: User | null) => void) {
    return onAuthStateChanged(auth, cb);
}

export async function login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const cred = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    return cred.user;
}

export async function register(email: string, password: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return cred.user;
}

export async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
}

export async function logout(): Promise<void> {
    await signOut(auth);
}
