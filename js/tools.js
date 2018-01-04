import { ofHex, toHex, Ax } from './ax';
const R = require('ramda');

import * as L from 'loglevel';
const Log = L.getLogger('tools');

import * as Lazy from 'lazy.js';

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
    TODO
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
 
    let dwords = Lazy.generate(_ReadBytes(0xdeadbeef, 10))
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

