// FILE: services/firebase.ts
import { initializeApp, getApp, getApps } from "firebase/app";
import { browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app"

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCUkF-rh90sh99AZ6E4SGnGr6-Y4qxS4zE",
  authDomain: "legalpc-d90ec.firebaseapp.com",
  projectId: "legalpc-d90ec",
  storageBucket: "legalpc-d90ec.firebasestorage.app",
  messagingSenderId: "46083917692",
  appId: "1:46083917692:web:5022bd26b4ddbf56da46f9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
setPersistence(auth, browserLocalPersistence).catch(() => { });

export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);

