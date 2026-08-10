// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBPuJp_fsbUFKeYvEV8OEmIBGM_3rHfxm0",
  authDomain: "gasguard-89aac.firebaseapp.com",
  databaseURL: "https://gasguard-89aac-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gasguard-89aac",
  storageBucket: "gasguard-89aac.firebasestorage.app",
  messagingSenderId: "477887944563",
  appId: "1:477887944563:web:a314c526b5705f2e399706"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and EXPORT it as 'db'
export const db = getDatabase(app);