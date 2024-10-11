const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

// List of JS files to inject dynamically
const jsFiles = [
    '/code/universalCode/aboutblankcloak.js',
    '/code/universalCode/maincheck.js',
];

const moduleFiles = [
    '/code/universalCode/firestore.js'
];

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../static')));

// Middleware to inject JS files dynamically into HTML responses
app.use((req, res, next) => {
    // Check if the request is for an HTML file
    if (req.path.endsWith('.html')) {
        const filePath = path.join(__dirname, '../static', req.path);

        // Read the HTML file
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                return next();
            }

            // Inject the script tags before the closing </body> tag
            let injectedHtml = data.replace('</body>', () => {
                // Regular scripts
                let scriptTags = jsFiles.map(file => `<script src="${file}"></script>`).join('');
                // Module scripts
                let moduleTags = moduleFiles.map(file => `<script type="module" src="${file}"></script>`).join('');
                
                return scriptTags + moduleTags + '</body>';
            });

            // Send the modified HTML response
            res.send(injectedHtml);
        });
    } else {
        next(); // For non-HTML requests, proceed as normal
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});