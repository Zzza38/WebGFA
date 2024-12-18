const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 8080;

const railway = process.env.RAILWAY_ENVIRONMENT_ID !== undefined;
const DEBUG = railway == false;

if (railway) console.log('Project in railway');
else console.log('Project ran locally');

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

app.use(async (req, res, next) => {
    const reqPath = normalizePath(req.path)
    const htmlRegex = /^\/(.*\.html$|.*\/$|[^\/\.]+\/?$)/;
    let isHtmlRequest;
    if (reqPath == '/') {
        isHtmlRequest = true
    } else {
        isHtmlRequest = Boolean(reqPath.match(htmlRegex));
    }
    if (!isHtmlRequest && railway) {
        const externalUrl = `https://elaisveryfun.online${reqPath}`;
        if (DEBUG) console.log(`Redirecting non-HTML request to: ${externalUrl}`);
        return res.redirect(externalUrl);
    } else if (DEBUG && isHtmlRequest) console.log('HTML Request for: ' + reqPath);

    if (isHtmlRequest) {
        if (!reqPath.endsWith('/')  && !reqPath.endsWith('.html')) return res.redirect(301, reqPath + '/')
        let filePath = reqPath.endsWith('.html')
            ? path.join(__dirname, '../static', reqPath)
            : path.join(__dirname, '../static', reqPath, 'index.html');
        
        try {
            const data = await fs.readFile(filePath, 'utf8');
            let injectedHtml = data.replace('</body>', () => {
                let tags = [...extraTags];

                if (Object.keys(excludedTags).includes(reqPath)) {
                    Object.entries(excludedTags).forEach(([key, value]) => {
                        if (key === reqPath && tags.includes(value)) {
                            tags = tags.filter(tag => tag !== value);
                        }
                    });
                }

                if (DEBUG) console.log(`Injecting HTML tags into ${reqPath}`);
                return tags.join('') + '</body>';
            });

            if (DEBUG) console.log(`Sending modified HTML response for: ${reqPath}`);
            res.setHeader('Content-Type', 'text/html');
            res.send(injectedHtml);
        } catch (err) {
            console.error(`Error reading file: ${filePath}`, err);
            return res.status(404).sendFile(path.join(__dirname, '../static', '404.html'));
        }
    } else {
        next();
    }
});

app.use(express.static(path.join(__dirname, '../static')));

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    if (DEBUG) console.log('Debug is on');
});

function normalizePath(reqPath) {
    const trimmedPath = reqPath.replace(/\/+$/, ''); // Remove trailing slashes
    const pathSegments = trimmedPath.split('/'); // Split the path into segments
    let fileName = '/' + pathSegments.pop().replace(/\/+$/, ''); // Get the last segment (file name)
    
    if (fileName == '/') {
        fileName = '/index.html'
    }

    return pathSegments.join('/') + fileName;
}