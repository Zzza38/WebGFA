const { spawn } = require('child_process');
const fs = require('fs/promises');
const path = require('path');

// Function that runs a command as a single string
function runCommand(command, options = {}) {
    const proc = spawn(command, { shell: true, stdio: 'inherit', ...options });
    proc.on('error', (error) => {
        console.error(`Error executing command "${command}":`, error);
    });
}

async function cleanupDirectory() {
    const currentFile = path.basename(__filename);
    const files = await fs.readdir(process.cwd());
    await Promise.all(files.map(async file => {
        if (file !== currentFile) {
            const targetPath = path.join(process.cwd(), file);
            await fs.rm(targetPath, { recursive: true, force: true });
        }
    }));
}

// Needed to keep files in ./packages
process.chdir(__dirname);

// Removing all files in the directory except build.js
(async () => {
    await cleanupDirectory();
    // Cloning the repos
    runCommand('git clone --branch Ad-Free https://github.com/UseInterstellar/Interstellar');
    runCommand('git clone https://github.com/billchurch/webssh2.git');
    runCommand('git checkout current', { cwd: './webssh2' });


    // Installing dependencies
    runCommand('npm install', { cwd: './Interstellar' });
    runCommand('npm install --production', { cwd: './webssh2/app' });
})();