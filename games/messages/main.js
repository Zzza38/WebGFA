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

// Assuming this script is part of your main web app's scripts
// and the Firebase setup code you provided is included before this script

// Reference a document
const docRef = doc(firestore, 'messages', 'test');

// Listen for document updates
onSnapshot(docRef, (docSnapshot) => {
    if (docSnapshot.exists()) {
        console.log("Current data:", docSnapshot.data());
        // Extract information you want to send in the notification
        const data = docSnapshot.data();
        const title = 'Document Updated';
        const body = `Updated Data: ${JSON.stringify(data)}`;
        // Send a message to your service worker to show a notification
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                action: 'showNotification',
                title: title,
                body: body,
                icon: 'https://webgfa.com/favicon.ico'
            });
        }
    } else {
        console.log("No such document!");
    }
});

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
