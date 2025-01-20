// DISCLAIMER: This code is only for my use. It will be hard to understand for others and adapt it to other sites.
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const https = require('https');
const http = require('http');
const { createProxyMiddleware } = require('http-proxy-middleware');
const admin = require("firebase-admin");
const firestoreUtils = require("./functions/firestoreUtils.js");
const urlUtils = require("./functions/urlUtils.js");

const app = express();
const HTTPS_PORT = process.env.PORT || 8080;
const HTTP_PORT = 8000;
const DEBUG = true;

console.log('Project ran locally');

// Firebase initialization logic
function initializeFirebase() {
    try {
        let serviceAccount;
        if (process.env.FIREBASE_PRIVATE_KEY_1 && process.env.FIREBASE_PRIVATE_KEY_2) {
            serviceAccount = JSON.parse(process.env.FIREBASE_PRIVATE_KEY_1 + process.env.FIREBASE_PRIVATE_KEY_2);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: "https://webgfa-games-default-rtdb.firebaseio.com"
            });
            console.log("Firebase Successfully Initialized Locally");
        } else if (process.env.FIREBASE_PRIVATE_KEY) {
            serviceAccount = JSON.parse(process.env.FIREBASE_PRIVATE_KEY);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: "https://webgfa-games-default-rtdb.firebaseio.com"
            });
            console.log("Firebase Successfully Initialized Locally");

        } else {
            const filePath = path.resolve(__dirname, '../data/firebasePrivateKey.json');
            fs.access(filePath, fs.constants.F_OK, (err) => {
                if (err) {
                  console.error("Firebase Service Key Not Provided Locally");
                  return false;
                }
              
                // Read the file if it exists
                fs.readFile(filePath, 'utf8', (err, data) => {
                  if (err) {
                    console.error('Error reading the file:', err);
                    return;
                  }
              
                  try {
                    // Parse the JSON content
                    const serviceAccount = JSON.parse(data);
                    admin.initializeApp({
                        credential: admin.credential.cert(serviceAccount),
                        databaseURL: "https://webgfa-games-default-rtdb.firebaseio.com"
                    });
                    console.log("Firebase Successfully Initialized Locally");
                  } catch (parseError) {
                    console.error('Error parsing JSON:', parseError);
                  }
                });
              });
        }
        return true;
    } catch (error) {
        console.error("Error initializing Firebase:", error);
        return false;
    }
}

async () => {
const firebaseInitialized = await initializeFirebase();

if (!firebaseInitialized) {
    console.error('Could not initialize Firebase. Exiting.');
    process.exit(1);
}

const db = admin.firestore();
firestoreUtils.setDB(db);
}
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
    target: 'http://127.0.0.1:2222/ssh',
});

const USERNAME = 'zion';
const PASSWORD = '797979';
function basicAuth(req, res, next) {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
        return res.status(401).send('Authentication required.');
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    if (username === USERNAME && password === PASSWORD) {
        return next();
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
    return res.status(401).send('Invalid credentials.');
}

app.get('/ssh/', basicAuth);
app.use('/ssh/', sshProxy);

app.use(async (req, res, next) => {
    const reqPath = urlUtils.normalizePath(req.path);
    const params = req.query;
    const htmlRegex = /^\/(.*\.html$|.*\/$|[^\/\.]+\/?$)/;
    let isHtmlRequest = reqPath === '/' || Boolean(reqPath.match(htmlRegex));

    if (DEBUG && isHtmlRequest) {
        console.log('HTML Request for: ' + reqPath);
    }

    if (reqPath.includes('/api')) {
        try {
            let doc;
            let request;
            switch (params.service) {
                case 'firestoreGetDoc':
                    doc = await firestoreUtils.getDocument(params.col, params.doc);
                    res.send(doc);
                    break;
                case 'firestoreSetDoc':
                    doc = await firestoreUtils.setDocument(params.col, params.doc, params.data);
                    res.send(doc);
                    break;
                case 'firestoreUpdateDoc':
                    doc = await firestoreUtils.updateDocument(params.col, params.doc, params.data);
                    res.send(doc);
                    break;
                case 'firestoreDeleteDoc':
                    doc = await firestoreUtils.deleteDocument(params.col, params.doc);
                    res.send(doc);
                    break;
                default:
                    res.status(400).send('Invalid service request');
                    break;
            }
        } catch (error) {
            console.error('Error handling API request:', error);
            res.status(500).send('Internal Server Error');
        }
    } else if (isHtmlRequest) {
        if (!reqPath.endsWith('/') && !reqPath.endsWith('.html')) {
            return res.redirect(301, reqPath + '/');
        }
        const filePath = reqPath.endsWith('.html')
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
