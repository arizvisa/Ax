import * as errors from 'errors';
import './errors';

import * as Lazy from 'lazy.js';

import * as L from 'loglevel';
const Log = L.getLogger('ax');

/* Constants */
const MAX_SAFE_INTEGER_BITS = 53;   // Standard ECMA-252 Ed-5.1 Sec-8.5

/* Error message types native memory interaction. */
errors.create({
    name: 'OutOfBoundsError',
    defaultExplanation: 'The specified integer is not within the required bounds.',
    parent: errors.IntegerError,
});

errors.create({
    name: 'LoadError',
    defaultExplanation: 'Unable to read from specified memory location.',
    parent: errors.NativeError,
});

errors.create({
    name: 'StoreError',
    defaultExplanation: 'Unable to write to specified memory location.',
    parent: errors.NativeError,
});

// internal ActiveX object for reading things from memory
export var Ax = new ActiveXObject('Ax.Leaker.1');

// numerical functions
export function toHex(n) {
    // TODO: use math.log to figure out which power of 2 this number
    //       fits within, and then pad it with 0s.
    return n.toString(16);
}
export function ofHex(s) {
    return parseInt(s, 16);
}

// wrappers
export function jsbreakpoint() {
    /* jshint -W087 */ debugger;
}

export function breakpoint() {
    return Ax.breakpoint();
}

export function dump(address, size, type) {
    return Ax.dump(address, size, type);
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

/*
 * Backend
 * Attempt to write an unsigned `integral` of `size` bytes to `address`.
 * Returns the number of bytes successfully written.
 */
function __store__(address, size, integral) {
    let cb = (size < 8)? size : 8;
    // FIXME: return undefined or 0 on writing failure
    let res = Ax.store(address, cb, integral);
    return cb;
}

/*
 * Backend
 * Attempt to read an unsigned integer of `size` bytes from `address`.
 * Returns a tuple containing the number of bytes read, and the integer.
 */
function __load__(address, size) {
    // FIXME: return undefined on loading failure
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
 * Store an array of bytes to `address`.
 * Return the number of bytes that were written.
 */
export function store(address, bytes) {
    // Figure out the maximum number of bytes we can write accurately
    const INTEGER_BITS = Math.pow(2, Math.trunc(Math.log(MAX_SAFE_INTEGER_BITS) / Math.log(2)));
    const INTEGER_BYTES = INTEGER_BITS / 8;

    // calls __store__(...) until it returns a size that's less than or equal to `c` while adjusting `n`.
    let fstore = (ea, c, n) => __store__(ea, c, n) || ((c-1 > 0)? fstore(ea, c-1, Math.trunc(n/256)) : 0);

    // loop through slicing data out of the `state` array using `fstore` to write as much as possible to memory.
    let [ea, res, state] = [address, 0, bytes.slice()];
    do {
        // figure out the integer and it's size
        let ci = (state.length > INTEGER_BYTES)? INTEGER_BYTES : state.length;
        let ni = state.slice(0, ci).reduce((agg, n) => agg * 256 + n);

        // try storing the integer to our address
        let cb = fstore(ea, ci, ni);
        if (!cb) {
            // FIXME: maybe throw an error here?
            Log.error(`store(${address}, ${bytes.toString()}) : Unable to write ${ci} leftover bytes for ${ni} to ${ea}.`);
            return res;
        }
        if (cb > ci)
            Log.warn(`store(${address}, ${bytes.toString()}) : Accidentally wrote more bytes than intended. (${cb} > ${ci})`);

        // whee, now we can slice out the part of the array we processed
        state = state.slice(cb);
        ea += cb; res += cb;
    } while (state.length > 0);

    if (res > bytes.length)
        throw new errors.StoreError(`store(${address}, ${bytes.toString()}) : Wrote ${res - bytes.length} bytes more than expected.`);
    return res;
}

/*
 * Store an unsigned `integral` of `size` bytes to the specified `address`.
 */
export function storeui(address, size, integral) {
    // Assert the integer can have things done with it
    if (!(integral <= Number.MAX_SAFE_INTEGER+1))
        throw new IntegerError(`storeui(${address}, ${size}, ${integral}) : Requested integer is larger than the bounds supported by the Javascript implementation. (${integral} > ${Number.MAX_SAFE_INTEGER+1})`);

    // Assert that the integer fits within the requestted size
    const MAX_INTEGRAL = Math.pow(2, size*8);
    if (!(integral >= 0 && integral <= MAX_INTEGRAL))
        throw new OutOfBoundsError(`storeui(${address}, ${size}, ${integral}) : Requested integer does not fit within the specified size. (${integral} > ${MAX_INTEGRAL})`);

    return storei(address, size, integral);
}

/*
 * Store a signed `integral` of `size` bytes to the specified `address`.
 */
export function storesi(address, size, integral) {
    if (!(Number.MIN_SAFE_INTEGER-1 <= integral <= Number.MAX_SAFE_INTEGER+1))
        throw new IntegerError(`storesi(${address}, ${size}, ${integral}) : Requested integer is not within the bounds supported by the Javascript implementation. (${integral} : ${Number.MIN_SAFE_INTEGER-1}<>${Number.MAX_SAFE_INTEGER+1})`);

    const [MIN_INTEGRAL, MAX_INTEGRAL] = [Math.pow(2, size*8) / -2, Math.pow(2, size*8) / 2 - 1];
    if (!(MIN_INTEGRAL <= integral <= MAX_INTEGRAL))
        throw new OutOfBoundsError(`storesi(${address}, ${size}, ${integral}) : Requested integer does not fit within the specified size. (${INTEGRAL} : ${MIN_INTEGRAL}<>${MAX_INTEGRAL})`);

    // Unsign our signed `integral`, and then just forward to storeui.
    let res = (integral < 0)? integral + MAX_INTEGRAL : integral;
    return storei(address, size, res);
}

/*
 * Internal implementation of storeui and storesi.
 */
function storei(address, size, integral) {

    // Internal integer writing function.
    function _storeui(address, size, integral) {
        // Try and store `integral` to address so we can figure out what was missed.
        let res = __store__(address, size, integral);
        if (!res)
            return res;

        // Recurse for any leftover parts of the integer.
        let ni = _storeui(address + res, size - res, Math.trunc(integral / Math.pow(2, 8*res)));
        if (ni > 0)                     // XXX: Can't tail-recurse because we need to check
            return res + ni;            //      for an infinite loop here..
        throw new errors.StoreError(`_storeui(${address}, ${size}, ${integral}) : Unable to write ${size - res} bytes to ${address + res}.`);
    }

    // Hand off to recursive function..
    return _storeui(address, size, integral);
}

/*
 * Load `size` bytes from `address` and return an array
 * integers containing their values.
 */
export function load(address, size) {
    let res = [];
    let [ea, total] = [address, 0];
    while (total < size) {
        let [cb, n] = __load__(ea, size);
        if (!cb) break;
        for (let i = 0; i < cb; i++) {
            res.push(n % 256);
            n = Math.trunc(n / 256);
        }
        ea += cb; total += cb;
    }
    if (total < size)
        throw new errors.LoadError(`load(${address}, ${size}) : Unable to read ${size - total} bytes from address ${ea}.`);
    return res.slice(0, size);
}

/*
 * Load an unsigned `integral` of `size` bytes from the specified `address`.
 */
export function loadui(address, size) {
    // Figure out the maximum number of bytes we can read accurately
    const INTEGER_BITS = Math.pow(2, Math.trunc(Math.log(MAX_SAFE_INTEGER_BITS) / Math.log(2)));
    const INTEGER_BYTES = INTEGER_BITS / 8;

    if (!(size <= INTEGER_BYTES))
        Log.warn(`loadui(${address}, ${size}) : Requested size is larger than the bounds supported by the Javascript implementation. Precision maybe affected. (${size} > ${INTEGER_BYTES})`);

    return loadi(address, size);
}

/*
 * Load a signed `integral` of `size` bytes from the specified `address`.
 */
export function loadsi(address, size) {
    const INTEGER_BITS = Math.pow(2, Math.trunc(Math.log(MAX_SAFE_INTEGER_BITS) / Math.log(2)));
    const INTEGER_BYTES = INTEGER_BITS / 8;

    if (!(size <= INTEGER_BYTES))
        Log.warn(`loadsi(${address}, ${size}) : Requested size is larger than the bounds supported by the Javascript implementation. Precision maybe affected. (${size} > ${INTEGER_BYTES})`);

    const [MIN_INTEGRAL, MAX_INTEGRAL] = [Math.pow(2, size*8) / -2, Math.pow(2, size*8) / 2 - 1];

    let res = loadi(address, size);
    return (res < MAX_INTEGRAL)? res : -1 * (Math.pow(2, size*8) - res);
}

/*
 * Internal implementation of loadui and loadsi.
 */
function loadi(address, size) {

    // calls __load__(...) until it returns a size that's less than or equal to `c`;
    let fload = (ea, c) => __load__(ea, c) || ((c-1 > 0)? fload(ea, c-1) : [0, 0]);

    // consume as many integers as we need from `address`.
    let [ea, components, total] = [address, [], 0];
    while (components.length == 0 || total < size) {
        let [cb, value] = fload(ea, size - total);
        if (!cb) break;
        components.push([cb, value]);
        ea += cb; total += cb;
    }
    components = components.reverse();

    // log information as necessary
    if (total < size)
        throw new errors.LoadError(`loadui(${address}, ${size}) : Unable to read ${size - total} bytes from address ${ea}.`);

    // handle any over-read (which should exist only in the last component)
    // TODO: this could probably be unit-tested...
    let over = total - size;
    if (over > 0) {
        Log.info(`loadui(${address}, ${size}) : Read ${total-size} more bytes than necessary due to integer read alignment. (${total} > ${size})`);
        let [lcb, lvalue] = components.slice(-1);
        if (lcb < over)
            throw new errors.AssertionError(`loadui(${address}, ${size}) : Size of integer in last component is smaller than adjust amount. (${lcb} < ${over})`);

        // we have `over` bytes that were read. build a divisor to remove them.
        let divisor = Math.pow(2, 8*(lcb-over));
        lvalue -= Math.trunc(lvalue / divisor) * divisor;
        components = components.slice(0, -1).concat([lcb - over, lvalue]);
    }

    // reduce the integers we read from `address` into one aggregate.
    return Lazy.default(components)
               .reduce(((agg, n) => agg * Math.pow(2, 8*n[0]) + n[1]), 0);
}

/*
 * Store a floating point number of `size` bytes from the specified `address`.
 */
export function storef(address, size, number) {
    // Determine the size of the exponent and the mantissa based on the number of bytes.
    let info;
    switch (size) {
        case 2:
            info = {sign: 1, exponent: 5, fractional: 10};
            break;
        case 4:
            info = {sign: 1, exponent: 8, fractional: 23};
            break;
        case 8:
            info = {sign: 1, exponent: 11, fractional: 52};
            break;
    }
    throw new errors.NotImplementedError(`storef(${address}, ${size}, ${number} : Function not implemented yet!`);
}

/*
 * Load a floating point number of `size` bytes from the specified `address`.
 */
export function loadf(address, size) {
    // Determine the size of the exponent and the mantissa based on the number of bytes.
    let info;
    switch (size) {
        case 2:
            info = {sign: 1, exponent: 5, fractional: 10};
            break;
        case 4:
            info = {sign: 1, exponent: 8, fractional: 23};
            break;
        case 8:
            info = {sign: 1, exponent: 11, fractional: 52};
            break;
    }
    throw new errors.NotImplementedError(`loadf(${address}, ${size}, ${number} : Function not implemented yet!`);
}
