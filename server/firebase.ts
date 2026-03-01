// src/firebase.ts (or src/firebase.js)

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// We will add Storage here since you are using it.
import { getStorage } from "firebase/storage"; // Import Storage SDK

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD06Y9ZuiCIlQI2xrhQrrM26HHElAaG2Zw",
    authDomain: "guardian-70e85.firebaseapp.com",
    projectId: "guardian-70e85",
    storageBucket: "guardian-70e85.firebasestorage.app",
    messagingSenderId: "714695027976",
    appId: "1:714695027976:web:f62d0b3dcab3793741d0bd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the Storage service
export const storage = getStorage(app);

// You can now use the 'storage' object in other parts of your app
// e.g., to upload or download files.
