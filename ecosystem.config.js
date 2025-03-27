const path = require('path');
const config = require('./config.json');
const fs = require('fs');
fs.existsSync(path.join(__dirname, 'logs')) || fs.mkdirSync(path.join(__dirname, 'logs'), {
    recursive: true
});

function insertChdir(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error("File does not exist:", filePath);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // Check if it already has `process.chdir`
    if (content.includes("process.chdir(__dirname);") || content.includes("process.chdir(dirname);" || content.includes("__currentDirectoryPath"))) {
        console.log("process.chdir is already present.");
        return;
    }

    // Detect module system
    const isESM = content.includes("import") || content.includes("export") || content.includes("import.meta");

    let insertStatement;
    if (isESM) {
        insertStatement = `import { dirname } from 'path';\nimport { fileURLToPath } from 'url';\nconst __currentDirectoryPath = dirname(fileURLToPath(import.meta.url));\nprocess.chdir(__currentDirectoryPath);\n\n`;
    } else {
        insertStatement = `process.chdir(__dirname);\n\n`;
    }

    // Prepend the new code
    content = insertStatement + content; fs.writeFileSync(filePath, content, 'utf8'); console.log("Inserted process.chdir handling at the beginning of", filePath);
}

const apps = [{
    name: "webgfa",
    script: "./src/server.js",
    instances: 2,
    exec_mode: "cluster",
    out_file: path.join(__dirname, 'logs/webgfa.log'),
    error_file: path.join(__dirname, 'logs/webgfa.log'),
    merge_logs: true,
    log_date_format: "YYYY-MM-DD HH:mm Z",
    autorestart: true,
    watch: true,
    ignore_watch: [
        "node_modules",
        "static",
        "logs"
    ],
    max_memory_restart: "1G",
    env: {
        NODE_ENV: "production"
    }
}];
if (config.installed.interstellar) {
    insertChdir("./packages/Interstellar/index.js");
    apps.push({
        name: "interstellar",
        script: "./packages/Interstellar/index.js",
        instances: 1,
        out_file: path.join(__dirname, 'logs/interstellar.log'),
        error_file: path.join(__dirname, 'logs/interstellar.log'),
        merge_logs: true,
        log_date_format: "YYYY-MM-DD HH:mm Z",
        autorestart: true,
        watch: false,
        env: {
            NODE_ENV: "production",
            "PORT": config.ports.interstellar
        }
    });
}
if (config.installed.webssh) {
    apps.push({
        name: "webssh",
        script: "./packages/webssh2/app/index.js",
        instances: 1,
        out_file: path.join(__dirname, 'logs/webssh.log'),
        error_file: path.join(__dirname, 'logs/webssh.log'),
        merge_logs: true,
        log_date_format: "YYYY-MM-DD HH:mm Z",
        autorestart: true,
        watch: false,
        env: {
            NODE_ENV: "production",
            "PORT": config.ports.webssh
        }
    });
}

module.exports = {
    apps
};
