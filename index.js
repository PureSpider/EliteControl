// NOTES
// https://elite-journal.readthedocs.io/en/latest/Status%20File/
// https://github.com/joncage/ed-scout/blob/master/EDScoutWebUI/static/style.css
// https://grid.layoutit.com/?id=oPWxBam
// https://fonts.google.com/specimen/Orbitron
// http://patorjk.com/software/taag/#p=display&f=Bright

require('log-timestamp')(() => date());

const { homedir, networkInterfaces } = require('os');
const fs = require('fs');
const path = require('path');

const moment = require("moment");

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/*
.##..##..######..######..#####..
.##..##....##......##....##..##.
.######....##......##....#####..
.##..##....##......##....##.....
.##..##....##......##....##.....
................................
*/
const http = require('http').createServer(function (request, response) {
    log.log(date(), '  http', request.connection.remoteAddress, request.url);

    var filePath = '.' + request.url;
    if (filePath == './') {
        filePath = './index.html';
    }

    var extname = String(path.extname(filePath)).toLowerCase();
    var mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.wasm': 'application/wasm'
    };

    var contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(path.join(__dirname, 'assets', filePath), {encoding: 'utf-8'}, function(error, content) {
        if (error) {
            if(error.code == 'ENOENT') {
				response.writeHead(404, { 'Content-Type': 'text/html' });
				response.end('404', 'utf-8');
            }
            else {
                response.writeHead(500);
                response.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
            }
        }
        else {
            response.writeHead(200, { 'Content-Type': contentType });
            response.end(content, 'utf-8');
        }
    });
});

const io = require('socket.io')(http);

const sendKey = require('./sendKey');

function date() {
	return moment().format("[[]YYYY-MM-DD HH:mm:ss.SSS[]]");
}

const JOURNAL_DIR = path.join(homedir(), 'Saved Games', 'Frontier Developments', 'Elite Dangerous');
const STATUS_FILE = 'Status.json';

const f = path.join(JOURNAL_DIR, STATUS_FILE);

/*
.######..######..######...........####...######..######..##..##..#####..
.##......##........##............##......##........##....##..##..##..##.
.####....####......##.............####...####......##....##..##..#####..
.##......##........##................##..##........##....##..##..##.....
.##......##......######...........####...######....##.....####...##.....
........................................................................
*/
// FFI
const ffi = require('ffi-napi');
const wchar = require('ref-wchar-napi');
const ref = require('ref-napi');
const struct = require('ref-struct-napi');

// Create the struct required to save the window bounds
const Rect = struct({
	left: 'long',
	top: 'long',
	right: 'long',
	bottom: 'long'
});
const RectPointer = ref.refType(Rect);

// Required by QueryFullProcessImageName
// https://msdn.microsoft.com/en-us/library/windows/desktop/ms684880(v=vs.85).aspx
const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
const EVENT_SYSTEM_FOREGROUND = 3;
const WINEVENT_OUTOFCONTEXT = 0;
const WINEVENT_SKIPOWNPROCESS = 2;
const PM_REMOVE = 0x0001;

const VK_CONTROL = 0x11;
const VK_MENU = 0x12;

const msgType = ref.types.void;
const msgPtr = ref.refType(msgType);

// Create FFI declarations for the C++ library and functions needed (User32.dll), using their "Unicode" (UTF-16) version
const user32 = new ffi.Library('User32.dll', {
	// https://docs.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwineventhook
	SetWinEventHook: ["int", ["int", "int", "pointer", "pointer", "int", "int", "int"]],
	// https://docs.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-peekmessagea
	PeekMessageA: ["bool", [msgPtr, "int", "uint", "uint", "uint"]],
	// https://docs.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getmessagea
	GetMessageA: ["bool", [msgPtr, "int", "uint", "uint"]],
	// https://docs.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-messageboxa
	MessageBoxA: ["int32", ["int32", "string", "string", "int32"]],
	// https://docs.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getforegroundwindow
	GetForegroundWindow: ['pointer', []],
	// https://docs.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getwindowtexta
	GetWindowTextW: ['int', ['pointer', 'pointer', 'int']],
	// https://docs.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getwindowtextlengtha
	GetWindowTextLengthW: ['int', ['pointer']],
	// https://docs.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getwindowthreadprocessid
	GetWindowThreadProcessId: ['uint32', ['pointer', 'uint32 *']],
	// https://docs.microsoft.com/en-us/windows/desktop/api/winuser/nf-winuser-getwindowrect
	GetWindowRect: ['bool', ['pointer', RectPointer]]
});

const SIZE_T = 'uint64';

// https://docs.microsoft.com/en-us/windows/desktop/api/psapi/ns-psapi-_process_memory_counters
const ProcessMemoryCounters = struct({
	cb: 'uint32',
	PageFaultCount: 'uint32',
	PeakWorkingSetSize: SIZE_T,
	WorkingSetSize: SIZE_T,
	QuotaPeakPagedPoolUsage: SIZE_T,
	QuotaPagedPoolUsage: SIZE_T,
	QuotaPeakNonPagedPoolUsage: SIZE_T,
	QuotaNonPagedPoolUsage: SIZE_T,
	PagefileUsage: SIZE_T,
	PeakPagefileUsage: SIZE_T
});

const ProcessMemoryCountersPointer = ref.refType(ProcessMemoryCounters);

// Create FFI declarations for the C++ library and functions needed (psapi.dll)
const psapi = new ffi.Library('psapi', {
	// https://docs.microsoft.com/en-us/windows/desktop/api/psapi/nf-psapi-getprocessmemoryinfo
	GetProcessMemoryInfo: ['int', ['pointer', ProcessMemoryCountersPointer, 'uint32']]
});

// Create FFI declarations for the C++ library and functions needed (Kernel32.dll), using their "Unicode" (UTF-16) version
const kernel32 = new ffi.Library('kernel32', {
	// https://msdn.microsoft.com/en-us/library/windows/desktop/ms684320(v=vs.85).aspx
	OpenProcess: ['pointer', ['uint32', 'int', 'uint32']],
	// https://msdn.microsoft.com/en-us/library/windows/desktop/ms724211(v=vs.85).aspx
	CloseHandle: ['int', ['pointer']],
	// https://msdn.microsoft.com/en-us/library/windows/desktop/ms684919(v=vs.85).aspx
	QueryFullProcessImageNameW: ['int', ['pointer', 'uint32', 'pointer', 'pointer']]
});

/*
..####...######...####...######..##..##...####...........######..##.......####....####....####..
.##........##....##..##....##....##..##..##..............##......##......##..##..##......##.....
..####.....##....######....##....##..##...####...........####....##......######..##.###...####..
.....##....##....##..##....##....##..##......##..........##......##......##..##..##..##......##.
..####.....##....##..##....##.....####....####...........##......######..##..##...####....####..
................................................................................................
*/
// Bit masks for flags
const status_flags = {};

const DOCKED						= 1 << 0;
const LANDED						= 1 << 1;
const LANDING_GEAR_DOWN				= 1 << 2;
const SHIELDS_UP					= 1 << 3;
const SUPERCRUISE					= 1 << 4;
const FLIGHTASSIST_OFF				= 1 << 5;
const HARDPOINTS_DEPLOYED			= 1 << 6;
const IN_WING						= 1 << 7;
const LIGHTS_ON						= 1 << 8;
const CARGO_SCOOP_DEPLOYED			= 1 << 9;
const SILENT_RUNNING				= 1 << 10;
const SCOOPING_FUEL					= 1 << 11;
const SRV_HANDBRAKE					= 1 << 12;
const SRV_USING_TURRET_VIEW			= 1 << 13;
const SRV_TURRET_RETRACTED			= 1 << 14;
const SRV_DRIVEASSIST				= 1 << 15;
const FSD_MASSLOCKED				= 1 << 16;
const FSD_CHARGING					= 1 << 17;
const FSD_COOLDOWN					= 1 << 18;
const LOW_FUEL						= 1 << 19;
const OVERHEATING					= 1 << 20;
const HAS_LAT_LONG					= 1 << 21;
const IS_IN_DANGER					= 1 << 22;
const BEING_INTERDICTED				= 1 << 23;
const IN_MAINSHIP					= 1 << 24;
const IN_FIGHTER					= 1 << 25;
const IN_SRV						= 1 << 26;
const HUD_IN_ANALYSIS_MODE			= 1 << 27;
const NIGHT_VISION					= 1 << 28;
const ALTITUDE_FROM_AVERAGE_RADIUS	= 1 << 29;
const FSD_JUMP						= 1 << 30;
const SRV_HIGH_BEAM					= 1 << 31;

const actions = {
	HARDPOINTS_DEPLOYED: { key: '1' },
	NIGHT_VISION: { key: '2' },
	FLIGHTASSIST_OFF: { key: '3' },
	SILENT_RUNNING: { key: '4' },
	LIGHTS_ON: { key: '5' },
	LANDING_GEAR_DOWN: { key: '6' },
	CARGO_SCOOP_DEPLOYED: { key: '7' },
	ACTION_CHAFFS: { key: 'a' },
	ACTION_ECM: { key: 'i' },
	ACTION_SHIELDCELLS: { key: 'c' },
	ACTION_HEATSINK: { key: 'd' },
	ACTION_SYSTEM_MAP: { key: 'e' },
	ACTION_GALAXY_MAP: { key: 'h' }
};

/*
.######..######..##......######..........##...##...####...######...####...##..##..######..#####..
.##........##....##......##..............##...##..##..##....##....##..##..##..##..##......##..##.
.####......##....##......####............##.#.##..######....##....##......######..####....#####..
.##........##....##......##..............#######..##..##....##....##..##..##..##..##......##..##.
.##......######..######..######...........##.##...##..##....##.....####...##..##..######..##..##.
.................................................................................................
*/
// FILE WATCHER
const fileChanged = (filename) => {
	fs.readFile(filename, (err, data) => {
		if (err) throw err;
		
		var json;
		try {
			json = JSON.parse(data);
		} catch(e) {
			statusLog.log(date(), '{red-fg}could not parse status.json{/red-fg}');
			return;
		}
		
		statusLog.log(date(), 'flags updated', json.Flags.toString(2).padStart(32, '0'));
		
		status_flags.DOCKED = (json.Flags & DOCKED) === DOCKED;
		status_flags.LANDED = (json.Flags & LANDED) === LANDED;
		status_flags.LANDING_GEAR_DOWN = (json.Flags & LANDING_GEAR_DOWN) === LANDING_GEAR_DOWN;
		status_flags.SHIELDS_UP = (json.Flags & SHIELDS_UP) === SHIELDS_UP;
		status_flags.SUPERCRUISE = (json.Flags & SUPERCRUISE) === SUPERCRUISE;
		status_flags.FLIGHTASSIST_OFF = (json.Flags & FLIGHTASSIST_OFF) === FLIGHTASSIST_OFF;
		status_flags.HARDPOINTS_DEPLOYED = (json.Flags & HARDPOINTS_DEPLOYED) === HARDPOINTS_DEPLOYED;
		status_flags.IN_WING = (json.Flags & IN_WING) === IN_WING;
		status_flags.LIGHTS_ON = (json.Flags & LIGHTS_ON) === LIGHTS_ON;
		status_flags.CARGO_SCOOP_DEPLOYED = (json.Flags & CARGO_SCOOP_DEPLOYED) === CARGO_SCOOP_DEPLOYED;
		status_flags.SILENT_RUNNING = (json.Flags & SILENT_RUNNING) === SILENT_RUNNING;
		status_flags.SCOOPING_FUEL = (json.Flags & SCOOPING_FUEL) === SCOOPING_FUEL;
		status_flags.SRV_HANDBRAKE = (json.Flags & SRV_HANDBRAKE) === SRV_HANDBRAKE;
		status_flags.SRV_USING_TURRET_VIEW = (json.Flags & SRV_USING_TURRET_VIEW) === SRV_USING_TURRET_VIEW;
		status_flags.SRV_TURRET_RETRACTED = (json.Flags & SRV_TURRET_RETRACTED) === SRV_TURRET_RETRACTED;
		status_flags.SRV_DRIVEASSIST = (json.Flags & SRV_DRIVEASSIST) === SRV_DRIVEASSIST;
		status_flags.FSD_MASSLOCKED = (json.Flags & FSD_MASSLOCKED) === FSD_MASSLOCKED;
		status_flags.FSD_CHARGING = (json.Flags & FSD_CHARGING) === FSD_CHARGING;
		status_flags.FSD_COOLDOWN = (json.Flags & FSD_COOLDOWN) === FSD_COOLDOWN;
		status_flags.LOW_FUEL = (json.Flags & LOW_FUEL) === LOW_FUEL;
		status_flags.OVERHEATING = (json.Flags & OVERHEATING) === OVERHEATING;
		status_flags.HAS_LAT_LONG = (json.Flags & HAS_LAT_LONG) === HAS_LAT_LONG;
		status_flags.IS_IN_DANGER = (json.Flags & IS_IN_DANGER) === IS_IN_DANGER;
		status_flags.BEING_INTERDICTED = (json.Flags & BEING_INTERDICTED) === BEING_INTERDICTED;
		status_flags.IN_MAINSHIP = (json.Flags & IN_MAINSHIP) === IN_MAINSHIP;
		status_flags.IN_FIGHTER = (json.Flags & IN_FIGHTER) === IN_FIGHTER;
		status_flags.IN_SRV = (json.Flags & IN_SRV) === IN_SRV;
		status_flags.HUD_IN_ANALYSIS_MODE = (json.Flags & HUD_IN_ANALYSIS_MODE) === HUD_IN_ANALYSIS_MODE;
		status_flags.NIGHT_VISION = (json.Flags & NIGHT_VISION) === NIGHT_VISION;
		status_flags.ALTITUDE_FROM_AVERAGE_RADIUS = (json.Flags & ALTITUDE_FROM_AVERAGE_RADIUS) === ALTITUDE_FROM_AVERAGE_RADIUS;
		status_flags.FSD_JUMP = (json.Flags & FSD_JUMP) === FSD_JUMP;
		status_flags.SRV_HIGH_BEAM = (json.Flags & SRV_HIGH_BEAM) === SRV_HIGH_BEAM;
		
		io.emit('flags', status_flags);
		
		var tableData = [
			['Flag', 'Value']
		];
		
		for (const [key, value] of Object.entries(status_flags)) {
			tableData.push([key, value + '']);
		}
		
		table.setData(tableData);
	});
};

if (fs.existsSync(f)) {
	const debounce = require('debounce');
	const debouncedFileChanged = debounce(fileChanged, 100);
	
	fs.watch(f, (event, filename) => {
		if (filename && event === 'change') {
			debouncedFileChanged(f);
		}
	});
	
	debouncedFileChanged(f);
} else {
	console.error(f, 'not found!');
	user32.MessageBoxA(0, f + ' not found!', 'Error', 16);
	
	process.exitCode = 1;
	return;
}

/*
..####...######..#####...##..##..######..#####..
.##......##......##..##..##..##..##......##..##.
..####...####....#####...##..##..####....#####..
.....##..##......##..##...####...##......##..##.
..####...######..##..##....##....######..##..##.
................................................
*/
// SERVER
const ip = Object.values(networkInterfaces())
        .flat()
        .filter((item) => !item.internal && item.family === "IPv4")
        .find(Boolean).address;

const httpPort = 4000;

http.listen(httpPort, () => {
  log.log(date(), 'Listening on', ip + ':' + httpPort);
});

/*
..####....####....####...##..##..######..######..........######...####..
.##......##..##..##..##..##.##...##........##..............##....##..##.
..####...##..##..##......####....####......##..............##....##..##.
.....##..##..##..##..##..##.##...##........##......##......##....##..##.
..####....####....####...##..##..######....##......##....######...####..
........................................................................
*/
// SOCKET
io.on('connection', (socket) => {
	log.log(date(), 'socket', socket.conn.remoteAddress, 'connected');
	
	socket.emit('flags', status_flags);
	
	socket.on('disconnect', () => {
		log.log(date(), 'socket', socket.conn.remoteAddress, 'disconnected');
	});
	
	socket.on('action', (msg) => {
		// log.log(date(), 'action', msg, windowActive);
		
		if (windowActive) {
			sendShortcut(actions[msg].key);
			
			keyLog.log(date(), 'sent action', 'ctrl', 'alt', actions[msg].key);
		}
	});

	socket.on('request-active', () => {
		socket.emit('active', windowActive);
	});
});

async function sendShortcut(key) {
	sendKey(VK_CONTROL, true, true);
	await sleep(50);
	sendKey(VK_MENU, true, true);
	await sleep(50);
	sendKey(key, false, true);
	
	await sleep(100);
	
	sendKey(key, false, false);
	sendKey(VK_MENU, true, false);
	sendKey(VK_CONTROL, true, false);	
}

/*
.##...##..######..##..##..#####....####...##...##..........##......######...####...######..######..##..##..######..#####..
.##...##....##....###.##..##..##..##..##..##...##..........##........##....##........##....##......###.##..##......##..##.
.##.#.##....##....##.###..##..##..##..##..##.#.##..........##........##.....####.....##....####....##.###..####....#####..
.#######....##....##..##..##..##..##..##..#######..........##........##........##....##....##......##..##..##......##..##.
..##.##...######..##..##..#####....####....##.##...........######..######...####.....##....######..##..##..######..##..##.
..........................................................................................................................
*/
// WINDOW CHANGE LISTENER
var windowActive = false;

const pfnWinEventProc = ffi.Callback("void", ["pointer", "int", "pointer", "long", "long", "int", "int"],
	function (hWinEventHook, event, hwnd, idObject, idChild, idEventThread, dwmsEventTime) {
		const activeWindowHandle = hwnd;

		// Get memory address of the window handle as the "window ID"
		const windowId = ref.address(activeWindowHandle);
		
		// Get the window text length in "characters" to create the buffer
		const windowTextLength = user32.GetWindowTextLengthW(activeWindowHandle);
		
		// Allocate a buffer large enough to hold the window text as "Unicode" (UTF-16) characters (using ref-wchar-napi)
		// This assumes using the "Basic Multilingual Plane" of Unicode, only 2 characters per Unicode code point
		// Include some extra bytes for possible null characters
		const windowTextBuffer = Buffer.alloc((windowTextLength * 2) + 4);
		
		// Write the window text to the buffer (it returns the text size, but it's not used here)
		user32.GetWindowTextW(activeWindowHandle, windowTextBuffer, windowTextLength + 2);
		
		// Remove trailing null characters
		const windowTextBufferClean = ref.reinterpretUntilZeros(windowTextBuffer, wchar.size);
		
		// The text as a JavaScript string
		const windowTitle = wchar.toString(windowTextBufferClean);

		// Allocate a buffer to store the process ID
		const processIdBuffer = ref.alloc('uint32');
		
		// Write the process ID creating the window to the buffer (it returns the thread ID, but it's not used here)
		user32.GetWindowThreadProcessId(activeWindowHandle, processIdBuffer);
		
		// Get the process ID as a number from the buffer
		const processId = ref.get(processIdBuffer);
		
		// Get a "handle" of the process
		const processHandle = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, processId);

		if (ref.isNull(processHandle)) {
			return; // Failed to get process handle
		}

		// Set the path length to more than the Windows extended-length MAX_PATH length
		const pathLengthBytes = 66000;
		
		// Path length in "characters"
		const pathLengthChars = Math.floor(pathLengthBytes / 2);
		
		// Allocate a buffer to store the path of the process
		const processFileNameBuffer = Buffer.alloc(pathLengthBytes);
		
		// Create a buffer containing the allocated size for the path, as a buffer as it must be writable
		const processFileNameSizeBuffer = ref.alloc('uint32', pathLengthChars);
		
		// Write process file path to buffer
		kernel32.QueryFullProcessImageNameW(processHandle, 0, processFileNameBuffer, processFileNameSizeBuffer);
		
		// Remove null characters from buffer
		const processFileNameBufferClean = ref.reinterpretUntilZeros(processFileNameBuffer, wchar.size);
		
		// Get process file path as a string
		const processPath = wchar.toString(processFileNameBufferClean);
		
		// Get process file name from path
		const processName = path.basename(processPath);

		// Get process memory counters
		const memoryCounters = new ProcessMemoryCounters();
		memoryCounters.cb = ProcessMemoryCounters.size;
		const getProcessMemoryInfoResult = psapi.GetProcessMemoryInfo(processHandle, memoryCounters.ref(), ProcessMemoryCounters.size);

		// Close the "handle" of the process
		kernel32.CloseHandle(processHandle);
		
		// Create a new instance of Rect, the struct required by the `GetWindowRect` method
		const bounds = new Rect();
		
		// Get the window bounds and save it into the `bounds` variable
		const getWindowRectResult = user32.GetWindowRect(activeWindowHandle, bounds.ref());

		if (getProcessMemoryInfoResult === 0) {
			return; // Failed to get process memory
		}

		if (getWindowRectResult === 0) {
			return; // Failed to get window rect
		}

		// log.log(date(), processName, processName === 'EliteDangerous64.exe');
		
		windowActive = (processName === 'EliteDangerous64.exe');
		
		io.emit('active', windowActive);
		
		/*
		console.dir({
			platform: 'windows',
			title: windowTitle,
			id: windowId,
			owner: {
				name: processName,
				processId,
				path: processPath
			},
			bounds: {
				x: bounds.left,
				y: bounds.top,
				width: bounds.right - bounds.left,
				height: bounds.bottom - bounds.top
			},
			memoryUsage: memoryCounters.WorkingSetSize
		});
		*/
	}
);

process.on('exit', function() {
	// prevent garbage collection of the callback
	pfnWinEventProc;
});

user32.SetWinEventHook(EVENT_SYSTEM_FOREGROUND, EVENT_SYSTEM_FOREGROUND, null, pfnWinEventProc, 0, 0, WINEVENT_OUTOFCONTEXT | WINEVENT_SKIPOWNPROCESS);

function readMessage() {
	user32.PeekMessageA(ref.alloc(msgPtr), null, 0, 0, PM_REMOVE);

	setTimeout(readMessage, 10);
}

readMessage();

/*
.#####...##......######...####....####...######..#####...........##..##..######.
.##..##..##......##......##......##......##......##..##..........##..##....##...
.#####...##......####.....####....####...####....##..##..........##..##....##...
.##..##..##......##..........##......##..##......##..##..........##..##....##...
.#####...######..######...####....####...######..#####............####...######.
................................................................................
*/
// BLESSED CONSOLE UI
const blessed = require('blessed');
const screen = blessed.screen({
	smartCSR: true,
	dockBorders: true,
	bg: 'black'
});

var table = blessed.listtable({
		parent: screen,
		top: 0,
		left: 0,
		width: '35%',
		height: '75%',
		fg: 'white',
		bg: 'black',
		interactive: false,
		label: 'Flags',
		align: 'left',
		noCellBorders: true,
		border: {
			type: 'line'
		},
		style: {
			header: {
				fg: 'black',
				bg: 'white'
			},
			cell: {
				fg: 'white',
				bg: 'black'				
			},
			border: {
				fg: 'white',
				bg: 'black'
			}
		}
		, rows: [
			['Flag', 'Value']
		]
	}
);

var statusLog = blessed.log({
		parent: screen,
		top: 0,
		left: '35%-1',
		width: '65%+1',
		height: '35%',
		fg: "white",
		bg: 'black',
		border: {
			type: 'line',
			fg: 'white',
			bg: 'black'
		},
		label: 'Status Log',
		scrollOnInput: true,
		scrollable: true,
		alwaysScroll: true,
		tags: true,
		scrollbar: {
			ch: ' ',
			inverse: true
		}
	}
);

var keyLog = blessed.log({
		parent: screen,
		top: '35%-1',
		left: '35%-1',
		width: '65%+1',
		height: '40%+1',
		fg: "white",
		bg: 'black',
		border: {
			type: 'line',
			fg: 'white',
			bg: 'black'
		},
		label: 'Sent Actions',
		scrollOnInput: true,
		scrollable: true,
		alwaysScroll: true,
		scrollbar: {
			ch: ' ',
			inverse: true
		}
	}
);

var log = blessed.log({
		parent: screen,
		top: '75%-1',
		left: 0,
		width: '100%',
		height: '25%+1',
		fg: "white",
		bg: 'black',
		border: {
			type: 'line',
			fg: 'white',
			bg: 'black'
		},
		label: 'Web Log',
		scrollOnInput: true,
		keys: true,
		scrollable: true,
		alwaysScroll: true,
		scrollbar: {
			ch: ' ',
			inverse: true
		}
	}
);

log.focus();

screen.key(['q', 'C-c'], function(ch, key) {
	return process.exit(0);
});

screen.render();
