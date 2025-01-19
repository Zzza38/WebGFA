const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const https = require('https');
const http = require('http');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const HTTPS_PORT = process.env.PORT || 8080;
const HTTP_PORT = 8000;

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
    "/index.html": "<script src='/code/universalCode/maincheck.js'></script>"
};

const logFilePath = path.resolve(__dirname, '../server.log');

function clearLogFile(filePath) {
    fs.writeFile(filePath, '', (err) => {
        if (err) {
            console.error(`Error clearing log file: ${err.message}`);
        } else {
            console.log('Log file cleared successfully.');
        }
    });
}

clearLogFile(logFilePath);

const sshProxy = createProxyMiddleware({
    target: 'http://127.0.0.1:2222/ssh', // Replace with your target URL
});
const USERNAME = 'zion'
const PASSWORD = '797979'
function basicAuth(req, res, next) {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
        return res.status(401).send('Authentication required.');
    }

    // Decode the Authorization header
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    // Check credentials
    if (username === USERNAME && password === PASSWORD) {
        return next(); // User is authenticated, proceed to the next middleware/route
    }

    // If credentials are invalid
    res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
    return res.status(401).send('Invalid credentials.');
}

// Protected route
app.get('/ssh/', basicAuth)

// Use the proxy middleware
app.use('/ssh/', sshProxy);

app.use(async (req, res, next) => {
    const reqPath = normalizePath(req.path);
    const htmlRegex = /^\/(.*\.html$|.*\/$|[^\/\.]+\/?$)/;
    let isHtmlRequest = reqPath === '/' || Boolean(reqPath.match(htmlRegex));

    if (!isHtmlRequest && railway) {
        const externalUrl = `https://elaisveryfun.online${reqPath}`;
        if (DEBUG) console.log(`Redirecting non-HTML request to: ${externalUrl}`);
        return res.redirect(externalUrl);
    } else if (DEBUG && isHtmlRequest) {
        console.log('HTML Request for: ' + reqPath);
    }

    if (isHtmlRequest) {
        if (!reqPath.endsWith('/') && !reqPath.endsWith('.html')) return res.redirect(301, reqPath + '/');
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
                return tags.join('') + '</body>';
            });
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

async function startServer() {
    try {
        http.createServer(app).listen(HTTP_PORT, () => {
            console.log(`HTTP server is running on port ${HTTP_PORT}`);
        });

        const sslOptions = {
            key: await fs.readFile('/etc/letsencrypt/live/learnis.site/privkey.pem'),
            cert: await fs.readFile('/etc/letsencrypt/live/learnis.site/fullchain.pem'),
        };
        https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
            console.log(`Secure server is running on port ${HTTPS_PORT}`);
            if (DEBUG) console.log('Debug is on');
        });
    } catch (err) {
        console.error('Failed to start HTTPS server:', err);
    }
}

startServer();

function normalizePath(reqPath) {
    const trimmedPath = reqPath.replace(/\/+$/, '');
    const pathSegments = trimmedPath.split('/');
    let fileName = '/' + pathSegments.pop().replace(/\/+$/, '');

    if (fileName === '/') {
        fileName = '/index.html';
    } else if (reqPath.endsWith('/')) {
        fileName += '/';
    }

    return pathSegments.join('/') + fileName;
}
