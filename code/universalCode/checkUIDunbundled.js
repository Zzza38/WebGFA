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

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

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
    let whitelistedUIDs = document[getCookie('user')].split(',');
    if (!whitelistedUIDs) {
        whitelistedUIDs[0] = UID;
        setDoc(docRef, {
            [getCookie('user')]: UID
        }, merge = true);
    }
    let lockdown = !whitelistedUIDs.includes(UID);
    if (lockdown) {
        setDoc(doc(firestore, 'users', 'lockdown'), {
            [getCookie('user')]: true
        }, merge = true);
    }
    
    
}

checkUID();
