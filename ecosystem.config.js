const path = require('path');
const config = require('./config.json');
const fs = require('fs');
fs.existsSync(path.join(__dirname, 'logs')) || fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });

const apps = [
  {
    name: "webgfa",
    script: "./src/server.js",
    instances: 2,
    exec_mode: "cluster",
    out_file: path.join(__dirname, 'logs/webgfa.log'),
    error_file: path.join(__dirname, 'logs/webgfa.log'),
    merge_logs: true,
    log_date_format: "YYYY-MM-DD HH:mm Z",
    autorestart: true,
    watch: false,
    ignore_watch: [
      "node_modules",
      "static",
      "logs"
    ],
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "production"
    }
  }
];
if (config.installed.interstellar) {
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
      NODE_ENV: "production"
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
      NODE_ENV: "production"
    }
  });
}

module.exports = { apps };