// handle log files, dont want them to be overwritten
// imports
const fs = require('fs');
const path = require('path');

function generateLogFileName() {
    const date = new Date();
    return `webgfa-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}.log`;
}
function getLogFileName(file) {
    if (!file) return null;
    let filePath = path.join(__dirname, file);
    console.log(__dirname, file, filePath);
    let fileData = fs.readFileSync(filePath);
    const logFileName = fileData.toString().match(/console\.log\("--NAME-START--"\);\s*console\.log\((.*?)\);\s*console\.log\("--NAME-END--"\);/);
    return logFileName ? logFileName[1] : 'webgfa-unknown.log';
}
function copyLogFile(oldLog, newLog) {
    const logPath = path.join(__dirname, oldLog);
    const newLogPath = path.join(__dirname, newLog);
    fs.copyFileSync(logPath, newLogPath);
}
module.exports = { 
    generateLogFileName,
    getLogFileName,
    copyLogFile
}