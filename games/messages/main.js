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
let lastDoc = await getDoc(docRef);
lastDoc = lastDoc.data();

function changedField(oldData, newData) {
    let changes = {};

    // Check for new or changed fields in newData
    for (const [key, value] of Object.entries(newData)) {
        if (!oldData.hasOwnProperty(key)) {
            changes[key] = value;
        }
        if (oldData[key] !== value) {
            changes[key] = value + '|~';
        }
    }

    // Check if any field was removed in the newData (optional)
    for (const key of Object.keys(oldData)) {
        if (!newData.hasOwnProperty(key)) {
            changes[key] = "removed|~";
            // If you prefer to ignore removed fields, you can skip this part
        }
    }

    return Object.keys(changes).length > 0 ? changes : null;
}
// Listen for document updates
function sendNotification(title, desc, iconURL) {
        // Send a message to your service worker to show a notification
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                action: 'showNotification',
                title: title,
                body: desc,
                icon: iconURL
            });
        }
}

onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
        console.log("Current data: ", doc.data());
        let message;
        try{
        message = String(changedField(lastDoc, doc.data())[0]);
        } catch {
            
        }
        lastDoc = doc.data();
        if (message.endsWith('|~')) {
            if (message == 'removed|~') {
                sendNotification('A message in ' + docName + ' was removed.', null, 'https://webgfa.com/favicon.ico')
            } else {
                sendNotification('A message in ' + docName + ' was edited.', message, 'https://webgfa.com/favicon.ico')
            }
        } else {
            sendNotification('New Message in ' + docName, message, 'https://webgfa.com/favicon.ico')
        }


    } else {
        // doc.data() will be undefined in this case
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
