// firebase utils
let db;
let firestoreUtils = {};

// Function to set the database instance
function setDB(database) {
    db = database;
}

// Function to set a document in a collection
async function setDocument(collection, docId, data) {
    try {
        await db.collection(collection).doc(docId).set(data);
    } catch (error) {
        throw new Error('Error setting document: ' + error); // Throw error for further handling
    }
}

// Function to get a document from a collection
async function getDocument(collection, docId) {
    try {
        const doc = await db.collection(collection).doc(docId).get();
        if (doc.exists) {
            return doc.data(); // Return the document data
        } else {
            return null; // Return null if document does not exist
        }
    } catch (error) {
        throw new Error('Error getting document: ' + error); // Throw error for further handling
    }
}

// Function to update a document in a collection
async function updateDocument(collection, docId, data) {
    try {
        await db.collection(collection).doc(docId).update(data);
    } catch (error) {
        throw new Error('Error updating document: ' + error); // Throw error for further handling
    }
}

// Function to delete a document from a collection
async function deleteDocument(collection, docId) {
    try {
        await db.collection(collection).doc(docId).delete();
    } catch (error) {
        throw new Error('Error deleting document: ' + error); // Throw error for further handling
    }
}

// Attach all the functions to the firestoreUtils object
firestoreUtils.setDB = setDB;
firestoreUtils.setDocument = setDocument;
firestoreUtils.getDocument = getDocument;
firestoreUtils.updateDocument = updateDocument;
firestoreUtils.deleteDocument = deleteDocument;

// Export the firestoreUtils object
module.exports = firestoreUtils;
