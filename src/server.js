const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

// Debug variable
const DEBUG = true; // Set to true to enable debug statements

// List of JS files to inject dynamically
const jsFiles = [
    '/code/universalCode/aboutblankcloak.js',
    '/code/universalCode/maincheck.js',
];

const moduleFiles = [
    '/code/universalCode/firestore.js',
    '/code/universalCode/autoSave.js'
];

// Middleware to inject JS files dynamically into HTML responses
app.use((req, res, next) => {
    if (req.path.endsWith('.html') || req.path.endsWith('/')) {
        let filePath;
        if (req.path.endsWith('.html')) {
            filePath = path.join(__dirname, '../static', req.path);
        } else {
            filePath = path.join(__dirname, '../static', req.path, 'index.html');
        }

        // Read the HTML file
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                if (DEBUG) console.error(`Error reading file: ${filePath}`, err);
                return next();
            }

            // Inject the script tags before the closing </body> tag
            let injectedHtml = data.replace('</body>', () => {
                // Regular scripts
                let scriptTags = jsFiles.map(file => `<script src="${file}"></script>`).join('');
                // Module scripts
                let moduleTags = moduleFiles.map(file => `<script type="module" src="${file}"></script>`).join('');

                if (DEBUG) console.log(`Injecting scripts into ${req.path}`);
                return scriptTags + moduleTags + '</body>';
            });

            if (DEBUG) console.log(`Sending modified HTML response for: ${req.path}`);
            res.send(injectedHtml);
        });
    } else {
        if (DEBUG) console.log(`Request for non-HTML resource: ${req.path}`);
        next(); // For non-HTML requests, proceed as normal
    }
});

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../static')));

app.use((req, res, next) => {
    let filePath;
    if (req.path.endsWith('/')) {
        filePath = path.join(__dirname, '../static', req.path, 'index.html');
    } else {
        filePath = path.join(__dirname, '../static', req.path);
    }

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            // If the file does not exist, serve 404.html
            if (DEBUG) console.log(`404 error for: ${req.url}. Serving 404.html`);
            return res.status(404).sendFile(path.join(__dirname, '../static', '404.html'));
        } else {
            // If the file exists, proceed to the next middleware
            next();
        }
    });
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    if (DEBUG) {
        console.log('Debug is on');
    } else {
        console.log('Debug is off');
    }
});
