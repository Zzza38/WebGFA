import path from "path";
import config from "../default-config.json" with {type: "json"};
import fs from "fs";
import readline from "readline";
import {fileURLToPath} from "url";

// needed to have the directory be at /src, not / (relative to the package.json)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.chdir(__dirname);

const newConfig = structuredClone(config); // Deep copy to avoid modifying the original config

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function prompt(question = '', defaultValue: string | number = ""): Promise<string> {
    return new Promise(resolve => {
        rl.question(question, answer => {
            resolve(answer.trim() === '' ? String(defaultValue) : answer);
        });
    });
}

async function writeJSONChanges(json: Object, jsonPath: string = "../config.json") {
    try {
        fs.writeFileSync(path.resolve(__dirname, jsonPath), JSON.stringify(json, null, 2));
    } catch (error) {
        console.error('Error writing database changes:', error);
    }
}

(async () => {
    console.log("=====================================");
    console.log("==== WebGFA Configuration Wizard ====");
    console.log("=====================================");

    console.log("\nPress [enter] for default options\n");

    console.log("Ports\n");

    newConfig.ports.main = Number(await prompt(`Port for general use (Default is ${config.ports.main}): `, config.ports.main));
    newConfig.ports.development = Number(await prompt(`Port for development use (Default is ${config.ports.development}): `, config.ports.development));
    newConfig.ports.interstellar = Number(await prompt(`Port for Interstellar Proxy (Default is ${config.ports.interstellar}): `, config.ports.interstellar));
    newConfig.ports.webssh = Number(await prompt(`Port for WebSSH (Default is ${config.ports.webssh}): `, config.ports.webssh));

    console.log("\nFeatures\n");

    newConfig.features.interstellar = (await prompt(`Is Interstellar enabled? (Default is ${config.features.interstellar ? "Y" : "N"}): `, config.features.interstellar ? "Y" : "N")).toLowerCase().includes("y");
    newConfig.features.webssh = (await prompt(`Is WebSSH enabled? (Default is ${config.features.webssh ? "Y" : "N"}): `, config.features.webssh ? "Y" : "N")).toLowerCase().includes("y");
    if (newConfig.features.interstellar) newConfig.features.interstellarURL = await prompt(`Interstellar URL: `, config.features.interstellarURL);
    if (newConfig.features.webssh) newConfig.features.websshURL = await prompt(`WebSSH URL: `, config.features.websshURL);
    newConfig.features.githubAutoPull.pull = (await prompt(`Is GitHub Auto Pull enabled? (Default is ${config.features.githubAutoPull.pull ? "Y" : "N"}): `, config.features.githubAutoPull.pull ? "Y" : "N")).toLowerCase().includes("y");
    if (newConfig.features.githubAutoPull.pull) newConfig.features.githubAutoPull.restartCommand = await prompt(`Restart command for after a GitHub pull (Default is ${config.features.githubAutoPull.restartCommand}): `, config.features.githubAutoPull.restartCommand);
    newConfig.features.login.enabled = (await prompt(`Is Login enabled? (Default is ${config.features.login.enabled ? "Y" : "N"}): `, config.features.login.enabled ? "Y" : "N")).toLowerCase().includes("y");
    if (newConfig.features.login.enabled) newConfig.features.login.emailEnabled = (await prompt(`Email enabled for logging in? (Default is ${config.features.login.emailEnabled ? "Y" : "N"}): `, config.features.login.emailEnabled ? "Y" : "N")).toLowerCase().includes("y");
    if (newConfig.features.login.emailEnabled) newConfig.features.login.email = await prompt(`Email for logging in (Default is ${config.features.login.email}): `, config.features.login.email);
    if (newConfig.features.login.enabled) newConfig.features.login.url = await prompt(`Main URL: `, config.features.login.url);

    console.log("\nClient Configuration\n");

    console.log("COLORS IN HEX, EXAMPLE: #FF6293");
    newConfig['client-config'].defaultColors.main = await prompt(`Main color (button color) (Default is ${config['client-config'].defaultColors.main}): `, config['client-config'].defaultColors.main);
    newConfig['client-config'].defaultColors.mainText = await prompt(`Main text color (Default is ${config['client-config'].defaultColors.mainText}): `, config['client-config'].defaultColors.mainText);
    newConfig['client-config'].defaultColors.buttonText = await prompt(`Button text color (Default is ${config['client-config'].defaultColors.buttonText}): `, config['client-config'].defaultColors.buttonText);
    newConfig['client-config'].defaultColors.bg = await prompt(`Background (Default is ${config['client-config'].defaultColors.bg}): `, config['client-config'].defaultColors.bg);

    console.log();
    newConfig['client-config'].name = await prompt(`Name of site (Default is ${config['client-config'].name}): `, config['client-config'].name);
    newConfig['client-config'].login = newConfig.features.login.enabled;
    newConfig['client-config'].email.enabled = newConfig.features.login.emailEnabled;
    if (newConfig['client-config'].email.enabled) newConfig['client-config'].email.email = newConfig.features.login.email;
    newConfig['client-config'].interstellarURL = newConfig.features.interstellarURL;

    await writeJSONChanges(newConfig);
    console.log("\nConfiguration Successfully Updated!");
    rl.close();
})();