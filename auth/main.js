// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, applyActionCode } from "firebase/auth";
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
//const analytics = getAnalytics(app);
const auth = firebase.auth();

// Function to parse URL query parameters
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}
const userId = auth.currentUser ? auth.currentUser.uid : null;
console.log(userId);
// Example usage: Get the 'mode' parameter which tells you what the URL is for (e.g., verifyEmail, resetPassword)
const mode = getQueryParam('mode');

if (mode === 'verifyEmail') {

    const oobCode = getQueryParam('oobCode');
    const userId = auth.currentUser ? auth.currentUser.uid : null;
    console.log(userId);
    // Update Firebase Authentication to mark the user's email as verified
    if (userId) {
        auth.applyActionCode(oobCode)
            .then(() => {
                // Email verification successful
                console.log("Email verification successful");
            })
            .catch((error) => {
                // Error updating email verification status
                console.error("Error updating email verification status:", error);
            });
    } else {
        // Invalid or missing user identifier
        console.error("Invalid or missing user identifier");
    }

}