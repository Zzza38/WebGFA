// handle log files, dont want them to be overwritten
// imports
const fs = require('fs');
const path = require('path');

function generateLogFileName() {
    const date = new Date();
    return `webgfa-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}--${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}.log`;
}
function getLogFileName(file) {
    if (!file) return null;
    // __dirname is the directory of the current module
    // not the directory of the file that is being executed
    // So we need the ../ to go up one directory
    let filePath = path.join(__dirname, '../', file);
    let fileData = fs.readFileSync(filePath);
    const logFileName = fileData.toString().match(/console\.log\("--NAME-START--"\);\s*console\.log\((.*?)\);\s*console\.log\("--NAME-END--"\);/);
    return logFileName ? logFileName[1] : 'webgfa-unknown.log';
}
function copyLogFile(oldLog, newLog) {
    // __dirname is the directory of the current module
    // not the directory of the file that is being executed
    // So we need the ../ to go up one directory
    const logPath = path.join(__dirname, '../', oldLog);
    const newLogPath = path.join(__dirname, '../', newLog);
    fs.copyFileSync(logPath, newLogPath);
}
module.exports = { 
    generateLogFileName,
    getLogFileName,
    copyLogFile
}