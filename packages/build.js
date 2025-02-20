const { spawn } = require('child_process');

// Function that runs a command as a single string
function runCommand(command, options = {}) {
    const proc = spawn(command, { shell: true, stdio: 'inherit', ...options });
    proc.on('error', (error) => {
        console.error(`Error executing command "${command}":`, error);
    });
}

// Needed to keep files in ./packages
process.chdir(__dirname);

// Interstellar
runCommand('git clone --branch Ad-Free https://github.com/UseInterstellar/Interstellar');
runCommand('npm install', { cwd: './Interstellar' });

