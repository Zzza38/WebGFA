// url utils
function normalizePath(reqPath) {
    const trimmedPath = reqPath.replace(/\/+$/, ''); // Remove trailing slashes
    const pathSegments = trimmedPath.split('/'); // Split the path into segments
    let fileName = '/' + pathSegments.pop().replace(/\/+$/, ''); // Get the last segment (file name)

    if (reqPath === '/') {
        fileName = '/index.html'
    } else if (reqPath.endsWith('/')) {
        fileName += 'index.html';
    }
    return pathSegments.join('/') + fileName;
}
module.exports = { 
    normalizePath
}
