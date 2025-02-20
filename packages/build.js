const { exec } = require('child_process');

exec('git clone --branch Ad-Free https://github.com/UseInterstellar/Interstellar');
exec('npm install', { cwd: './Interstellar'});
