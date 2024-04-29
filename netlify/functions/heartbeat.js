// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, updateDoc, deleteField } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"; // Import Firestore modules
//replace with npm + node.js

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

let minTime = 60; // Minium amount of time in seconds to wait before a user is considered to be active on two accounts.
let maxTime = 120; // Maxium amount of time before a user is con
let docRef = doc(firestore, 'users', 'heartbeat');
let lockdownRef = doc(firestore, 'users', 'lockdown');
let lastDoc = await getDoc(docRef);
lastDoc = lastDoc.data();
onSnapshot(docRef, async (hbDoc) => {
    if (hbDoc.exists()) {
        let doc = hbDoc.data();
        let changes = changedField(lastDoc, doc);
        changes = Object.keys(changes).map(key => {
            // Check if the string ends with '|~|'
            const isOldUser = !doc[key].endsWith('|~|');

            return {
                user: key,
                // Using ternary operator to decide the values based on `isOldUser` flag
                oldTimestamp: isOldUser ? doc[key].split('~')[1] : 'newUser',
                newTimestamp: isOldUser ? doc[key].split('~')[0] : doc[key].slice(0, -3),
            };
        });
        let timeSinceUpdate = {};
        let i = 0;
        changes.user.forEach(elem => {
            if (changes.oldTimestamp[elem] != 'newUser') {
                userLastOnline[i] = changes.newTimestamp[elem] - changes.oldTimestamp[elem];

            } else {
                userLastOnline[i] = minTime;
            }
            i++;
        });
        i = 0;
        timeSinceUpdate.forEach(async time => {
            if (time < minTime) {
                changeField('users', 'lockdown', changes.user[i], 'true')
            } else if (time > maxTime) {
                let activeRef = doc(firestore, 'users', 'activeUsers');
                let activeDoc = await getDoc(activeRef);
                let usercount = activeDoc.exists() ? activeDoc[changes.user[i]] : 0;
                changeField('users', 'activeUsers', changes.user[i], usercount + 1)
            }
            i++;
        });

        lastDoc = doc;
    }
});
function changedField(oldData, newData) {
    let changes = {};

    // Check for new or changed fields in newData
    for (const [key, value] of Object.entries(newData)) {
        if (!oldData.hasOwnProperty(key)) {
            changes[key] = value + '|~|';
            continue;
        }
        if (oldData[key] !== value) {
            changes[key] = value + '~' + oldData[key];
        }
    }
    return Object.keys(changes).length > 0 ? changes : null;
}
async function changeField(collection, docId, fieldName, fieldValue) {
    console.log()
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
async function checkClosedUsers() {
    let hbDoc = await getDoc(docRef);
    let doc = hbDoc.data();
    userData = Object.keys(changes).map(key => {
        // Check if the string ends with '|~|'
        return {
            user: key,
            // Using ternary operator to decide the values based on `isOldUser` flag
            lastUpdate: doc[key]
        };
    });
    let timeSinceUpdate = {};
    let i = 0;
    changes.user.forEach(elem => {
        userLastOnline[i] = Date.now() / 1000 - changes.oldTimestamp[elem];
        i++;
    });
    i = 0;
    timeSinceUpdate.forEach(async time => {
        if (time > maxTime) {
            let activeRef = doc(firestore, 'users', 'activeUsers');
            let activeDoc = await getDoc(activeRef);
            let usercount = activeDoc.exists() ? activeDoc[changes.user[i]] : 0;
            changeField('users', 'activeUsers', changes.user[i], usercount - 1)
        }
        i++;
    });
    lastDoc = doc;
}
setInterval(checkClosedUsers, minTime * 1000); // this NEEDS to run or else the usercount never goes down