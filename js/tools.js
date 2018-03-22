import * as Ax from './ax';
import * as pstypes from './ndk-pstypes';
import * as pe from './pe-tools';
import * as J from './jtypes';

const R = require('ramda');

import * as L from 'loglevel';
const Log = L.getLogger('Ax.tools');

import * as Lazy from 'lazy.js';

import * as Err from 'errors';
import './errors';
const errors = Err.default;

Err.create({
    name: 'SymbolNotFoundError',
    defaultExplanation: 'Unable to locate the specified symbol.',
    parent: Err.RuntimeError,
});

/*
 * Scan across a memory region looking for MZ headers by iterating over mappings.
 * Return an array of all addresses in [0x1000, 0x7fffffff] that start with MZ

    let exes = ScanForExecutables(0x1000, 0xfffffff);

 * Assumption: MZ headers are page aligned, hence we search in increments of 0x1000
 */

export function ScanForExecutables(start, end) {
    return Lazy.generate(_ScanForExecutables(start, end))
               .take(1000)
               .filter( function(x) { if (!isNaN(x)) { return x; } }) // Need this check since the generator returns undefined when finished
               .toArray();
}

function _ScanForExecutables(start=Ax.PageSize, end=0x7fffffff) {
    let address = start;

    return function scans() {
        const sizeQ = R.allPass([R.is(Number), R.lte(0)]);
        const fingerprintQ = R.allPass([R.is(Number), R.equals(0x5A4D)]);

        while (address < end) {
            let [mbase, msize] = [Ax.mem_baseaddress(address), Ax.mem_size(address)];

            if (sizeQ([mbase, sizeQ(msize)])) {
                address = address + Ax.PageSize;
                continue;
            }

            // check that first word matches our header fingerprint
            let res = new J.Juint16(address);
            if (fingerprintQ(res.int())) {
                let ret_addr = address;
                address = address + msize;
                return ret_addr;
            }

            // skip to next mapping
            address = address + msize;
        }
    };
}

/*
 * Scan across a memory region looking for MZ headers by iterating over pages.
 * Return an array of all addresses in [0x1000, 0x7fffffff] that start with MZ

    let exes = ScanForExecutables(0x1000, 0xfffffff);

 * Assumption: MZ headers are page aligned, hence we search in increments of 0x1000
 */

export function ScanForExecutablesUnsafe(start, end) {
    return Lazy.generate(_ScanForExecutablesUnsafe(start, end))
               .take(1000)
               .filter( function(x) { if (!isNaN(x)) { return x; } }) // Need this check since the generator returns undefined when finished
               .toArray();
}

function _ScanForExecutablesUnsafe(start=Ax.PageSize, end=0x7fffffff) {
    let [address, msize] = [start, Ax.PageSize];

    return function scans() {
        const fingerprintQ = R.allPass([R.is(Number), R.equals(0x5A4D)]);
        while (address < end) {
            // check that first word matches our header fingerprint
            let res = new J.Juint16(address);
            if (fingerprintQ(res.int())) {
                let ret_addr = address;
                address = address + msize;
                return ret_addr;
            }

            // skip to next mapping
            address = address + msize;
        }
    };
}

/*
 * Scans for an array of bytes in a given memory range
 * Example: Look for the string 'in DOS mode' within [0x23e0000, 23e0000+500]

    import * as Lazy from 'lazy.js';

    let bytes = Lazy.default('in DOS mode')
                    .mapString( letter => letter.charCodeAt(0) )
                    .toArray();

    Lazy.default([0x23e0000])
        .map( addr  => ScanForBytes(bytes, addr, addr+500) )
        .map( addrs => Lazy.default(addrs).map(Ax.toHex).toArray() )
        .each(Log.debug);
 */
export function ScanForBytes(bytes, start, end) {
    return Lazy.range(start, end)
               .filter(function (addr) {
                    let found = Lazy.range(addr, addr + bytes.length)
                                    .map( addr => (new J.Juint8(addr)).int() )
                                    .zip(bytes)
                                    .every( z => z[0] == z[1]);

                    if (found) { return true; }
                    })
               .toArray();
}

/*
 * Read a number of bytes from a given address
 * Example: Read 10 bytes from the 0x1230000
 *
    let bytes = ReadBytes(0x1230000, 10);

    Log.debug(Lazy.default(bytes).map(Ax.toHex).toArray());
    4d,5a,90,0,3,0,0,0
 */

export function ReadBytes(ea, n) {
    let bytes = Lazy.generate(_ReadBytes(ea, 1))
                    .take(n)
                    .toArray();

    return bytes;
}

/*
 * Read a number of words from a given address
 * Example: Read 10 words from the 0x1230000
 *
    let words = ReadWords(0x1230000, 10);

    Log.debug(Lazy.default(words).map(Ax.toHex).toArray());
    5a4d,90,3,0,4,0,ffff,0
 */
export function ReadWords(ea, n) {
    let words = Lazy.generate(_ReadBytes(ea, 2))
                    .take(n)
                    .toArray();

    return words;
}

/*
 * Read a number of dwords from a given address
 * Example: Read 10 dwords from the 0x1230000
 *
    let dwords = ReadDwords(0x1230000, 10);

    Log.debug(Lazy.default(dwords).map(Ax.toHex).toArray());
    905a4d,3,4,ffff,b8,0,40,0
 */
export function ReadDwords(ea, n) {
    let dwords = Lazy.generate(_ReadBytes(ea, 4))
                     .take(n)
                     .toArray();

    return dwords;
}

/*
 * Read a number of qwords from a given address
 * Example: Read 10 qwords from the 0x1230000
 *
    let qwords = ReadQwords(0x1230000, 10);

    Log.debug(Lazy.default(qwords).map(Ax.toHex).toArray());
    300905a4d,ffff00000004,b8,40,0,0,0,f000000000
 */
export function ReadQwords(ea, n) {
    let qwords = Lazy.generate(_ReadBytes(ea, 8))
                     .take(n)
                     .toArray();

    return qwords;
}

/*
 * Infinitely read bytes from a given address (to be used with Lazy)
 * Example: Read 10 dwords from 0xdeadbeef

    let dwords = Lazy.generate(_ReadBytes(0xdeadbeef, 4))
                     .take(n)
                     .toArray();

    return dwords;
 *
 */
function _ReadBytes(ea, bytes=1) {
    let address = ea;

    return function reads() {
        const res = Ax.loadui(address, bytes);
        address = address + bytes;
        return res;
    };
}

/*
 * Internal function used for writing arbitrary data to a memory space
 * Arguments:
 *  ea: address to start writing
 *  new_bytes: array of ints to write
 *  bytes: number of bytes that each number will take up in memory
 * Example: Write 1 to 0xdead0000 and 2 to 0xdead0001
 *   let new_bytes = [1, 2];
 *   let ea = 0xdead0000;
 *  _WriteData(ea, new_bytes, 1);
 */
function _WriteData(ea, new_bytes, bytes=1) {
    Lazy.range(ea, ea + (new_bytes.length)*bytes, bytes)
        .zip(new_bytes)
        .each( z => {
            const [addr, b] = [z[0], z[1]];
            Log.debug(`Writing ${bytes} bytes: Addr: ${addr} (0x${Ax.toHex(addr)}), New Bytes: ${b} (0x${Ax.toHex(b)})`);
            Ax.storeui(addr, bytes, b);
        });
}

/*
 * Write a sequence of bytes to the address ea
 *
 * Example: Write bytes 0x12, 0x34, 0x56 to address 0x10770
 *
 *   let bytes = [0x12, 0x34, 0x56];
 *   let ea = 0x10770;
 *   WriteBytes(ea, bytes);
*/
export function WriteBytes(ea, new_bytes) {
    _WriteData(ea, new_bytes, 1);
}

/*
 * Write a sequence of words to the address ea
 *
 * Example: Write words 0x0012, 0x0034, 0x0056 to address 0x10770
 *
 *   let words = [0x12, 0x34, 0x56];
 *   let ea = 0x10770;
 *   WriteWords(ea, words);
*/
export function WriteWords(ea, new_bytes) {
    _WriteData(ea, new_bytes, 2);
}

/*
 * Write a sequence of dwords to the address ea
 *
 * Example: Write dwords 0xdeadbeef, 0xcafebabe, 0x41414141 to address 0x10770
 *
 *   let dwords = [0xdeadbeef, 0xcafebabe, 0x41414141];
 *   let ea = 0x10770;
 *   WriteDwords(ea, dwords);
*/
export function WriteDwords(ea, new_bytes) {
    _WriteData(ea, new_bytes, 4);
}

/*
 * Write a sequence of qwords to the address ea
 *
 * Example: Write qwords 0xdeadbeefcafebabe, 0x4141414142424242 to address 0x10770
 *
 *   let qwords = [0xdeadbeefcafebabe, 0x4141414142424242];
 *   let ea = 0x10770;
 *   WriteQwords(ea, qwords);
*/
export function WriteQwords(ea, new_bytes) {
    _WriteData(ea, new_bytes, 8);
}

/*
 * Time the execution of a closure F(x) in milliseconds and return it
 * along with it's result.
 *
 * Example: Sleep for 3 seconds and clock it.
 *
 *   function sleep(secs) {
 *     const [tick, ms] = [Date.now(), secs * 1000];
 *     while (Date.now() - tick < ms);
 *     return Date.now() - tick;
 *   }
 *
 *   let [to, result] = Clock(sleep, 3);
 */
export function Clock(F, ...x) {
    const now = (typeof performance == "object" && typeof performance.now != "undefined")? (() => performance.now()) : (() => Date.now());
    let [start, result, stop] = [now(), F(...x), now()];
    return [stop - start, result];
}

/*
 * Yield the address of each module stored in the .Ldr field of the PEB
 * at the specified `pebaddr`.
 *
 * Example: Iterate through all modules in PEB.Ldr and output their name
 *          and base address.
 *
 *   let pebaddress = 0x7efde000;
 *   for (let m of LdrWalk(pebaddress)) {
 *       let [ea, cb] = [m.field('DllBase'), m.field('SizeOfImage')];
 *       let [ea_x, cb_x] = [ea.int().toString(16), cb.int().toString(16)];
 *       Log.debug(`${ea_x}+${cb_x} : ${m.field('BaseDllName').str()} : ${m.field('FullDllName').str()}`);
 *   }
 */
export function* LdrWalk(pebaddr) {
    let peb = new pstypes.PEB(pebaddr);

    let ldrp = peb.field('Ldr');
    let ldr = ldrp.d;
    let ml = ldr.field('InLoadOrderModuleLoadList');
    let res = ml.field('Flink');
    let sentinel = res;
    while (res.int() != sentinel.address) {
        res = res.d;
        yield res;
        res = res.field('InLoadOrderLinks').field('Flink');
    }
    return;
}

/*
 * Walk through each entry in the PEB.Ldr returning the the base
 * address for the first one that `crit(module)` returns true for.
 *
 * Example: Iterate through all modules in PEB.Ldr looking for ntdll.dll.
 *
 *   let pebaddress = 0x7efde000;
 *   let ntdll_base = LdrFindModule(
 *       pebaddress,
 *       m => m.field('BaseDllName').str().toLowerCase() == 'ntdll.dll'
 *   );
 *
 */
export function LdrFindModule(peb, crit) {

    // Walk through each module in the Ldr.
    for (let m of LdrWalk(peb)) {
        // Check to see if we found a module that matches our prefix.
        if (crit(m))
            return m.field('DllBase').int();

        // Log any modules that we skipped
        let [sn, ln] = [m.field('BaseDllName'), m.field('FullDllName')];
        let [ea, cb] = [m.field('DllBase'), m.field('SizeOfImage')];
        let [ea_x, cb_x] = [ea.int().toString(16), cb.int().toString(16)];
        Log.debug(`LdrFindModule(${peb}, ...): Ignoring non-match : ${ea_x}+${cb_x} : ${sn.str()} : ${ln.str()}`);
    }
    throw new errors.ModuleNotFoundError();
}

/*
 * Given a module handle/address and a symbol name, return it's
 * address.
 *
 * Example: Using the kernel32.dll module, return the address of
 *          the NtAllocateVirtualMemory entrypoint within ntdll.dll.
 *
 *   let kernel32_address = 0x6b800000
 *   let ea = GetImportAddress(
 *       kernel32_address,
 *       'ntdll.dll!NtAllocateVirtualMemory'
 *   );
 *   Log.debug(`&NtAllocateVirtualMemory: ${ea.toString(16)});
 */
export function GetImportAddress(handle, symbol) {
    // XXX: Ordinals are not supported due to forwarded RVA not being
    //      implemented by pe.GetModuleImports..
    let [module, name] = symbol.split('!');

    // Walk through the imports in the specified module
    let list = pe.GetModuleImports(handle, module);
    for (let i = 0; i < list.length; i++) {
        let [hint, res] = list[i];
        if (hint[1] == name)
            return res;
        Log.debug(`GetImportAddress(0x${Ax.toHex(handle)}, "${symbol}") : Skipping Symbol due to non-match of ${name} : ${hint}`);
    }

    // Okay, we didn't find shit...
    Log.warn(`GetImportAddress(0x${Ax.toHex(handle)}, "${symbol}") : Unable to locate symbol in module's import table`);
    throw new errors.SymbolNotFoundError(symbol);
}

/*
 * Given a module handle/address and an export name, return it's
 * function address by walking the export table.
 *
 * Example: Using the kernel32.dll module, return the address of
 *          the RtlCaptureContext function.
 *
 *   let kernel32_address = 0x6b800000
 *   let ea = GetExportAddress(
 *       kernel32_address,
 *       'RtlCaptureContext'
 *   );
 *   Log.debug(`&kernel32!RtlCaptureContext: ${ea.toString(16)});
 */
export function GetExportAddress(handle, name) {
    // Get the exports from the PE at the given handle
    let exports = pe.GetModuleExports(handle);
    for (let i = 0; i < exports.length; i++) {
        let [n, res] = exports[i];
        if (n == name)
            return res;
        Log.debug(`GetExportAddress(0x${Ax.toHex(handle)}, "${name}") : Skipping symbol due to non-match of ${name} : ${n}`);
    }

    // Nothing found!
    Log.warn(`GetExportAddress(0x${Ax.toHex(handle)}, "${name}") : Unable to locate symbol in module.`);
    throw new errors.SymbolNotFoundError(symbol);
}

/*
 * Given the PEB and a symbol name, return it's address.
 *
 * Example: Find the address of VirtualProtectEx within kernelbase.dll
 *
 *   let pebaddr = 0x7fde0000
 *   let ea = GetProcAddress(
 *       pebaddr,
 *       'kernelbase.dll!VirtualProtectEx'
 *   );
 *   Log.debug(`&kernelbase!VirtualProtectEx: ${ea.toString(16)});
 */
export function GetProcAddress(pebaddress, symbol) {
    let [module, name] = symbol.split('!');

    // Find the correct module here first.
    const path_separator = '\\';
    let dllbase;
    for (let m of LdrWalk(pebaddress)) {
        let [sn, ln] = [m.field('BaseDllName').str(), m.field('FullDllName').str()];
        if (sn == module || ln.endsWith(`${path_separator}${module}`)) {
            dllbase = m.field('DllBase').int();
            break;
        }
        Log.debug(`GetProcAddress(0x${Ax.toHex(pebaddress)}, "${symbol}") : Skipping module due to non-match of ${module} : ${sn} ${ln}`);
    }
    if (typeof dllbase == "undefined")
        throw new errors.SymbolNotFoundError(symbol);

    // Now we can find the symbol index.
    return GetExportAddress(dllbase, name);
}

/*
 * CRC32 implementation
 * Example:
 *  let bytes = ReadBytes(0xdeadbeef, 100);
 *  let crc = crc32(0, bytes);
 */

export function Crc32(crc, buff) {
    crc = 0xffffffff & ~crc;
    for (let i = 0; i < buff.length; i++) {
        crc = crc ^ buff[i];
        for (let j = 0; j < 8; j++) {
            crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
        }
    }
    return (0xffffffff & ~crc) >>> 0;
}

/*
 * Attempts to find a given module by reading N bytes from each
 * address in the addrs argument looking for the given crc
 *
 * Arguments:
 *  addrs - Array of addresses to read from
 *  num_bytes - Number of bytes to read and calculate each crc
 *  target - Target crc
 *
 * Example - Find the crc 0xdeadbeef of the first 250 bytes of addresses in `exes`
 *  let prot_crc = 0xdeadbeef;
 *  Log.debug('kernel32', Ax.toHex(CRCFindModule(exes, 250, prot_crc)));
 *
 * Return - Address of the target CRC if found or undefined otherwise
 */
export function CRCFindModule(addrs, num_bytes, target) {
    let crcs = {};
    addrs.map( addr => [addr, ReadBytes(addr, num_bytes)])
         .map( args => {
             let [addr, bytes] = args;
             let res = [addr, Crc32(0, bytes)];
             return res;
         })
         .map( args => {
             let [addr, crc] = args;
             crcs[crc] = addr;
         });

    return crcs[target];
}
