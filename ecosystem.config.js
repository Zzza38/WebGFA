const path = require('path');

module.exports = {
  apps: [{
    name: "WebGFA",
    script: "./src/server.js",
    instances: "max",
    exec_mode: "cluster",
    out_file: path.join(__dirname, 'server.log'),
    error_file: path.join(__dirname, 'server.log'), 
    merge_logs: true,
    log_date_format: "YYYY-MM-DD HH:mm Z",
    autorestart: true,
    watch: true, 
    ignore_watch: [
      "server.log",
      "static"
    ],    max_memory_restart: "1G",
    env: {
      NODE_ENV: "production"
    }
  }]
};