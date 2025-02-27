/////////////////////////////////////////////////////////////
//                   IMPORT STATEMENTS                     //
/////////////////////////////////////////////////////////////
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const http = require('http');
const { exec, spawn } = require('child_process');
const cookieParser = require('cookie-parser');
const crypto = require("crypto");
const EventEmitter = require('events');

const urlUtils = require("./functions/urlUtils.js");
const logUtils = require('./functions/logFileUtils.js');
const db = require("../data/database.json");
const config = require("../config.json");
const games = require("../games.json");

/////////////////////////////////////////////////////////////
//                 CONSTANTS & CONFIGURATION               //
/////////////////////////////////////////////////////////////

// Log file handling
fs.mkdir(path.resolve(__dirname, '../log'), { recursive: true }).catch(() => { });
try {
    logUtils.copyLogFile('../server.log', '../log/' + logUtils.getLogFileName('../server.log'));
    console.log('Copied ../server.log to ../log/' + logUtils.getLogFileName('../server.log'));
} catch (error) {
    console.error('Error when copying log file:', error);
}

const app = express();
const dev = process.argv.includes("--dev");
const HTTP_PORT = process.env.PORT ? process.env.PORT : dev ? config.ports.development : config.ports.main;
const logFilePath = path.resolve(__dirname, '../server.log');
const messageEmitter = new EventEmitter();

const extraTags = [
    // module tags to prevent variable reading
    "<script src='/assets/js/aboutblankcloak.js' type='module'></script>",
    "<script src='/assets/js/autoSave.js' type='module'></script>",
];

const excludedTags = {};

/////////////////////////////////////////////////////////////
//                  EXPRESS SERVER SETUP                   //
/////////////////////////////////////////////////////////////
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../static'), {
    index: false,
    extensions: ['html']
}));

app.use(express.json({ type: 'application/json' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    const sessionID = req.cookies.uid;
    if (!Object.values(db.users.sessionID).includes(sessionID)) res.cookie('uid', 'GUEST-ACCOUNT', { httpOnly: true, secure: true });;
    next();
});

// Post Requests
app.post('/webhook/github', handleGitHubWebhook);
app.post('/login', handleLogin);
app.post('/api', handleApiRequest);

// Get Requests
app.use('/api', handleApiRequest);
app.use(handleMainRequest);

/////////////////////////////////////////////////////////////
//                   SERVER INITIALIZATION                 //
/////////////////////////////////////////////////////////////
(async () => {
    try {
        await clearLogFile(logFilePath);
        console.log("--NAME-START--");
        console.log(logUtils.generateLogFileName());
        console.log("--NAME-END--");
        process.chdir(__dirname);
        startDependencies();
        startServer();
    } catch (error) {
        console.error('Initialization failed:', error);
        process.exit(1);
    }
})();

/////////////////////////////////////////////////////////////
//                     FUNCTIONS                           //
/////////////////////////////////////////////////////////////
async function clearLogFile(filePath) {
    try {
        await fs.writeFile(filePath, '');
        console.log('Cleared log file');
    } catch (err) {
        console.error('Log clear error:', err);
    }
}

async function handleMainRequest(req, res, next) {
    const reqPath = urlUtils.normalizePath(req.path);
    const sessionId = req.cookies.uid;
    const user = Object.keys(db.users.sessionID).find(user => db.users.sessionID[user] === sessionId);

    if (isHtmlRequest(reqPath)) {
        await serveHtmlFile(reqPath, res);
        const humanReadableDate = new Date().toLocaleString();
        let body = {};
        body['Path'] = reqPath;
        body['Username'] = user;
        body['UID'] = db.users.sessionID[user];
        body['Date'] = humanReadableDate;
        const csvFilePath = path.resolve(__dirname, '../webgfa.csv');
        oldTable = await updateTable(body, csvFilePath, oldTable);
    } else {
        next();
    }
}

async function handleLogin(req, res) {
    const { username, password } = req.body;

    if (db.users.usernames[username] === password) {
        // Set login cookies
        const uid = username === 'guest' ? 'GUEST-ACCOUNT' : generateUID();
        res.cookie('uid', uid, { httpOnly: true, secure: true });
        db.users.sessionID[username] = uid;
        await writeJSONChanges(db);
        return res.status(200).send('Login successful');
    }

    res.status(401).send('Invalid credentials');
}

async function handleGitHubWebhook(req, res) {
    res.status(202).send('Accepted');
    if (req.headers['x-github-event'] === 'push') {
        exec('su - zion -c "cd /home/zion/WebGFA-dev && git pull"');
        exec('su - zion -c "cd /home/zion/WebGFA && git pull" && systemctl restart webgfa');
    }
}

function startServer() {
    http.createServer(app).listen(HTTP_PORT, () =>
        console.log(`HTTP server running on port ${HTTP_PORT}`)
    );
}

async function startDependencies() {
    
    let processes = [];
    let names = [];
    if (config.features.interstellar) {
        processes.push(spawn("npm", ["start"], { cwd: "../packages/Interstellar", shell: true, env: { ...process.env, PORT: config.ports.interstellar }})); 
        names.push("Interstellar");
    }
    if (config.features.webssh) {
        processes.push(spawn("npm", ["start"], { cwd: "../packages/webssh2/app", shell: true, env: { ...process.env, PORT: config.ports.webssh }})); 
        names.push("WebSSH");
    }
    processes.forEach((proc, index) => {
        proc.on("exit", code => console.log(`${names[index]} exited with code ${code}`));
        proc.on("error", (err) => console.error(`${names[index]} failed:`, err));
    });

}

function generateUID() {
    const hex1 = crypto.randomBytes(2).toString("hex"); // 4 chars
    const hex2 = crypto.randomBytes(2).toString("hex"); // 4 chars
    const hex3 = crypto.randomBytes(1).toString("hex"); // 2 chars
    const hex4 = crypto.randomBytes(2).toString("hex"); // 4 chars
    const hex5 = crypto.randomBytes(3).toString("hex"); // 6 chars

    return `${hex1}-${hex2}-${hex3}-${hex4}-${hex5}`.toUpperCase();
}

async function writeJSONChanges(json, path = "../data/database.json") {
    try {
        await fs.writeFile(path.resolve(__dirname, path), JSON.stringify(json, null, 2));
    } catch (error) {
        console.error('Error writing database changes:', error);
    }
}

function isHtmlRequest(path) {
    return path === '/' || Boolean(path.match(/^\/(.*\.html$|.*\/$|[^\/\.]+\/?$)/));
}

async function handleApiRequest(req, res) {
    try {
        // Extract 'service' from the URL
        let service = req.path.split('/')[1];
        if (!service) return res.status(400).send('Missing service parameter');

        const sessionId = req.cookies.uid;
        const user = sessionId === 'GUEST-ACCOUNT' ? 'guest' : Object.keys(db.users.sessionID).find(user => db.users.sessionID[user] === sessionId);

        // Validate user exists
        if (!user) return res.status(401).send('Unauthorized');

        const postHandler = {
            'getCSV': async () => {
                // Check permissions (make sure user has admin rights to get the csv)
                if (!db.users.permissions[user]?.includes('admin')) {
                    return res.status(403).send('Forbidden');
                }

                try {
                    const csv = await fs.readFile('../webgfa.csv', 'utf8');
                    res.set('Content-Type', 'text/csv').send(csv);
                } catch (error) {
                    if (error.code === 'ENOENT') {
                        return res.status(404).send('File not found');
                    }
                    throw error;
                }
            },
            'getGames': async () => {
                const base = games.games || {};
                const premium = db.users.permissions[user]?.includes('prem')
                    ? games.premiumGames || {}
                    : {};

                res.json({ ...base, ...premium });

            },
            'getTools': async () => {
                const base = games.tools || {};
                const premium = db.users.permissions[user]?.includes('prem')
                    ? games.premiumGames || {}
                    : {};

                res.json({ ...base, ...premium });

            },
            'logout': async () => {
                // Clear session cookie
                res.clearCookie('uid');
                delete db.users.sessionID[user];
                await writeJSONChanges(db);
                res.redirect('/');
            },
            // Messaging API
            'send-message': async () => {
                const { content } = req.body;
                if (!content) return res.status(400).send('Missing content');
                if (user === 'guest') return res.status(403).send('Forbidden for guests');

                const id = Object.keys(db.messages).length + 1;
                const messageData = {
                    id,
                    content,
                    user,
                    timestamp: new Date().toISOString(),
                    edited: false
                };

                db.messages[id] = messageData;
                await writeJSONChanges(db);
                res.json(messageData);
                messageEmitter.emit('message');
            },
            'edit-message': async () => {
                const { id, content } = req.body;
                if (!id || !content) return res.status(400).send('Missing id or content');

                const message = db.messages[id];
                if (!message) return res.status(404).send('Message not found');

                if (message.user !== user) return res.status(403).send('Forbidden');

                message.content = content;
                message.edited = true;
                await writeJSONChanges(db);
                res.json(message);
                messageEmitter.emit('message');
            },
            'delete-message': async () => {
                const { id } = req.body;
                if (!id) return res.status(400).send('Missing id');

                const message = db.messages[id];
                if (!message) return res.status(404).send('Message not found');

                if (message.user !== user) return res.status(403).send('Forbidden');

                delete db.messages[id];
                await writeJSONChanges(db);
                res.json({ success: true });
                messageEmitter.emit('message');
            },
            'get-messages': async () => {
                res.json(db.messages);
            },
            'get-user': async () => {
                res.json({ user });
            },
            'save-data': async () => {
                const { data } = req.body;
                if (!data) return res.status(400).send('Missing data');
                if (user === 'guest') return res.status(403).send('Forbidden for guests');
                db.users.save[user] = data;
                await writeJSONChanges(db);
                res.json({ success: true });
            },
            'get-save': async () => {
                if (user === 'guest') return res.status(403).send('Forbidden for guests');
                res.json({ data: db.users.save[user] });
            },
            'save-changeLog': async () => {
                const { data } = req.body
                if (user !== 'sammy') return res.status(403).send('Sammy only');
                db.changeLog = data;
                await writeDatabaseChanges();
                res.json({ success: true });
            },
            'get-changeLog': async () => {
                if (user !== 'sammy') return res.status(403).send('Sammy only');
                res.json({ data: db.changeLog })
            }
         }[service];
        const getHandler = {
            'updates': async () => {
                res.set('Content-Type', 'text/event-stream');
                res.set('Cache-Control', 'no-cache');
                res.set('Connection', 'keep-alive');

                const sendUpdate = () => {
                    res.write("Update\n\n");
                }

                messageEmitter.on('message', sendUpdate);

                req.on('close', () => {
                    res.end();
                });
            },
        }[service];

        if (req.method === 'POST' && postHandler) {
            await postHandler();
        } else if (req.method === 'GET' && getHandler) {
            await getHandler();
        } else {
            res.status(400).send('Invalid service / method for service');
        }
    } catch (error) {
        console.error('API error:', error);
        res.status(500).send('Server error');
    }
    if (!res.headersSent) res.status(202).send('Status code not set, contact owner.');
}

async function serveHtmlFile(reqPath, res) {
    const staticDir = path.resolve(__dirname, '../static');
    try {
        const normalizedPath = urlUtils.normalizePath(reqPath);
        const fullPath = path.resolve(staticDir, normalizedPath.slice(1));

        // Security check
        if (!fullPath.startsWith(staticDir)) {
            console.log(fullPath)
            throw new Error('Invalid path');
        }

        let html = await fs.readFile(fullPath, 'utf8');

        const filteredTags = extraTags.filter(tag => {
            return !Object.entries(excludedTags).some(([pathKey, excludedTag]) => {
                const isMatchingPath = reqPath === pathKey || normalizedPath === pathKey;
                return isMatchingPath && tag === excludedTag;
            });
        });

        if (!html.includes('</body>')) {
            html += filteredTags.join('');
        } else {
            html = html.replace('</body>', filteredTags.join('') + '</body>');
        }

        res.set('Content-Type', 'text/html').send(html);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('File serve error:', error);
        }
        if (!res.headersSent) {
            res.status(404);
            try {
                await fs.access(path.join(staticDir, '404.html'), fs.constants.F_OK);
                res.sendFile(path.join(staticDir, '404.html'));
            } catch {
                res.type('txt').send('Not found');
            }
        }
    }
}

let oldTable = null;
async function updateTable(jsonObject, filePath, oldTable = null) {
    let table = oldTable || [];
    let headers = table.length > 0 ? table[0] : [];

    // Check for new keys
    const newKeys = Object.keys(jsonObject).filter(key => !headers.includes(key));
    if (newKeys.length > 0) {
        headers.push(...newKeys);
        if (table.length > 0) {
            table.slice(1).forEach(row => {
                newKeys.forEach(() => row.push(''));
            });
        }
        table[0] = headers;
    }

    // Create new row with CSV escaping
    const newRow = headers.map(header => {
        const value = jsonObject[header] || '';
        return `"${value.toString().replace(/"/g, '""')}"`;
    });

    table.push(newRow);

    // Write file
    const csvContent = table.map(row => row.join(',')).join('\n');
    await fs.writeFile(filePath, csvContent, 'utf8');
    return table;
}