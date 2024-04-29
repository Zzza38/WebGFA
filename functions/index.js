const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const firestore = admin.firestore();
let lastDoc = 1; 

exports.processHeartbeat = functions.firestore.document('users/heartbeat').onUpdate(async (change, context) => {
    console.log('Function processHeartbeat started');
    const previousData = change.before.data();
    const newData = change.after.data();
    console.log(`Received data - Before: ${JSON.stringify(previousData)}, After: ${JSON.stringify(newData)}`);

    const changes = analyzeChanges(previousData, newData);
    console.log(`Analyzed changes: ${JSON.stringify(changes)}`);

    for (const {user, oldTimestamp, newTimestamp} of changes) {
        const timeDifference = newTimestamp - oldTimestamp;
        console.log(`Processing user: ${user} with time difference: ${timeDifference}`);

        // Calculate if the snapshot update for this user is significant
        const isUpdatedInSnapshot = (newTimestamp !== oldTimestamp && timeDifference > 120);

        if (timeDifference < 60) {
            console.log(`Locking down user: ${user}`);
            await updateField('users', 'lockdown', user, true);
        } else if (timeDifference > 120 && isUpdatedInSnapshot) {
            console.log(`Incrementing user count for user: ${user}`);
            await updateUserCount(user, 1); // Increment user count
        } else if ((Date.now() / 1000 - oldTimestamp) > 120) {
            console.log(`Decrementing user count for user: ${user}`);
            await updateUserCount(user, -1); // Decrement user count
        }
    }
    console.log('Function processHeartbeat completed');
});

function analyzeChanges(oldData, newData) {
    return Object.keys(newData).map(key => {
        const oldVal = oldData[key] || 0;  // Default to 0 if no old value
        const newVal = newData[key];

        // If old value is same as new value and it's not zero, we assume no change
        if (oldVal === newVal) {
            return {
                user: key,
                oldTimestamp: oldVal - 60,  // Use the old value as both timestamps since no change occurred
                newTimestamp: newVal
            };
        }

        // If there is a change, we compute normally
        return {
            user: key,
            oldTimestamp: oldVal,  // The previous timestamp before the update
            newTimestamp: newVal   // The new updated timestamp
        };
    });
}


async function updateField(collection, docId, fieldName, fieldValue) {
    const docRef = firestore.doc(`${collection}/${docId}`);
    try {
        await docRef.update({ [fieldName]: fieldValue });
        console.log(`Field ${fieldName} updated successfully for ${docId}`);
    } catch (error) {
        console.error(`Error updating field ${fieldName} for ${docId}:`, error);
    }
}

async function updateUserCount(userId, increment) {
    const docRef = firestore.doc(`users/activeUsers`);

    try {
        await firestore.runTransaction(async (transaction) => {
            const docSnapshot = await transaction.get(docRef);
            if (!docSnapshot.exists) {
                throw new Error("Document does not exist!");
            }

            const currentValue = docSnapshot.data()[userId] || 0;
            transaction.update(docRef, { [userId]: currentValue + increment });
        });
        console.log(`User count updated for ${userId}. Incremented by ${increment}.`);
    } catch (error) {
        console.error(`Error updating user count for ${userId}:`, error);
    }
}
