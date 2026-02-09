// FILE: services/firebase.ts
import { initializeApp, getApp, getApps } from "firebase/app";
import { browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyASjg-A16X3mbGDiIHhq7QLxgf7Gzi9MOw",
    authDomain: "legal-practice-council-agents.firebaseapp.com",
    projectId: "legal-practice-council-agents",
    storageBucket: "legal-practice-council-agents.firebasestorage.app",
    messagingSenderId: "721264216936",
    appId: "1:721264216936:web:eb44b1c299d8962648e4dd",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
// Ensure auth persists across reloads (prevents "keeps logging me out" behavior during dev)
setPersistence(auth, browserLocalPersistence).catch(() => {
  // ignore (e.g. in some restricted environments)
});
export const db = getFirestore(firebaseApp);
