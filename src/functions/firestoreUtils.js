let db;

module.exports = {
    setDB: (database) => {
        db = database;
    },

    getDocument: async (collection, docId) => {
        const doc = await db.collection(collection).doc(docId).get();
        return doc.exists ? doc.data() : null;
    },

    setDocument: async (collection, docId, data) => {
        await db.collection(collection).doc(docId).set(data);
    },

    updateDocument: async (collection, docId, data) => {
        await db.collection(collection).doc(docId).update(data);
    },

    deleteDocument: async (collection, docId) => {
        await db.collection(collection).doc(docId).delete();
    }
};