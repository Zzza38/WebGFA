const path = require('path');

module.exports = {
  apps: [{
    name: "WebGFA",
    script: "./server.js",
    instances: "max",
    exec_mode: "cluster",
    // Log settings
    out_file: path.join(__dirname, 'server.log'), // Same directory as config
    error_file: path.join(__dirname, 'server.log'), // Combine into one file
    merge_logs: true, // Merge stdout/stderr into one file
    log_date_format: "YYYY-MM-DD HH:mm Z", // Add timestamps
    // Other settings
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "production"
    }
  }]
};