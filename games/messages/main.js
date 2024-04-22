// Check for service worker support
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js', { type: 'module' })
    .then(function(registration) {
        console.log('Service Worker registered with scope:', registration.scope);

        // Request notification permission
        Notification.requestPermission();

    })
    .catch(function(error) {
        console.error('Service Worker registration failed:', error);
    });
}
