const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

const railway = process.env.RAILWAY_ENVIRONMENT_ID !== undefined;
const DEBUG = railway == false;

if (railway) console.log('Project in railway')
else console.log('Project ran locally')
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
    const htmlRegex = /^\/(.*\.html$|.*\/$|.*\/[^\/\.]+$|[^\/\.]+$)/
    const modifiedPath = req.path + "a"
    const isHtmlRequest = modifiedPath.match(htmlRegex)

    // Redirect non-HTML requests to webgfa.online if in Railway
    if (!isHtmlRequest && railway) {
        const externalUrl = `https://webgfa.online${req.path}`;
        if (DEBUG) console.log(`Redirecting non-HTML request to: ${externalUrl}`);
        return res.redirect(externalUrl);
    } else if (DEBUG && railway) console.log('HTML Request for: ' + req.path)
    else if (DEBUG) {
        next()
        return;
    }

    // Resolve the file path for HTML requests
    filePath = req.path.endsWith('.html')
        ? path.join('static', req.path)
        : path.join('static', req.path, 'index.html');
        if (isHtmlRequest) {
            // Serve HTML file with injected scripts
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    console.error(`Error reading file: ${filePath}`, err);
                    return res.status(404).sendFile(path.join(__dirname, '../static', '404.html'));
                }
    
                // Inject the script tags before the closing </body> tag
                let injectedHtml = data.replace('</body>', () => {
                    let tags = [...extraTags];
    
                    // Remove excluded tags if needed
                    if (Object.keys(excludedTags).includes(req.path)) {
                        Object.entries(excludedTags).forEach(([key, value]) => {
                            if (key === req.path && tags.includes(value)) {
                                tags = tags.filter(tag => tag !== value);
                            }
                        });
                    }
    
                    if (DEBUG) console.log(`Injecting HTML tags into ${req.path}`);
                    return tags.join('') + '</body>';
                });
    
                if (DEBUG) console.log(`Sending modified HTML response for: ${req.path}`);
                res.send(injectedHtml);
            });
        }
});

// Serve static files
app.use(express.static(path.join(__dirname, '../static')));

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    if (DEBUG) console.log('Debug is on');
});
