function askNotificationPermission() {
    if (!("Notification" in window)) {
        alert("This browser does not support desktop notification");
    }
    else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                console.log("Notification permission granted.");
            }
        });
    }
}

// Function to send a notification
function sendNotification(title, desc, iconURL) {
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