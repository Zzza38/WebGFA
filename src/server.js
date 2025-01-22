/////////////////////////////////////////////////////////////
//                   IMPORT STATEMENTS                     //
/////////////////////////////////////////////////////////////
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const https = require('https');
const http = require('http');
const { createProxyMiddleware } = require('http-proxy-middleware');
const admin = require("firebase-admin");
const { exec } = require('child_process');
const firestoreUtils = require("./functions/firestoreUtils.js");
const urlUtils = require("./functions/urlUtils.js");

/////////////////////////////////////////////////////////////
//                 CONSTANTS & CONFIGURATION               //
/////////////////////////////////////////////////////////////
const app = express();
const HTTPS_PORT = process.env.PORT || 8080;
const HTTP_PORT = 8000;
const DEBUG = true;
const logFilePath = path.resolve(__dirname, '../server.log');
const USERNAME = 'zion';
let PASSWORD;

const extraTags = [
    "<script src='/code/universalCode/aboutblankcloak.js'></script>",
    "<script src='/code/universalCode/maincheck.js'></script>",
    "<script src='/code/universalCode/firestore.js' type='module'></script>",
    "<script src='/code/universalCode/autoSave.js' type='module'></script>"
];

const excludedTags = {
    "/index.html": "<script src='/code/universalCode/maincheck.js'></script>"
};

const sshProxy = createProxyMiddleware({ target: 'http://127.0.0.1:2222/ssh' });

/////////////////////////////////////////////////////////////
//                  EXPRESS SERVER SETUP                   //
/////////////////////////////////////////////////////////////
app.use(express.static(path.join(__dirname, '../static')));
app.use(express.json({ type: 'application/json' }));

// Routes
app.get('/ssh/', basicAuth);
app.use('/ssh/', sshProxy);
app.post('/webhook/github', handleGitHubWebhook);
app.use(handleMainRequest);

/////////////////////////////////////////////////////////////
//                   SERVER INITIALIZATION                 //
/////////////////////////////////////////////////////////////
(async () => {
    clearLogFile(logFilePath);
    const firebaseInitialized = await initializeFirebase();
    
    if (!firebaseInitialized) {
        console.error('Could not initialize Firebase. Exiting.');
        process.exit(1);
    }

    const passwordDoc = await firestoreUtils.getDocument('users', 'usernames');
    PASSWORD = passwordDoc[USERNAME];
    firestoreUtils.setDB(admin.firestore());
    
    startServer();
})();

/////////////////////////////////////////////////////////////
//                     CORE FUNCTIONS                      //
/////////////////////////////////////////////////////////////
async function initializeFirebase() {
    try {
        // Try environment variables first
        if (process.env.FIREBASE_PRIVATE_KEY_1 && process.env.FIREBASE_PRIVATE_KEY_2) {
            const serviceAccount = JSON.parse(
                process.env.FIREBASE_PRIVATE_KEY_1 + process.env.FIREBASE_PRIVATE_KEY_2
            );
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: "https://webgfa-games-default-rtdb.firebaseio.com"
            });
            console.log("Firebase initialized with environment variables");
            return true;
        }

        // Try single environment variable
        if (process.env.FIREBASE_PRIVATE_KEY) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_PRIVATE_KEY);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: "https://webgfa-games-default-rtdb.firebaseio.com"
            });
            console.log("Firebase initialized with single environment variable");
            return true;
        }

        // Try local file
        const filePath = path.resolve(__dirname, '../data/firebasePrivateKey.json');
        try {
            await fs.access(filePath, fs.constants.F_OK);
            const data = await fs.readFile(filePath, 'utf8');
            const serviceAccount = JSON.parse(data);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: "https://webgfa-games-default-rtdb.firebaseio.com"
            });
            console.log("Firebase initialized with local file");
            return true;
        } catch (fileError) {
            console.error("Firebase initialization failed - no valid credentials found");
            return false;
        }
    } catch (error) {
        console.error("Firebase initialization error:", error);
        return false;
    }
}

function clearLogFile(filePath) {
    fs.writeFile(filePath, '').then(() => console.log('Cleared log file')).catch(err => console.error('Log clear error:', err));
}

function basicAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return sendAuthChallenge(res);
    
    const [username, password] = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    (username === USERNAME && password === PASSWORD) ? next() : sendAuthChallenge(res);
}

async function handleMainRequest(req, res, next) {
    const reqPath = urlUtils.normalizePath(req.path);
    
    if (reqPath.includes('/api')) {
        await handleApiRequest(req, res);
    } else if (isHtmlRequest(reqPath)) {
        await serveHtmlFile(reqPath, res);
    } else {
        next();
    }
}

async function handleGitHubWebhook(req, res) {
    res.status(202).send('Accepted');
    if (req.headers['x-github-event'] === 'push') {
        exec('su - zion -c "cd /home/zion/WebGFA && git pull" && sudo systemctl restart webgfa.service', 
            (error, stdout, stderr) => console.log(error ? `Exec error: ${error}` : `Output: ${stdout}${stderr}`));
    }
}

async function startServer() {
    try {
        http.createServer(app).listen(HTTP_PORT, () => console.log(`HTTP on ${HTTP_PORT}`));
        const sslOptions = {
            key: await fs.readFile('/etc/letsencrypt/live/learnis.site/privkey.pem'),
            cert: await fs.readFile('/etc/letsencrypt/live/learnis.site/fullchain.pem')
        };
        https.createServer(sslOptions, app).listen(HTTPS_PORT, () => console.log(`HTTPS on ${HTTPS_PORT}${DEBUG ? ' (DEBUG)' : ''}`));
    } catch (err) {
        console.error('HTTPS startup failed:', err);
    }
}

/////////////////////////////////////////////////////////////
//                  HELPER FUNCTIONS                       //
/////////////////////////////////////////////////////////////
function sendAuthChallenge(res) {
    res.set('WWW-Authenticate', 'Basic realm="Secure Area"').status(401).send('Authentication required');
}

function isHtmlRequest(path) {
    return path === '/' || Boolean(path.match(/^\/(.*\.html$|.*\/$|[^\/\.]+\/?$)/));
}

async function handleApiRequest(req, res) {
    try {
        const { service, col, doc, data } = req.query;
        const handler = {
            'firestoreGetDoc': () => firestoreUtils.getDocument(col, doc),
            'firestoreSetDoc': () => firestoreUtils.setDocument(col, doc, data),
            'firestoreUpdateDoc': () => firestoreUtils.updateDocument(col, doc, data),
            'firestoreDeleteDoc': () => firestoreUtils.deleteDocument(col, doc)
        }[service];
        
        handler ? res.send(await handler()) : res.status(400).send('Invalid service');
    } catch (error) {
        console.error('API error:', error);
        res.status(500).send('Server error');
    }
}

async function serveHtmlFile(reqPath, res) {
    try {
        const fullPath = path.join(__dirname, '../static', reqPath.endsWith('.html') ? reqPath : reqPath + '/index.html');
        let html = await fs.readFile(fullPath, 'utf8');
        
        const filteredTags = extraTags.filter(tag => 
            !Object.entries(excludedTags).some(([path, excluded]) => 
                reqPath === path && tag === excluded));
        
        res.set('Content-Type', 'text/html').send(html.replace('</body>', filteredTags.join('') + '</body>'));
    } catch (error) {
        console.error('File serve error:', error);
        res.status(404).sendFile(path.join(__dirname, '../static/404.html'));
    }
}