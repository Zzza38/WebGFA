let db;
// might not need this file
// cuz like json is easy to use
module.exports = {
    setDB: (database) => {
        db = database;
    },

    getDocument: async (collection, docId) => {
        return db[collection]?.[docId] ?? null;
    },

    setDocument: async (collection, docId, data) => {
        if (!db[collection]) db[collection] = {};
        db[collection][docId] = data;
    },

    updateDocument: async (collection, docId, data) => {
        const doc = db[collection]?.[docId];
        if (!doc) throw new Error('Document not found');
        db[collection][docId] = { ...doc, ...data };
    },

    deleteDocument: async (collection, docId) => {
        if (db[collection]?.[docId]) delete db[collection][docId];
    }
};