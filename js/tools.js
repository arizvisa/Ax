import { ofHex, toHex, Ax } from './ax';
import { PEB } from './ndk-pstypes';
import { GetModuleImports } from './pe-tools';
const R = require('ramda');

import * as L from 'loglevel';
const Log = L.getLogger('tools');

import * as Lazy from 'lazy.js';

import * as errors from 'errors';
import './errors';

errors.create({
    name: 'SymbolNotFoundError',
    defaultExplanation: 'Unable to locate the specified symbol.',
    parent: errors.RuntimeError,
});

/*
 * Scan across a memory region looking for MZ headers
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

function _ScanForExecutables(start=0x1000, end=0x7fffffff) {
    let address = start;

    return function scans() {
        const sizeQ = R.allPass([R.is(Number), R.lte(0)]);
        const fingerprintQ = R.allPass([R.is(Number), R.equals(0x5A4D)]);

        while (address < end) {
            let [mbase, msize] = [Ax.mem_baseaddress(address), Ax.mem_size(address)];

            if (sizeQ([mbase, sizeQ(msize)])) {
                address = address + 0x1000;
                continue;
            }

            // check that first word matches our header fingerprint
            let res = Ax.uint16_t(address);
            if (fingerprintQ(res)) {
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
        .map( addrs => Lazy.default(addrs).map(toHex).toArray() )
        .each(console.log);
 */
export function ScanForBytes(bytes, start, end) {
    return Lazy.range(start, end)
               .filter(function (addr) {
                    let found = Lazy.range(addr, addr + bytes.length)
                                    .map( addr => Ax.uint8_t(addr) )
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

    console.log(Lazy.default(bytes).map(toHex).toArray());
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

    console.log(Lazy.default(words).map(toHex).toArray());
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

    console.log(Lazy.default(dwords).map(toHex).toArray());
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

    console.log(Lazy.default(qwords).map(toHex).toArray());
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
        let res;
        switch(bytes) {
            case 1:
                res = Ax.uint8_t(address);
                address = address + 1;
                break;
            case 2:
                res = Ax.uint16_t(address);
                address = address + 2;
                break;
            case 4:
                res = Ax.uint32_t(address);
                address = address + 4;
                break;
            case 8:
                res = Ax.uint64_t(address);
                address = address + 8;
                break;
            default:
                throw "[_ReadBytes] Received unknown byte length.";
        }

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
        .each( function(z) {
            let [addr, b] = [z[0], z[1]];
            console.log(`Writing ${bytes} bytes: Addr: ${addr} (0x${toHex(addr)}), New Bytes: ${b} (0x${toHex(b)})`);
            Ax.store(addr, bytes, b);
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
 * Time the execution of a closure F(x) and return it.
 */
export function Clock(F, ...x) {
    const Timer = new Blob([
        "let running = false;" +
        "self.addEventListener('message', function(msg) {" +
        "    running = !running;" +
        "});" +
        "let buf = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);" +
        "let counter = new Int32Array(buf);" +
        "Atomics.store(counter, 0, 0);" +
        "for(; !running;) {}" +
        "for(; running;) {" +
        "    Atomics.add(counter, 0, 1);" +
        "}" +
        "self.postMessage(counter);" +
        "self.close();"
    ]);
    let url = global.window.URL.createObjectURL(Timer);
    let worker = new Worker(url);

    let ticker;
    worker.onmessage = function(message) {
        ticker = message;
    };

    worker.postMessage();
    let result = F(...x);
    worker.postMessage();
    return [ticker, result];
}

export function* WalkLdr(pebaddr) {
    let peb = new PEB(pebaddr);

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

/* XXX: Ordinals are not supported. */
export function GetProcAddress(handle, symbol) {
    let [module, name] = symbol.split('!');
    let list = GetModuleImports(handle, module);
    for (let i = 0; i < list.length; i++) {
        let [hint, res] = list[i];
        if (hint[1] == name)
            return res;
        continue;
    }
    throw new errors.SymbolNotFoundError(symbol);
}
