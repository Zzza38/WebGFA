const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 8080;

// Debug variable
const DEBUG = true; // Set to true to enable debug statements

// List of JS files to inject dynamically
const extraTags = [
    "<script src='/code/universalCode/aboutblankcloak.js'></script>",
    "<script src='/code/universalCode/maincheck.js'></script>",
    "<script src='/code/universalCode/firestore.js' type='module'></script>",
    "<script src='/code/universalCode/autoSave.js' type='module'></script>"
];
const excludedTags = {
    "/": "<script src='/code/universalCode/maincheck.js'></script>",
    "index.html": "<script src='/code/universalCode/maincheck.js'></script>"
};

// Middleware to inject JS files and handle HTML responses
app.use((req, res, next) => {
    // Redirect any non-HTML requests to webgfa.online
    if (!req.path.endsWith('.html') && !req.path.endsWith('/')) {
        const externalUrl = `https://webgfa.online${req.path}`;
        if (DEBUG) console.log(`Redirecting non-HTML request to: ${externalUrl}`);
        return res.redirect(externalUrl);
    }

    // Proceed if the request is for an HTML file
    let filePath = req.path.endsWith('.html') 
        ? path.join(__dirname, '../static', req.path)
        : path.join(__dirname, '../static', req.path, 'index.html');

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error reading file: ${filePath}`, err);
            return next();
        }

        // Inject the script tags before the closing </body> tag
        let injectedHtml = data.replace('</body>', () => {
            let tags = [...extraTags];  // Copy extraTags

            if (Object.keys(excludedTags).includes(req.path)) {
                Object.entries(excludedTags).forEach(([key, value]) => {
                    if (key === req.path) {
                        if (tags.includes(value)) {
                            tags = tags.filter(tag => tag !== value);
                        } else {
                            console.error(`Error: Tag "${value}" not found for removal in ${req.path}`);
                        }
                    }
                });
            }

            if (DEBUG) console.log(`Injecting HTML tags into ${req.path}`);
            return tags.join('') + '</body>';
        });

        if (DEBUG) console.log(`Sending modified HTML response for: ${req.path}`);
        res.send(injectedHtml);
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    if (DEBUG) console.log('Debug is on');
});
