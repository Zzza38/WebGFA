/**
 * The above function registers a user with custom permissions in a Firebase Firestore database based
 * on the provided username, password, and premium status.
 * @param username - The `username` parameter in the `registerUser` function refers to the username of
 * the user being registered. It is the unique identifier for the user within the system.
 * @param password - The `password` parameter in the `registerUser` function is the password entered by
 * the user during registration. It is used to store the user's password securely in the Firestore
 * database along with other user data.
 * @param prem - The `prem` parameter in the `registerUser` function is a boolean value that determines
 * whether the user has premium permissions or not. If `prem` is `true`, it means the user has premium
 * permissions, and if `prem` is `false`, it means the user does
 */
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

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
const firestore = getFirestore(app);

function registerUser(username, password, prem) {
    let permissions = prem ? 'prem' : '';
    console.log("Permissions are: ", permissions);
    // Save custom user data to Firestore
    const userRef = doc(firestore, "users", "registerUsers");
    let userData = {password, permissions};
    setDoc(userRef, {
        [username]: userData
    }, { merge: true }).then(() => {
        console.log("User data with custom permissions saved to Firestore");
    }).catch((error) => {
        console.error("Error saving user data to Firestore", error);
    });
}

document.getElementById('registerForm').addEventListener('submit', function () {
    event.preventDefault();
    let password = document.getElementById('password').value;
    let username = document.getElementById('username').value;
    let prem = document.getElementById('premCheck').checked;
    registerUser(username, password, prem);
});
