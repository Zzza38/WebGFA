// Listen for messages from the main script
self.addEventListener('message', event => {
    const data = event.data;

    if (data.action === 'showNotification') {
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon // Optional: Show an icon with the notification
        });
    }
});
