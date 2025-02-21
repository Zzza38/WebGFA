const { spawn } = require('child_process');
const fs = require('fs/promises');
const path = require('path');

// Updated runCommand to return a promise so commands can run sequentially
function runCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
        const [executable, ...args] = command.split(' ');
        const proc = spawn(executable, args, { shell: true, stdio: 'inherit', ...options });
        proc.on('error', (error) => {
            console.error(`Error executing command "${command}":`, error);
            reject(error);
        });
        proc.on('exit', (code) => {
            if (code !== 0) {
                console.error(`Command "${command}" exited with code ${code}`);
                reject(new Error(`Command "${command}" exited with code ${code}`));
            } else {
                resolve();
            }
        });
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
    // Cloning the repositories
    runCommand('git clone --branch Ad-Free https://github.com/UseInterstellar/Interstellar');
    await runCommand('git clone --branch current https://github.com/billchurch/webssh2.git');

    // Installing dependencies
    runCommand('npm install', { cwd: './Interstellar' });
    await runCommand('npm install --production', { cwd: './webssh2/app' });
})();