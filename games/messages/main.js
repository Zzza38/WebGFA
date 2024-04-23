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
const timestampRef = doc(firestore, 'messageTimestamps', docName)
const myUser = 'zion';
let lastDoc = await getDoc(docRef);
let timestampDoc = await getDoc(timestampRef);
lastDoc = lastDoc.data();
timestampDoc = timestampDoc.data();
const now = new Date();

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
function updateHTML(doc) {
    let container = document.getElementById('messageContainer');
    container.innerHTML = '';  // Clear previous contents

    // Combine doc and timestampDoc into an array of objects to facilitate sorting
    let messages = Object.keys(doc).map(key => {
        return {
            sender: key,
            message: doc[key],
            timestamp: timestampDoc[key]
        };
    });

    // Sort messages by timestamp
    messages.sort((a, b) => a.timestamp - b.timestamp);

    for (const message of messages) {
        let messageDiv = document.createElement('div');
        let senderDiv = document.createElement('div');
        senderDiv.innerText = message.sender.slice(0, -4); // Assuming name is up to last 4 digits
        senderDiv.id = 'whoSent';
        messageDiv.innerText = message.message;

        if (message.sender.slice(0, -4) == myUser) {
            messageDiv.id = 'messageSent';
        } else {
            messageDiv.id = 'messageReceived';
            container.appendChild(senderDiv);
        }

        container.appendChild(messageDiv);
    }

    // Add input and submit elements
    let input = document.createElement('input');
    input.id = 'input';
    container.appendChild(input);
    
    let submit = document.createElement('button');
    submit.id = 'submit';
    let img = document.createElement('img');
    img.src = 'image.png';
    img.style = 'width: 16px; height: 16px;';
    submit.appendChild(img);
    container.appendChild(submit);
}
function generateID() {
    // Generate a random number between 0 and 9999
    const randomNumber = Math.round(Math.random() * 9999);

    // Convert the number to a string and pad with zeros if necessary to ensure it is always four digits
    const fourDigitNumber = randomNumber.toString().padStart(4, '0');

    return fourDigitNumber;
}

function capitalizeWords(str) {
    return str.replace(/\b\w/g, char => char.toUpperCase());
 }
 async function addField(collection, docId, fieldName, fieldValue) {
    const docRef = doc(firestore, collection, docId);
    try {
      await setDoc(docRef, {
        [fieldName]: fieldValue  // Replace 'newFieldName' and 'newValue' with your field name and value
      }, { merge: true });
      console.log("Field added or updated successfully");
    } catch (error) {
      console.error("Error adding or updating field: ", error);
    }
  }
function sendMessage(){
    console.log('Send Message button clicked, value = ' + document.getElementById('input').value);
    let message = document.getElementById('input').value;
    if (message === '') return;
    console.log('Non-null message will be added... ' + message)
    addField('messageTimestamps', docName, myUser + generateID(), now.getUTCSeconds);
    addField('messages', docName, myUser + generateID(), message);
}
window.sendMessage = sendMessage();
updateHTML(lastDoc);
document.getElementById('submit').addEventListener('click', sendMessage())
onSnapshot(docRef, async (doc) => {
    if (doc.exists()) {
        console.log("Current data: ", doc.data());
        let message;
        let sender;
        try {
            timestampDoc = await getDoc(timestampRef);
            timestampDoc = timestampDoc.data();
            updateHTML(doc.data());
            sender = String(Object.keys(changedField(lastDoc, doc.data()))[0]).slice(0, -4);
            sender = capitalizeWords(sender);
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
                    sendNotification(sender + ' edited a message in  ' + docName, message.slice(0, -2), 'https://webgfa.com/favicon.ico')
                }
            } else {
                console.log('message sent');
                sendNotification(sender + ' sent a message in ' + docName, message, 'https://webgfa.com/favicon.ico')
            }
        } catch(e){
            console.error(e);
         }

    } else {
        // doc.data() will be undefined in this case
        console.log("No such document!");
    }
});

// Check for service worker support
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
        .then(function (registration) {
            console.log('Service Worker registered with scope:', registration.scope);

            // Request notification permission
            Notification.requestPermission();

        })
        .catch(function (error) {
            console.error('Service Worker registration failed:', error);
        });
}
