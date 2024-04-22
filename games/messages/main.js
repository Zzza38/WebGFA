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
const docName = 'test';
const docRef = doc(firestore, 'messages', docName);
let lastDoc = await getDoc(docRef);
lastDoc = lastDoc.data();

function changedField(oldData, newData) {
    let changes = {};

    // Check for new or changed fields in newData
    for (const [key, value] of Object.entries(newData)) {
        if (!oldData.hasOwnProperty(key)) {
            changes[key] = value;
            continue;
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
        let sender;
        try{
        sender = String(Object.keys(changedField(lastDoc, doc.data()))[0]).slice(0,-4);
        message = String(Object.values(changedField(lastDoc, doc.data()))[0]);
        console.log(lastDoc);
        console.log(doc.data());
        console.log(changedField(lastDoc, doc.data()));
        console.log(message);
        lastDoc = doc.data();
        if (message.endsWith('|~')) {
            if (message == 'removed|~') {
                console.log('message removed');
                sendNotification(sender + ' removed a message in ' + docName, '', 'https://webgfa.com/favicon.ico')
            } else {
                console.log('message edited');
                sendNotification(sender + ' edited a message in  ' + docName , message.slice(0,-2), 'https://webgfa.com/favicon.ico')
            }
        } else {
            console.log('message sent');
            sendNotification(sender + ' sent a message in ' + docName, message, 'https://webgfa.com/favicon.ico')
        }
    } catch{}

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
