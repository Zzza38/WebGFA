import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, updateDoc, deleteField } from "firebase/firestore"; // Import Firestore modules

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

async function checkUID(){
    let UID = localStorage.getItem('UID');
    if (!UID) {
        localStorage.setItem('UID') = Math.round(Math.random * 1e7);
        UID = localStorage.getItem('UID');
    }
    // Firebase Code
    const docRef = doc(firestore, 'users', 'whitelistedUIDs');
    let document = await getDoc(docRef);
    document = document.data();
    let whitelistedUIDs = document[localStorage.getItem('user')].split(',');
    if (!whitelistedUIDs) {
        whitelistedUIDs = [];
        whitelistedUIDs[0] = UID;
        setDoc(docRef, {
            [localStorage.getItem('user')]: whitelistedUIDs
        }, merge = true);
    }
    let lockdown = !whitelistedUIDs.includes(UID);
    if (lockdown) {
        sessionStorage.setItem('lockdown', true)
        setDoc(doc(firestore, 'users', 'lockdown'), {
            [localStorage.getItem('user')]: true
        }, merge = true);
    }
    
    
}

checkUID();
