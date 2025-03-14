/////////////////////////////////////////////////////////////
//                   IMPORT STATEMENTS                     //
/////////////////////////////////////////////////////////////

// npm imports
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const http = require('http');
const { exec, spawn } = require('child_process');
const cookieParser = require('cookie-parser');
const crypto = require("crypto");
const EventEmitter = require('events');
require("dotenv").config()

// needed to have the directory be at /src, not / (relative to the package.json)
process.chdir(__dirname);

// custom imports
const emailUtils = require('./functions/emailUtils.js');
const urlUtils = require("./functions/urlUtils.js");
const logUtils = require('./functions/logFileUtils.js');
let db;
try {
    db = require("../data/database.json");
} catch {
    (async () => {
        await fs.copyFile("../data/default-database.json", "../data/database.json");
        db = require("../data/database.json");
        console.log("Database copied from default database file.")
    })();
}
let config;
try {
    config = require("../config.json");
} catch {
    (async () => {
        await fs.copyFile("../default-config.json", "../config.json");
        db = require("../config.json");
        console.log("Config copied from default config file.")
    })();
}
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
    // module tags to prevent variable definitions overlapping
    "<script src='/assets/js/aboutblankcloak.js' type='module'></script>",
    "<script src='/assets/js/autoSave.js' type='module'></script>",
    "<script src='/assets/js/particles.js'></script>",
    "<script async src=\"https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8561781792679334\" crossorigin=\"anonymous\"></script>",

    `<script> const config = JSON.parse('${JSON.stringify(config['client-config'])}')</script>`,
    "<div id='particles-js' style='position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1;'></div>"
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
    !Object.values(db.users).some(user => user.sessionID === sessionID) && res.cookie('uid', 'GUEST-ACCOUNT', { httpOnly: true, secure: true });
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
        startDependencies();
        startServer();
        if (!dev) emailUtils.startEmail();
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
    const user = !Object.keys(db.users).find(user => db.users[user].sessionID === sessionId) ? 'guest' : Object.keys(db.users).find(user => db.users[user].sessionID === sessionId);

    if (isHtmlRequest(reqPath)) {
        await serveHtmlFile(reqPath, res);
        const humanReadableDate = new Date().toLocaleString();
        let body = {};
        body['Path'] = reqPath;
        body['Username'] = user;
        body['UID'] = user !== 'guest' ? db.users[user].sessionID : 'GUEST-ACCOUNT';
        body['Date'] = humanReadableDate;
        const csvFilePath = path.resolve(__dirname, '../webgfa.csv');
        oldTable = await updateTable(body, csvFilePath, oldTable);
    } else {
        next();
    }
}

async function handleLogin(req, res) {
    const { username, password } = req.body;

    if (db.users[username].password === password) {
        // Set login cookies
        const uid = username === 'guest' ? 'GUEST-ACCOUNT' : generateUID();
        res.cookie('uid', uid, { httpOnly: true, secure: true });
        db.users[username].sessionID = uid;
        await writeJSONChanges(db);
        return res.status(200).send('Login successful');
    }

    res.status(401).send('Invalid credentials');
}

async function handleGitHubWebhook(req, res) {
    res.status(202).send('Accepted');
    if (config.features.githubAutoPull.pull == false) return;
    if (req.headers['x-github-event'] === 'push') {
        exec(`cd ${__dirname}../ && git pull`);
        exec(config.features.githubAutoPull.restartCommand);
        // if a restart command is not needed then put it to something like 'dir', works across OSes and does nothing
        // a fork would work well with this
    }
}

function startServer() {
    http.createServer(app).listen(HTTP_PORT, () => {
        console.log(`WebGFA running at port ${HTTP_PORT}`);
        console.log(`http://localhost:${HTTP_PORT}`);
    });
}

async function startDependencies() {
    let processes = [];
    let names = [];
    if (config.installed.interstellar) {
        processes.push(spawn("npm", ["start"], { cwd: "../packages/Interstellar", shell: true, env: { ...process.env, PORT: config.ports.interstellar } }));
        names.push("Interstellar");
    }
    if (config.installed.webssh) {
        processes.push(spawn("npm", ["start"], { cwd: "../packages/webssh2/app", shell: true, env: { ...process.env, PORT: config.ports.webssh } }));
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

async function writeJSONChanges(json, JSONpath = "../data/database.json") {
    try {
        await fs.writeFile(path.resolve(__dirname, JSONpath), JSON.stringify(json, null, 2));
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
        const user = sessionId === 'GUEST-ACCOUNT' ? 'guest' : Object.keys(db.users).find(user => db.users[user].sessionID === sessionId);

        // Validate user exists
        if (!user) return res.status(401).send('Unauthorized');

        const postHandler = {
            'getCSV': async () => {
                // Check permissions (make sure user has admin rights to get the csv)
                if (!db.users[user].permissions?.includes('admin')) {
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
                const premium = db.users[user].permissions?.includes('prem')
                    ? games.premiumGames || {}
                    : {};

                res.json({ ...base, ...premium });

            },
            'getTools': async () => {
                const base = games.tools || {};
                const premium = db.users[user].permissions?.includes('prem')
                    ? games.premiumGames || {}
                    : {};

                res.json({ ...base, ...premium });

            },
            'logout': async () => {
                // Clear session cookie
                res.clearCookie('uid');
                delete db.users[user].sessionID;
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
                db.users[user].save = data;
                await writeJSONChanges(db);
                res.json({ success: true });
            },
            'get-save': async () => {
                if (user === 'guest') return res.status(403).send('Forbidden for guests');
                res.json({ data: db.users[user].save });
            },
            'request-account-creation': async () => {
                const { username, email } = req.body;

                if (Object.keys(db.users).some(user => db.users[user].email === email)) return res.status(409).send("Account with this email already exists.");
                if (db.users.hasOwnProperty(username)) return res.status(409).send("Account with this username already exists.");
                if (false) return res.status(403).send("This email is blacklisted.");
                if (!emailUtils.isValidEmail(email)) return res.status(400).send("Invalid email format.");
                db.users[username] = {
                    password: "deactivated-account",
                    email: email,
                    creationID: generateUID()
                };
                await writeJSONChanges(db);
                const link = encodeURI(`https://${config.features.login.url}/account/create/?creationID=${db.users[username].creationID}&username=${username}`);

                emailUtils.sendEmail(email, 'Create Account with WebGFA', `
                    Hello ${email}! You have decided to create a WebGFA account.
                    To proceed, click on the link below!
                    ${link}
                `)
            },
            'create-account': async () => {
                let { username, password, creationID, updatedUsername } = req.body;
                if (db.users[username].creationID != creationID & !db.users[user].permissions?.includes('admin')) return res.status(403).send("The specified username either does not have a creationID specified or the creationID is wrong.");
                const oldUserEntry = db.users[username];

                if (updatedUsername) {
                    if (Object.keys(db.users).find(user => db.users[updatedUsernames])) return res.status(409).send("Account with this username already exists.")
                    username = updatedUsername;
                }
                db.users[username] = {
                    permissions: '',
                    password: password,
                    save: '',
                    sessionID: creationID,
                    email: oldUserEntry.email,
                    creationDate: new Date().toISOString()
                };

                if (!db.users[user].permissions?.includes('admin')) res.cookie('uid', creationID, { httpOnly: true, secure: true });
                return res.status(200).send('Account Created!')
            },
            'request-password-reset': async () => {
                const { username } = req.body;

                const email = db.users[username]?.email;
                if (!email) return res.status(404).send('Email not found');

                const resetID = generateUID();
                db.users[username].resetID = resetID;

                const link = encodeURI(`https://${config.features.login.url}/account/reset/?resetID=${resetID}&username=${username}`);

                emailUtils.sendEmail(email, "Change WebGFA Password", `
                    Hello ${username}! The password reset button was clicked for your username.
                    To proceed, click on the link below. If you didn't ask for this, then just ignore it.
                    ${link}
                `)
                return res.status(200).send('Password reset email sent.');
            },
            'reset-password': async () => {
                const { username, resetID, password } = req.body;
                if (db.users[username].resetID != resetID & !db.users[user].permissions?.includes('admin')) return res.status(403).send("The specified username either does not have a resetID specified or the resetID is wrong.");

                db.users[username].password = password;
                return res.status(200).send('Password successfully reset!');
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

        if (!html.includes('<body>')) {
            html += filteredTags.join('');
        } else {
            html = html.replace('<body>', '</body>' + filteredTags.join(''));
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
