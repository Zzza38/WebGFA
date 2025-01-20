// url utils
function normalizePath(reqPath) {
    const trimmedPath = reqPath.replace(/\/+$/, ''); // Remove trailing slashes
    const pathSegments = trimmedPath.split('/'); // Split the path into segments
    let fileName = '/' + pathSegments.pop().replace(/\/+$/, ''); // Get the last segment (file name)

    if (fileName == '/') {
        fileName = '/index.html'
    } else if (reqPath.endsWith('/')) {
        fileName += '/'
    }

    return pathSegments.join('/') + fileName;
}
module.exports = { 
    normalizePath
}
