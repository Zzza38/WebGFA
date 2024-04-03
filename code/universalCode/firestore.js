// Function to get cookie
function getCookie(name) {
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);
	if (parts.length === 2) return parts.pop().split(';').shift();
}
window.getCookie = getCookie;
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"; // Import Firestore modules

// Your web app's Firebase configuration
const firebaseConfig = {
	apiKey: "AIzaSyAMOJV2z02dLtMb8X1uWDGkDx6ysrzBcUo",
	authDomain: "webgfa-Firebases.firebaseapp.com",
	projectId: "webgfa-Firebases",
	storageBucket: "webgfa-Firebases.appspot.com",
	messagingSenderId: "553239008504",
	appId: "1:553239008504:web:b91fba77cf0f131849170d",
	measurementId: "G-5W79NYJZ11"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const firestore = getFirestore(app);

// Initialize Analytics
const analytics = getAnalytics(app);

// Function to write a field to Firestore
async function writeFieldToFirestore(collectionName, documentId, fieldData) {
	try {
		const docRef = doc(firestore, collectionName, documentId);
		await setDoc(docRef, fieldData, { merge: true });
		console.log('Field written successfully to document:', documentId);
	} catch (error) {
		console.error('Error writing field to Firestore:', error);
	}
}

// Function to remove a field from Firestore
async function removeFieldFromFirestore(collectionName, documentId, fieldName) {
	try {
		const docRef = doc(firestore, collectionName, documentId);
		const docSnapshot = await getDoc(docRef);
		const existingData = docSnapshot.exists() ? docSnapshot.data() : {};

		if (fieldName in existingData) {
			const updatedData = { ...existingData };
			delete updatedData[fieldName];
			await setDoc(docRef, updatedData, { merge: true });
			console.log('Field removed successfully from document:', documentId);
		} else {
			console.log('Field does not exist in document:', documentId);
		}
	} catch (error) {
		console.error('Error removing field from Firestore:', error);
	}
}
async function getFieldFromFirestore(collectionName, documentId, fieldName) {
try {
// Reference to the document
const docRef = doc(firestore, collectionName, documentId);

// Get the document
const docSnapshot = await getDoc(docRef);

// Check if the document exists and if the field exists within the document
if (docSnapshot.exists() && docSnapshot.data().hasOwnProperty(fieldName)) {
	// Return the field value
	return docSnapshot.data()[fieldName];
} else {
	console.log('Field does not exist in document:', documentId);
	return null;
}
} catch (error) {
console.error('Error getting field from Firestore:', error);
return null;
}
}



window.app = app;
window.analytics = analytics;
window.firestore = firestore;
window.doc = doc;
window.setDoc = setDoc;
window.getDoc = getDoc;
window.writeFieldToFirestore = writeFieldToFirestore;
window.removeFieldFromFirestore = removeFieldFromFirestore;
window.getFieldFromFirestore = getFieldFromFirestore;

