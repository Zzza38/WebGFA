import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

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

async function checkUID() {
    let UID = localStorage.getItem('UID');
    if (!UID) {
        UID = Math.round(Math.random() * 1e7).toString();
        localStorage.setItem('UID', UID);
    }

    const user = localStorage.getItem('user');
    if (user == 'guest' || user == 'zion') {
        return;
    }
    try {
        // Firestore references
        const whitelistDocRef = doc(firestore, 'users', 'whitelistedUIDs');
        const lockdownDocRef = doc(firestore, 'users', 'lockdown');

        // Fetch the whitelisted UIDs document
        const whitelistDocSnapshot = await getDoc(whitelistDocRef);
        let whitelistedUIDs = [];

        if (whitelistDocSnapshot.exists()) {
            const documentData = whitelistDocSnapshot.data();
            const userUIDs = documentData[user];

            // Check if userUIDs is an array
            if (Array.isArray(userUIDs)) {
                whitelistedUIDs = userUIDs;
            } else {
                console.error("Expected an array but got:", typeof userUIDs, userUIDs);
            }
        }

        if (whitelistedUIDs.length === 0) {
            // Add UID if no UIDs are present
            console.log("No UIDs in Firestore, adding UID.");
            whitelistedUIDs.push(UID);
            await setDoc(whitelistDocRef, {
                [user]: whitelistedUIDs
            }, { merge: true });
            sessionStorage.setItem('lockdown', 'false');
        } else if (!whitelistedUIDs.includes(UID)) {
            // Set lockdown if UID does not exist and there are other UIDs
            console.log("UID does not exist in Firestore, setting lockdown.");
            sessionStorage.setItem('lockdown', 'true');
            await setDoc(lockdownDocRef, {
                [user]: true
            }, { merge: true });
            window.location.href = "/code/universalCode/lockdown.html"
        } else {
            // No lockdown if UID exists
            sessionStorage.setItem('lockdown', 'false');
        }
    } catch (error) {
        console.error("Error interacting with Firestore:", error);
    }
}

checkUID();
