/*function sendNotification(title, desc, iconURL) {
    if (Notification.permission === "granted") {
        const notification = new Notification(title, {
            body: desc,
            icon: iconURL // This will display an icon with the notification
        });

        // Optional: Add click event to notification
        notification.onclick = function () {
            window.focus(); // Focus the window on notification click
        };
    } else {
        console.log("Notification permission has not been granted");
    }
}
let docName = 'test';
const docRef = doc(firestore, 'messages', docName);
let lastDoc = await getDoc(docRef).data();

function changedField(oldData, newData) {
    let changes = {};

    // Check for new or changed fields in newData
    for (const [key, value] of Object.entries(newData)) {
        if (!oldData.hasOwnProperty(key)) {
            changes[key] = value;
        }
        if (oldData[key] !== value) {
            changes[key] = value + '|~';
        }
    }

    // Check if any field was removed in the newData (optional)
    for (const key of Object.keys(oldData)) {
        if (!newData.hasOwnProperty(key)) {
            changes[key] = "removed|~";
            // If you prefer to ignore removed fields, you can skip this part
        }
    }

    return Object.keys(changes).length > 0 ? changes : null;
}
onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
        console.log("Current data: ", doc.data());
        let message;
        message = String(changedField(lastDoc, doc.data())[0]);
        if (message.endsWith('|~')) {
            if (message == 'removed|~') {
                sendNotification('A message in ' + docName + ' was removed.', null, 'https://webgfa.com/favicon.ico')
            } else {
                sendNotification('A message in ' + docName + ' was edited.', message, 'https://webgfa.com/favicon.ico')
            }
        } else {
            sendNotification('New Message in ' + docName, message, 'https://webgfa.com/favicon.ico')
        }


    } else {
        // doc.data() will be undefined in this case
        console.log("No such document!");
    }
});
*/

// Inside service-worker.js
self.addEventListener('message', event => {
    const { action, title, body, icon } = event.data;
    if (action === 'showNotification') {
        // Show a notification
        self.registration.showNotification(title, {
            body: body,
            icon: icon
        });
    }
});
