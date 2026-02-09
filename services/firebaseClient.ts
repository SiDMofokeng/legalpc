// services/firebaseClient.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyASjg-A16X3mbGDiIHhq7QLxgf7Gzi9MOw",
    authDomain: "legal-practice-council-agents.firebaseapp.com",
    projectId: "legal-practice-council-agents",
    storageBucket: "legal-practice-council-agents.firebasestorage.app",
    messagingSenderId: "721264216936",
    appId: "1:721264216936:web:eb44b1c299d8962648e4dd",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
