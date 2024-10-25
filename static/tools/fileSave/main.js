import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"; // Added setDoc for saving to Firestore

// Firebase configuration (can be moved to a separate config file)
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

const saveDataContainer = document.getElementById('saveDataContainer');
const saveButton = document.getElementById('saveButton');

if (localStorage.getItem('user') == 'guest') {
    location.href = '/code/universalCode/toolDisabled.html?txt=Save%20Data%20Retrival%20is%20disabled%20for%20Guests.%20Please%20request%20a%20real%20account%20to%20use%20this%20tool.'
}
// Function to get save data from Firestore
async function getSaveData(username) {
    try {
        const saveDataRef = doc(firestore, 'data', 'saveData');
        const saveDataDoc = await getDoc(saveDataRef);

        if (saveDataDoc.exists()) {
            const saveData = saveDataDoc.data();
            const userSaveData = saveData?.[username];

            if (userSaveData) {
                saveDataContainer.innerHTML = `<p>Save data for ${username} successfully received.</p>`;
                return userSaveData;
            } else {
                saveDataContainer.innerHTML = `<p>No save data found for ${username}</p>`;
            }
        } else {
            saveDataContainer.innerHTML = `<p>No save data document exists</p>`;
        }
    } catch (error) {
        console.error('Error fetching save data document:', error);
        saveDataContainer.innerHTML = `<p>Error retrieving data. Please try again later.</p>`;
    }
}
function loadSave(saveData){
    saveData.forEach(element => {
        let key;
        let val;
        localStorage.setItem(key, val)
    });
}
// Get username and retrieve save data
const user = localStorage.getItem('user');
let save;
if (user) {
    save = getSaveData(user);
} else {
    saveDataContainer.innerHTML = `<p>No username found</p>`;
}

saveButton.addEventListener('click', saveData, save);
