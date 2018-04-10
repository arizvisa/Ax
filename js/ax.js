// internal ActiveX object for reading things from memory
export var Ax = new ActiveXObject('Ax.Leaker.1');

export function breakpoint() {
    return Ax.breakpoint();
}

export function disassemble(address, count) {
    return Ax.disassemble(address, count);
}

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
 * Backend
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
 * Backend
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
