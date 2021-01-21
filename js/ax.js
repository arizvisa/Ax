import * as utils from './utils';

import * as L from 'loglevel';
const Log = L.getLogger('Ax.ax');

// int3 breakpoint using Ax-Control
export function breakpoint() {
    return Ax.breakpoint();
}

// Disassemble some address
export function disassemble(address, count) {
    return Ax.disassemble(address, count);
}

// Dump some data
export function dump(address, size, type) {
    return Ax.dump(address, size, type);
}

export function getlasterror() {
    return Ax.getlasterror();
}

export function geterrormessage(errCode) {
    return Ax.geterrormessage(errCode);
}

export function getProcessPeb() {
    return Ax.Peb();
}

export function ansistring(address) {
    return Ax.ansistring(address);
}

export function unicodestring(address) {
    return Ax.unicodestring(address);
}

export function mem_baseaddress(address) {
    return Ax.mem_baseaddress(address);
}

export function mem_size(address) {
    return Ax.mem_size(address);
}

export function mem_state(address) {
    return Ax.mem_state(address);
}

export function mem_protect(address) {
    return Ax.mem_protect(address);
}

export function mem_type(address) {
    return Ax.mem_type(address);
}

/*
 * Memory Backend
 * Attempt to write an unsigned `integral` of `size` bytes to `address`.
 * Returns the number of bytes successfully written.
 */
export function store(address, size, integral) {
    let cb = (size < 8)? size : 8;
    // FIXME: return undefined or 0 on a writing failure
    let res = Ax.store(address, cb, integral);
    return cb;
}

/*
 * Memory Backend
 * Attempt to read an unsigned integer of `size` bytes from `address`.
 * Returns a tuple containing the number of bytes read, and the integer.
 */
export function load(address, size) {
    // FIXME: return undefined on a loading failure
    switch (size) {
        case 0:
            return [0, 0];
        case 1:
            return [1, Ax.uint8_t(address)];
        case 2:
            return [2, Ax.uint16_t(address)];
        case 4:
            return [4, Ax.uint32_t(address)];
        case 8:
            return [8, Ax.uint64_t(address)];
    }
    return undefined;
}

/*
 * Memory Backend
 * This simulates a single-byte read from a given address. The
 * value that is read is always 0.
 */
export function fakeload(address, size) {
    return size > 0? [1, 0] : [0, 0];
}

/*
 * Memory Backend
 * This simulates a write to a given address. As writing isn't
 * possible, this will always return 0 meaning that 0 bytes
 * were written.
 */
export function fakestore(address, size, integral) {
    return 0;
}

// internal ActiveX object that this module wraps.
let ax;
try {
    ax = new ActiveXObject('Ax.Leaker.1');

    // assign our Ax-based implementations to the memory backend.
    global.document.__load__ = load;
    global.document.__store__ = store;

} catch(e) {
    Log.error("Unable to instantiate Ax-Control using typename \"Ax.Leaker.1\".");

    // return a dummy object that bitches everytime a property is fetched
    ax = utils.dummyobject(
        (target, name) => {
            Log.warn(`Returning undefined for Ax.${name} due to a missing method.`);
            return () => undefined;
        }
    );

    // assign our dummy implementations to the memory backend.
    Log.warn(`Assigning fake memory backend due to instantiation failure.`);
    global.document.__load__ = fakeload;
    global.document.__store__ = fakestore;
}
export const Ax = ax;
