const { spawn } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const config = require("../config.json");

const update = process.argv.includes("--update");

// chatgpt made a cool command so imma use it
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
async function writeJSONChanges(json, path = "../config.json") {
    try {
        await fs.writeFile(path.resolve(__dirname, path), JSON.stringify(json, null, 2));
    } catch (error) {
        console.error('Error writing database changes:', error);
    }
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

if (update) {
    (async () => {
        if (config.features.interstellar) {
            try {
                await runCommand('git fetch', { cwd: './Interstellar' });
                await runCommand('git pull', { cwd: './Interstellar' });
                await runCommand('npm install', { cwd: './Interstellar' });
            } catch (error) {
                console.error("Error updating Interstellar: ", error)
            }
        }
        if (config.features.webssh) {
            try {
                await runCommand('git fetch', { cwd: './webssh2' });
                await runCommand('git pull', { cwd: './webssh2' });
                await runCommand('npm install', { cwd: './webssh2' });
            } catch (error) {
                console.error("Error updating WebSSH: ", error)
            }
        }
    })();
} else {
    (async () => {
        await cleanupDirectory();

        // Interstellar
        if (config.features.interstellar) {
            try {
                await runCommand('git clone --branch Ad-Free https://github.com/UseInterstellar/Interstellar');
                await runCommand('npm install', { cwd: './Interstellar' });
                config.installed.interstellar = true;
                writeJSONChanges(config);
            } catch (error) {
                console.error("Error when downloading and setting up Interstellar: ", error);
            }
        }

        // WebSSH2
        if (config.features.webssh) {
            try {
                await runCommand('git clone https://github.com/billchurch/webssh2.git');
                await runCommand('npm install --omit=dev', { cwd: './webssh2/app' });
                config.installed.webssh = true;
                writeJSONChanges(config);
            } catch (error) {
                console.error("Error when downloading and setting up WebSSH2: ", error);
            }
        }
    })();
}