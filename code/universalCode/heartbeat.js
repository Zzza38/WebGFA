import { getCipherInfo } from "crypto";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, updateDoc, deleteField } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"; // Import Firestore modules

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

async function heartbeat(){
    if (localStorage.getItem('isHeartbeat') && localStorage.getItem('hbUID') !== sessionStorage.getItem('hbUID')) return;
    localStorage.setItem('isHeartbeat', true);
    sessionStorage.setItem('hbUID', Math.round(Math.random * 1e7));
    localStorage.setItem('hbUID', sessionStorage.getItem('hbUID'));
    // Firebase Code
    const docRef = doc(firestore, 'users', 'heartbeat');
    let doc = await getDoc(docRef);
    doc = doc.data();
    doc.exists() ? doc[getCookie('user')] = Date.now() / 1000 : null;
    setDoc(docRef, doc)
    
}
setInterval(heartbeat, 60000)
window.addEventListener('beforeunload', function(event) {
    // Set something in localStorage
    if (localStorage.getItem('isHeartbeat') && localStorage.getItem('hbUID') !== sessionStorage.getItem('hbUID')) return;
    localStorage.setItem('isHeartbeat', false);
    localStorage.setItem('hbUID', -1);

    // Optionally, you can prompt the user with a confirmation dialog
    // Uncomment the line below to see this in action
    // event.returnValue = "Are you sure you want to leave?";
});
