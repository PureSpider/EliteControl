const UPX = require('upx')({
    best: true
});

const myArgs = process.argv.slice(2);
const src = myArgs[0];
const dst = myArgs[1];

UPX(src)
.output(dst)
.start()
.then(function(stats){
    /* stats:
    { cmd: 'compress',
    name: 'Compressed.exe',
    fileSize: { before: '1859072', after: '408064' },
    ratio: '21.95%',
    format: 'win32/pe',
    affected: 1 }
    */
    console.dir(stats);
}).catch(function (err) {
    // ...
});
