const FFI = require('ffi-napi')
const StructType = require('ref-struct-napi')
const UnionType = require('ref-union-napi')
const ref = require('ref-napi')

const MAPVK_VK_TO_VSC = 0;

const user32 = new FFI.Library('user32.dll', {
	// UINT SendInput(
	//   _In_ UINT cInputs,                     // number of input in the array
	//   _In_reads_(cInputs) LPINPUT pInputs,  // array of inputs
	//   _In_ int cbSize);                      // sizeof(INPUT)
	'SendInput': ['uint32', ['int32', 'pointer', 'int32']],
	// https://docs.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-mapvirtualkeya
	MapVirtualKeyA: ["uint", ["uint", "uint"]],
	// https://docs.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-vkkeyscana
	VkKeyScanA: ["short", ["char"]],
})

// typedef struct tagMOUSEINPUT {
//   LONG    dx;
//   LONG    dy;
//   DWORD   mouseData;
//   DWORD   dwFlags;
//   DWORD   time;
//   ULONG_PTR dwExtraInfo;
// } MOUSEINPUT;
const MOUSEINPUT = StructType({
	dx: 'int32',
	dy: 'int32',
	mouseData: 'uint32',
	flags: 'uint32',
	time: 'uint32',
	extraInfo: 'pointer',
})

// typedef struct tagKEYBDINPUT {
//   WORD    wVk;
//   WORD    wScan;
//   DWORD   dwFlags;
//   DWORD   time;
//   ULONG_PTR dwExtraInfo;
// } KEYBDINPUT;
const KEYBDINPUT = StructType({
	vk: 'uint16',
	scan: 'uint16',
	flags: 'uint32',
	time: 'uint32',
	extraInfo: 'pointer',
})

// typedef struct tagHARDWAREINPUT {
//   DWORD   uMsg;
//   WORD    wParamL;
//   WORD    wParamH;
// } HARDWAREINPUT;
const HARDWAREINPUT = StructType({
	msg: 'uint32',
	paramL: 'uint16',
	paramH: 'uint16',
})

// typedef struct tagINPUT {
//   DWORD   type;
//   union
//   {
//     MOUSEINPUT      mi;
//     KEYBDINPUT      ki;
//     HARDWAREINPUT   hi;
//   } DUMMYUNIONNAME;
// } INPUT;
const INPUT_UNION = UnionType({
	mi: MOUSEINPUT,
	ki: KEYBDINPUT,
	hi: HARDWAREINPUT,
})
const INPUT = StructType({
	type: 'uint32',
	union: INPUT_UNION,
})

const KEYEVENTF_SCANCODE = 0x0008;
const KEYEVENTF_KEYUP = 0x0002;

const sendKey = (keyCode, isVk, down) => {
	var scanCode;
	if (isVk) {
		scanCode = user32.MapVirtualKeyA(keyCode, MAPVK_VK_TO_VSC);
	} else {
		scanCode = user32.MapVirtualKeyA(user32.VkKeyScanA(keyCode) & 0xFF, MAPVK_VK_TO_VSC);
	}
	
	const keyUpKeyboardInput = KEYBDINPUT({vk: 0, extraInfo: ref.NULL_POINTER, time: 0, scan: scanCode, flags: KEYEVENTF_SCANCODE | (!down ? KEYEVENTF_KEYUP : 0)})
	const keyUpInput = INPUT({type: 1, union: INPUT_UNION({ki: keyUpKeyboardInput})})
	user32.SendInput(1, keyUpInput.ref(), INPUT.size)
}

module.exports = sendKey;
