const _7z = require('7zip-min');
const myArgs = process.argv.slice(2);

const act = myArgs[0];
const src = myArgs[1];
const dst = myArgs[2];

console.log(act, src, dst);

switch (act) {
	case 'pack':
		_7z.pack(src, dst, err => {
			if (err) console.error(err);
		});
		
		break;
	
	case 'unpack':
		if (dst) {
			_7z.unpack(src, dst, err => {
				if (err) console.error(err);
			});
		} else {
			_7z.unpack(src, err => {
				if (err) console.error(err);
			});
		}
		
		break;
	
	default:
		console.error('action', act, 'unknown');
		process.exitCode = 1;
}
