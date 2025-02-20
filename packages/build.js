const { exec } = require('child_process');

function pipe(proc) {
    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
}

pipe(exec('pwd'))
process.chdir(__dirname);
pipe(exec('pwd'))
// Interstellar
//pipe(exec('git clone --branch Ad-Free https://github.com/UseInterstellar/Interstellar'));
//pipe(exec('npm install', { cwd: './Interstellar' }));

