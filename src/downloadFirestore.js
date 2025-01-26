const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Replace with your service account key file path
async function initializeFirebase() {
  try {
      if (process.env.FIREBASE_PRIVATE_KEY_1 && process.env.FIREBASE_PRIVATE_KEY_2) {
          try {
              const serviceAccount = JSON.parse(
                  process.env.FIREBASE_PRIVATE_KEY_1 + process.env.FIREBASE_PRIVATE_KEY_2
              );
              admin.initializeApp({
                  credential: admin.credential.cert(serviceAccount),
                  databaseURL: "https://webgfa-games-default-rtdb.firebaseio.com"
              });
              console.log("Firebase initialized with environment variables");
              return true;
          } catch (error) {
              console.error("Invalid Firebase environment variables format");
              return false;
          }
      }

      if (process.env.FIREBASE_PRIVATE_KEY) {
          try {
              const serviceAccount = JSON.parse(process.env.FIREBASE_PRIVATE_KEY);
              admin.initializeApp({
                  credential: admin.credential.cert(serviceAccount),
                  databaseURL: "https://webgfa-games-default-rtdb.firebaseio.com"
              });
              console.log("Firebase initialized with single environment variable");
              return true;
          } catch (error) {
              console.error("Invalid Firebase environment variable format");
              return false;
          }
      }

      const filePath = path.resolve(__dirname, '../data/firebasePrivateKey.json');
      try {
          await fs.access(filePath, fs.constants.F_OK);
          const data = await fs.readFile(filePath, 'utf8');
          const serviceAccount = JSON.parse(data);
          admin.initializeApp({
              credential: admin.credential.cert(serviceAccount),
              databaseURL: "https://webgfa-games-default-rtdb.firebaseio.com"
          });
          console.log("Firebase initialized with local file");
          return true;
      } catch (fileError) {
          console.error("Firebase initialization failed - no valid credentials found");
          return false;
      }
  } catch (error) {
      console.error("Firebase initialization error:", error);
      return false;
  }
}
initializeFirebase();

const db = admin.firestore();

// Function to recursively fetch all documents and subcollections
async function fetchCollection(collectionRef) {
  const snapshot = await collectionRef.get();
  const data = {};

  for (const doc of snapshot.docs) {
    const docData = doc.data();
    const subcollections = await doc.ref.listCollections();

    if (subcollections.length > 0) {
      for (const subcollection of subcollections) {
        docData[subcollection.id] = await fetchCollection(subcollection);
      }
    }

    data[doc.id] = docData;
  }

  return data;
}

// Function to download the entire Firestore database
async function downloadFirestore() {
  try {
    const collections = await db.listCollections();
    const database = {};

    for (const collection of collections) {
      database[collection.id] = await fetchCollection(collection);
    }

    // Save the data to a JSON file
    const filePath = path.join(__dirname, '../data/firestore_backup.json');
    fs.writeFileSync(filePath, JSON.stringify(database, null, 2));

    console.log(`Firestore database backup saved to ${filePath}`);
  } catch (error) {
    console.error('Error downloading Firestore database:', error);
  }
}

// Run the backup
downloadFirestore();