import { spawn } from 'child_process';
import * as fs from 'fs';
import path from 'path';
import config from '../config.json';

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
async function writeJSONChanges(json, jsonPath = "../config.json") {
    try {
        await fs.writeFile(path.resolve(__dirname, jsonPath), JSON.stringify(json, null, 2));
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
            fs.rm(targetPath, {recursive: true, force: true});
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
                config.installed.interstellar = true;
                await writeJSONChanges(config);
            } catch (error) {
                console.error("Error updating Interstellar: ", error)
            }
        }
        if (config.features.webssh) {
            try {
                await runCommand('git fetch', { cwd: './webssh2' });
                await runCommand('git pull', { cwd: './webssh2' });
                await runCommand('npm install', { cwd: './webssh2' });
                config.installed.webssh = true;
                await writeJSONChanges(config);
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
                await runCommand('git clone --branch main https://github.com/UseInterstellar/Interstellar.git');
                await runCommand('npm install', { cwd: './Interstellar' });
                config.installed.interstellar = true;
                await writeJSONChanges(config);
            } catch (error) {
                console.error("Error when downloading and setting up Interstellar: ", error);
            }
        }

        // WebSSH2
        if (config.features.webssh) {
            try {
                await runCommand('git clone --branch main https://github.com/billchurch/webssh2.git');
                await runCommand('npm install --omit=dev', { cwd: './webssh2/app' });
                config.installed.webssh = true;
                await writeJSONChanges(config);
            } catch (error) {
                console.error("Error when downloading and setting up WebSSH2: ", error);
            }
        }

        // email is disabled
        /*
        if (process.arch == 'arm64') {
            try {
                await runCommand('sudo apt install -y chromium-browser');
            } catch (error) {
                try {
                    await runCommand('sudo pacman -S chromium')
                } catch (error) {
                    if (process.platform == 'win32') {
                        console.log('chromium for x64 was installed. this is fine but could be slow cuz of emulation.')
                    } else {
                        console.error('chromium was not installed. this is bad, and try to install it.')
                        console.error('if not at /usr/bin/chromium-browser then either move it there or change the path of the Chromium browser.')
                    }
                    
                }
            }
        }
        */
    })();
}