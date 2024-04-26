import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, updateDoc, deleteField } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"; // Import Firestore modules

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAMOJV2z02dLtMb8X1uWDGkDx6ysrzBcUo",
    authDomain: "webgfa-games.firebaseapp.com",
    projectId: "webgfa-games",
    storageBucket: "webgfa-games.appspot.com",
    messagingSenderId: "553239008504",
    appId: "1:553239008504:web:b91fba77cf0f131849170d",
    measurementId: "G-5W79NYJZ11"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}
let docName;
let docRef;
let timestampRef;
let timestampDoc;
let myUser;
let lastDoc;

function populateOldThreads() {
    let threads = getCookie('previousThreads');
    let threadDiv = document.getElementById('pThreads');
    let start = document.createElement('option');
    start.innerText = '---'
    threadDiv.appendChild(start);
    if (!threads) return;
    threads = threads.split(',');
    threads.forEach(threadName => {
        let option = document.createElement('option');
        option.innerText = threadName;
        threadDiv.appendChild(option);
    });

}
populateOldThreads();
window.populateOldThreads = populateOldThreads;
document.getElementById('deleteThread').addEventListener('click', function () {
    console.log('Thread will be deleted...');
    // Retrieve the array of threads from the cookie
    const threads = getCookie('previousThreads').split(',');
    // Get the threadDiv element
    const threadDiv = document.getElementById('pThreads').value;
    // Find the index of the threadDiv element in the threads array
    const index = threads.indexOf(threadDiv);
    // Remove the element if it exists in the array
    if (index !== -1) {
        threads.splice(index, 1); // Remove 1 element starting from the index
    }
    // Update the cookie with the modified threads array
    document.cookie = `previousThreads=${threads.join(',')}; path=/`;
    navigation.reload()

});
document.getElementById('connect').addEventListener('click', function() {
    handleSetup(null);
  });
  handleSetup('zion');
async function handleSetup(customThread) {
    if (!customThread) {
        docName = document.getElementById('pThreads').value == '---' ? document.getElementById('docId').value : document.getElementById('pThreads').value
        if (docName == '') return;
        console.log(document.getElementById('pThreads').value);
        if (getCookie('previousThreads') && document.getElementById('pThreads').value == '---') {
            let threads = getCookie('previousThreads');
            console.log('Cookie exists, adding it along.');
            if (typeof threads == 'object') {
                threads = threads.split(',');
                threads.indexOf(docName) === -1 ? document.cookie = `previousThreads=${getCookie('previousThreads') + ',' + docName}; path=/` : false
            } else if (typeof threads == 'string') {
                !threads.includes(docName) ? document.cookie = `previousThreads=${getCookie('previousThreads') + ',' + docName}; path=/` : false
            }
        } else if (!getCookie('previousThreads')) {
            console.log('Creating cookie');
            document.cookie = `previousThreads=${docName}; path=/`;
        }
    } else {
        docName = customThread;
    }
    docRef = doc(firestore, 'messages', docName);
    timestampRef = doc(firestore, 'messageTimestamps', docName);
    myUser = getCookie('user');
    lastDoc = await getDoc(docRef);
    timestampDoc = await getDoc(timestampRef);
    lastDoc = lastDoc.data();
    timestampDoc = timestampDoc.data();
    console.log(lastDoc, timestampDoc);
    lastDoc == null ? await setDoc(docRef, {}) : true
    timestampDoc == null ? await setDoc(timestampRef, {}) : true
    startListening();
    document.getElementById('connectContainer').innerHTML = '';
}
function changedField(oldData, newData) {
    let changes = {};

    // Check for new or changed fields in newData
    for (const [key, value] of Object.entries(newData)) {
        if (!oldData.hasOwnProperty(key)) {
            changes[key] = value;
            continue;
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
function waitButton(buttonElement) {
    return new Promise((resolve) => {
        // Ensure the button can only resolve the promise once
        buttonElement.addEventListener('click', () => resolve(), { once: true });
    });
}
// Listen for document updates
function sendNotification(title, desc, iconURL) {
    // Send a message to your service worker to show a notification
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            action: 'showNotification',
            title: title,
            body: desc,
            icon: iconURL
        });
    }
}
function convertUnixToLocalTime(unixTimestamp) {
    // Create a new Date object from the UNIX timestamp
    let date = new Date(unixTimestamp * 1000);

    // Return the local date and time as a string
    return date.toLocaleString();
}
function updateHTML(doc) {
    if (!doc) {
        return;
    }
    // continue with function execution

    let container = document.getElementById('messageContainer');
    let inputContainer = document.createElement('div');
    let editImg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon-md" style="background-color: rgb(88,88,88);"><path fill-rule="evenodd" clip-rule="evenodd" d="M13.2929 4.29291C15.0641 2.52167 17.9359 2.52167 19.7071 4.2929C21.4783 6.06414 21.4783 8.93588 19.7071 10.7071L18.7073 11.7069L11.1603 19.2539C10.7182 19.696 10.1489 19.989 9.53219 20.0918L4.1644 20.9864C3.84584 21.0395 3.52125 20.9355 3.29289 20.7071C3.06453 20.4788 2.96051 20.1542 3.0136 19.8356L3.90824 14.4678C4.01103 13.8511 4.30396 13.2818 4.7461 12.8397L13.2929 4.29291ZM13 7.41422L6.16031 14.2539C6.01293 14.4013 5.91529 14.591 5.88102 14.7966L5.21655 18.7835L9.20339 18.119C9.40898 18.0847 9.59872 17.9871 9.7461 17.8397L16.5858 11L13 7.41422ZM18 9.5858L14.4142 6.00001L14.7071 5.70712C15.6973 4.71693 17.3027 4.71693 18.2929 5.70712C19.2831 6.69731 19.2831 8.30272 18.2929 9.29291L18 9.5858Z" fill="currentColor"></path></svg>'
    let deleteImg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon-md" style="color: red; background-color: rgb(88,88,88);"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.5555 4C10.099 4 9.70052 4.30906 9.58693 4.75114L9.29382 5.8919H14.715L14.4219 4.75114C14.3083 4.30906 13.9098 4 13.4533 4H10.5555ZM16.7799 5.8919L16.3589 4.25342C16.0182 2.92719 14.8226 2 13.4533 2H10.5555C9.18616 2 7.99062 2.92719 7.64985 4.25342L7.22886 5.8919H4C3.44772 5.8919 3 6.33961 3 6.8919C3 7.44418 3.44772 7.8919 4 7.8919H4.10069L5.31544 19.3172C5.47763 20.8427 6.76455 22 8.29863 22H15.7014C17.2354 22 18.5224 20.8427 18.6846 19.3172L19.8993 7.8919H20C20.5523 7.8919 21 7.44418 21 6.8919C21 6.33961 20.5523 5.8919 20 5.8919H16.7799ZM17.888 7.8919H6.11196L7.30423 19.1057C7.3583 19.6142 7.78727 20 8.29863 20H15.7014C16.2127 20 16.6417 19.6142 16.6958 19.1057L17.888 7.8919ZM10 10C10.5523 10 11 10.4477 11 11V16C11 16.5523 10.5523 17 10 17C9.44772 17 9 16.5523 9 16V11C9 10.4477 9.44772 10 10 10ZM14 10C14.5523 10 15 10.4477 15 11V16C15 16.5523 14.5523 17 14 17C13.4477 17 13 16.5523 13 16V11C13 10.4477 13.4477 10 14 10Z" fill="currentColor"></path></svg>'
    container.innerHTML = '';  // Clear previous contents

    // Combine doc and timestampDoc into an array of objects to facilitate sorting
    let messages = Object.keys(doc).map(key => {
        return {
            sender: key,
            message: doc[key],
            timestamp: timestampDoc[key]
        };
    });

    // Sort messages by timestamp
    messages.sort((a, b) => a.timestamp - b.timestamp);
    console.log(messages);
    let i = 0;
    for (const message of messages) {
        let messageDiv = document.createElement('div');
        let senderDiv = document.createElement('div');
        let editButton = document.createElement('button');
        let deleteButton = document.createElement('button');
        let br = document.createElement('br');
        let br1 = document.createElement('br');
        // editButton.addEventListener('click', () => editMessage(`${i}`));
        // deleteButton.addEventListener('click', () => deleteMessage(`${i}`));
        (function (index) {
            editButton.addEventListener('click', () => editMessage(`${index}`));
            deleteButton.addEventListener('click', () => deleteMessage(`${index}`));
        })(i);
        editButton.innerHTML = editImg;
        deleteButton.innerHTML = deleteImg;
        editButton.style = 'background-color: rgb(88,88,88);';
        deleteButton.style = 'background-color: rgb(88,88,88);';
        senderDiv.innerText = capitalizeWords(message.sender.slice(0, -4)) + ' - ' + convertUnixToLocalTime(message.timestamp); // Assuming name is up to last 4 digits
        senderDiv.id = 'whoSent';
        messageDiv.innerText = message.message;

        if (message.sender.slice(0, -4) == myUser) {
            messageDiv.id = 'messageSent';
            editButton.id = 'actionsSent';
            deleteButton.id = 'actionsSent';
        } else {
            messageDiv.id = 'messageReceived';
            editButton.id = 'actionsReceive';
            deleteButton.id = 'actionsReceive';
            container.appendChild(senderDiv);
        }

        container.appendChild(messageDiv);
        if (myUser == 'zion' || messageDiv.id == 'messageSent') {
            container.appendChild(editButton);
            container.appendChild(deleteButton);
        }
        container.appendChild(br);
        container.appendChild(br1);
        i++;
    }

    // Add input and submit elements
    let input = document.createElement('input');
    input.id = 'input';
    let submit = document.createElement('button');
    submit.id = 'submit';
    submit.onclick = sendMessage;
    let img = document.createElement('img');
    img.src = 'image.png';
    img.style = 'width: 12px; height: 12px;';
    submit.appendChild(img);
    inputContainer.appendChild(input);
    inputContainer.appendChild(submit);
    inputContainer.className = 'inputContainer'; 
    container.appendChild(inputContainer);
}
function generateID() {
    // Generate a random number between 0 and 9999
    const randomNumber = Math.round(Math.random() * 9999);

    // Convert the number to a string and pad with zeros if necessary to ensure it is always four digits
    const fourDigitNumber = randomNumber.toString().padStart(4, '0');

    return fourDigitNumber;
}

function capitalizeWords(str) {
    return str.replace(/\b\w/g, char => char.toUpperCase());
}
async function changeField(collection, docId, fieldName, fieldValue) {
    console.log()
    const docRef = doc(firestore, collection, docId);
    try {
        await setDoc(docRef, {
            [fieldName]: fieldValue  // Replace 'newFieldName' and 'newValue' with your field name and value
        }, { merge: true });
        console.log("Field added or updated successfully");
    } catch (error) {
        console.error("Error adding or updating field: ", error);
    }
}
async function delField(collection, docId, fieldName) {
    const docRef = doc(firestore, collection, docId);
    try {
        await updateDoc(docRef, {
            [fieldName]: deleteField()  // This will delete the specified field
        });
        console.log("Field deleted successfully");
    } catch (error) {
        console.error("Error deleting field: ", error);
    }
}
function sendMessage() {
    console.log('Send Message button clicked');
    let message = document.getElementById('input').value;
    if (message === '') return;
    window.scrollTo({
        top: 0,
        behavior: 'smooth' // Optional: Add smooth scrolling behavior
    });
    const unixTime = Math.floor(Date.now() / 1000);
    let messageID = generateID();
    console.log('Non-null message will be added... ' + message)
    console.log('Data:  ', docName, myUser + messageID, unixTime)
    changeField('messageTimestamps', docName, myUser + messageID, unixTime);
    changeField('messages', docName, myUser + messageID, message);
}
async function editMessage(i) {
    console.log('EDIT BUTTON CLICKED, index is: ', i);
    let submitButton = document.getElementById('submit');
    submitButton.onclick = null;
    await waitButton(submitButton);
    submitButton.onclick = sendMessage;
    let message = document.getElementById('input').value;
    if (message === '') return;
    let messages = Object.keys(lastDoc).map(key => {
        return {
            sender: key,
            message: lastDoc[key],
            timestamp: timestampDoc[key]
        };
    });
    messages.sort((a, b) => a.timestamp - b.timestamp);
    console.log('Pure JSON: ', lastDoc);
    console.log('JSON Keys: ', messages.map(msg => msg.sender));
    console.log('JSON Key for index: ', messages.map(msg => msg.sender)[i]);
    console.log('messages', docName, messages.map(msg => msg.sender)[i], message);
    changeField('messages', docName, messages.map(msg => msg.sender)[i], message);
    console.log('EDIT CODE FINISHED');
}
function deleteMessage(i) {
    console.log('DELETE BUTTON CLICKED, index is: ', i);
    let messages = Object.keys(lastDoc).map(key => {
        return {
            sender: key,
            message: lastDoc[key],
            timestamp: timestampDoc[key]
        };
    });
    messages.sort((a, b) => a.timestamp - b.timestamp);
    console.log(messages);
    console.log('messages', docName, messages.map(msg => msg.sender)[i]);
    delField('messages', docName, messages.map(msg => msg.sender)[i]);
    delField('messageTimestamp', docName, messages.map(msg => msg.sender)[i]);
    console.log('DELETE CODE FINISHED');
}
window.sendMessage = sendMessage;
updateHTML(lastDoc);

//document.getElementById('submit').addEventListener('click', sendMessage);

function startListening() {
    onSnapshot(docRef, async (doc) => {
        if (doc.exists() && doc) {
            console.log("Current data: ", doc.data());
            let message;
            let sender;
            try {
                timestampDoc = await getDoc(timestampRef);
                timestampDoc = timestampDoc.data();
                updateHTML(doc.data());
                sender = String(Object.keys(changedField(lastDoc, doc.data()))[0]).slice(0, -4);
                sender = capitalizeWords(sender);
                message = String(Object.values(changedField(lastDoc, doc.data()))[0]);
                console.log(lastDoc);
                console.log(doc.data());
                console.log(changedField(lastDoc, doc.data()));
                console.log(message);
                lastDoc = doc.data();
                if (message.endsWith('|~')) {
                    if (message == 'removed|~') {
                        console.log('message removed');
                        sendNotification(sender + ' removed a message in ' + docName, '', 'https://webgfa.com/favicon.ico')
                    } else {
                        console.log('message edited');
                        sendNotification(sender + ' edited a message in ' + docName, message.slice(0, -2), 'https://webgfa.com/favicon.ico')
                    }
                } else {
                    console.log('message sent');
                    sendNotification(sender + ' sent a message in ' + docName, message, 'https://webgfa.com/favicon.ico')
                }
            } catch (e) {
                console.error(e);
            }
        } else {
            console.log("No such document!");
        }
    });
};


// Check for service worker support
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
        .then(function (registration) {
            console.log('Service Worker registered with scope:', registration.scope);

            // Request notification permission
            Notification.requestPermission();

        })
        .catch(function (error) {
            console.error('Service Worker registration failed:', error);
        });
}
