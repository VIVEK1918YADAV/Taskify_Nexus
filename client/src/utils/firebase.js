// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_APP_FIREBASE_API_KEY,
  authDomain: "newtaskmanager-66619.firebaseapp.com",
  projectId: "newtaskmanager-66619",
  storageBucket: "newtaskmanager-66619.firebasestorage.app",
  messagingSenderId: "282987112160",
  appId: "1:282987112160:web:22adc7003d2eac83591285"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
