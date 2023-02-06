const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const rcedit = require('rcedit');

const argv = yargs(hideBin(process.argv)).argv

if (!argv.exePath) {
	throw 'Executable path required! Set with --exe-path="..."';
}

rcedit(argv.exePath, argv);
