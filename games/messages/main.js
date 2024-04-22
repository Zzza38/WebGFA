import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"; // Import Firestore modules

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAMOJV2z02dLtMb8X1uWDGkDx6ysrzBcUo",
    authDomain: "webgfa-games.firebaseapp.com",
    projectId: "webgfa-games",
    storageBucket: "webgfa-games.appspot.com",
    messagingSenderId: "553239008504",
    appId: "1:553239008504:web:b91fba77cf0f131849170d",
    measurementId: "G-5W79NYJZ11"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

window.firestore = firestore;
window.doc = doc;
window.getDoc = getDoc;
window.setDoc = setDoc;
window.onSnapshot = onSnapshot;
window.app = app;

// Check for service worker support
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
    .then(function(registration) {
        console.log('Service Worker registered with scope:', registration.scope);

        // Request notification permission
        Notification.requestPermission();

    })
    .catch(function(error) {
        console.error('Service Worker registration failed:', error);
    });
}
