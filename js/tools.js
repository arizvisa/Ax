import { ofHex, toHex, Ax } from './ax';
const R = require('ramda');

import * as L from 'loglevel';
const Log = L.getLogger('tools');

import * as Lazy from 'lazy.js';

/*
 * Scan across a memory region looking for MZ headers
 * Example use with Lazy:
 * Return an array of all addresses in [0x1000, 0x7fffffff] that start with MZ
 *
    Lazy.generate(ScanForExecutables(0x1000, 0x7fffffff), 500)
        .filter( function(x) { if (!isNaN(x)) { return x; } }) // Need this check since the generator returns undefined when finished
        .toArray();

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
