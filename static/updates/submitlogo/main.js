import { initializeApp } from "firebase/app";
import { doc, getFirestore, setDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAMOJV2z02dLtMb8X1uWDGkDx6ysrzBcUo",
    authDomain: "webgfa-games.firebaseapp.com",
    databaseURL: "https://webgfa-games-default-rtdb.firebaseio.com",
    projectId: "webgfa-games",
    storageBucket: "webgfa-games.appspot.com",
    messagingSenderId: "553239008504",
    appId: "1:553239008504:web:b91fba77cf0f131849170d",
    measurementId: "G-5W79NYJZ11"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const db = getFirestore(app);

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(';').shift();
    }
}


function uploadFile() {
    const fileInput = document.getElementById('image');
    const file = fileInput.files[0]; // use the first file from the file input
    const storageRef = ref(storage, 'files/' + file.name); // creates a storage reference
    const username = getCookie('user')
    const fbRef = doc(db, 'data', 'formSubmissions');
    // Upload file
    uploadBytes(storageRef, file).then((snapshot) => {
        console.log('Upload is complete!');
        getDownloadURL(snapshot.ref).then(async (downloadURL) => {
            console.log('File available at', downloadURL);
            await setDoc(fbRef, {
                [username]: downloadURL
            })
        });
    }).catch((error) => {
        console.log('Error uploading file:', error);
    });
}

document.getElementById('logoForm').addEventListener('submit', function () {
    event.preventDefault(); 9
    uploadFile();
});