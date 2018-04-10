import * as Err from 'errors';
import './errors';
const errors = Err.default;

import * as L from 'loglevel';
const Log = L.getLogger('Ax.ax');

const MAX_SAFE_INTEGER_BITS = 53;   // Standard ECMA-252 Ed-5.1 Sec-8.5
export const PageSize = 0x1000;
export const PageAlign = (ea) => ea & ~(PageSize - 1);

/* Error message types native memory interaction. */
Err.create({
    name: 'OutOfBoundsError',
    defaultExplanation: 'The specified integer is not within the required bounds.',
    parent: Err.IntegerError,
});
Err.create({
    name: 'LoadError',
    defaultExplanation: 'Unable to read from specified memory location.',
    parent: Err.MemoryError,
});
Err.create({
    name: 'StoreError',
    defaultExplanation: 'Unable to write to specified memory location.',
    parent: Err.MemoryError,
});
Err.create({
    name: 'MissingBackendError',
    defaultExplanation: 'No backend for the requested function was defined.',
    parent: Err.StaticError,
});

/* calls global.document.__store__(...) until it returns a size that's less than or equal to `c` while adjusting `n`. */
// const fstore = (ea, c, n) => global.document.__store__(ea, c, n) || ((c-1 > 0)? fstore(ea, c-1, Math.trunc(n/256)) : 0);
export function fstore(ea, c, n) {
    do {
        let res = global.document.__store__(ea, c, n);
        if (res)
            return res;
        c--;
    } while(c > 0);
    return 0;
}

/* calls global.document.__load__(...) until it returns a size that's less than or equal to `c`. */
// const fload = (ea, c) => __load__(ea, c) || ((c-1 > 0)? fload(ea, c-1) : [0, 0]);
export function fload(ea, c) {
    do {
        let res = global.document.__load__(ea, c);
        if (res)
            return res;
        c--;
    } while(c > 0);
    return [0, 0];
}

/*
 * Store an array of bytes to `address`.
 * Return the number of bytes that were written.
 */
export function store(address, bytes) {
    // Figure out the maximum number of bytes we can write accurately
    const INTEGER_BITS = Math.pow(2, Math.trunc(Math.log(MAX_SAFE_INTEGER_BITS) / Math.log(2)));
    const INTEGER_BYTES = INTEGER_BITS / 8;

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

    // XXX: n >>> 0 will convert 32-bit signed to unsigned

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

    // XXX: n >> 0 will convert 32-bit unsigned to signed

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
        let res = fstore(address, size, integral);
        if (res == size)
            return res;

        // XXX: This code feels fishy. Re-work this logic someday...
        // Recurse for any leftover parts of the integer.
        let ni = _storeui(address + res, size - res, Math.trunc(integral / Math.pow(2, 8*res)));
        if (ni == size - res)           // XXX: Can't tail-recurse because we need to check
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
    // calls __load__(...) until it returns a size that's less than or equal to `c`;

    let res = [];
    let [ea, total] = [address, 0];
    while (total < size) {
        let [cb, n] = fload(ea, size);
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

    // XXX: n >>> 0 will convert 32-bit signed to unsigned

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

    // XXX: n >> 0 will convert 32-bit unsigned to signed

    let res = loadi(address, size);
    return (res < MAX_INTEGRAL)? res : -1 * (Math.pow(2, size*8) - res);
}

/*
 * Internal implementation of loadui and loadsi.
 */
function loadi(address, size) {

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
    return components.reduce(((agg, n) => agg * Math.pow(2, 8*n[0]) + n[1]), 0);
}

/*
 * Extract `count` bits from `result` starting at the specified `bit`.
 */
export function unpack(result, bit, count) {
    let [shift, divisor] = [Math.pow(2, bit), Math.pow(2, count)];
    let res = Math.trunc(result / shift);
    return res - (Math.trunc(res / divisor) * divisor);
}

/*
 * Write `count` bits from `value` into `result` starting at the specified `bit`.
 */
export function pack(result, bit, count, value) {
    if (0 <= value < Math.pow(2, count))
        Log.warn(`Requested value (${value}) does not fit within the specified number of bits (${count}).`);

    const truncate = (n, op) => Math.trunc(n / op) * op;

    const [left, right] = [Math.pow(2, bit + count), Math.pow(2, bit)];

    let res = truncate(result, left) + (result - truncate(result, right));
    return res + value;
}

/*
 * Decode a `number` from the IEEE754 format described by `components` and return a number.
 *
 * The `components` parameter is an object with the following fields:
 * {
 *     sign:     // the number of bits to use for the sign flag
 *     exponent: // the number of bits to use for the exponent
 *     mantissa: // the number of bits to use for the fractional component
 * }
 */
export function of_IEEE754(number, components) {
    const bias = Math.pow(2, components['exponent']) / 2 - 1;
    Log.debug(`bias: ${bias}`);

    // FIXME: rewrite these to not use unpack().
    const fraction = unpack(number, 0, components['mantissa']);
    const exp = unpack(number, components['mantissa'], components['exponent']);
    const sf = unpack(number, components['mantissa'] + components['exponent'], components['sign']);

    Log.debug(`sf: ${sf.toString(2)}`);
    Log.debug(`exp: ${exp.toString(2)}`);
    Log.debug(`fraction: ${fraction.toString(2)}`);

    if (0 < exp < Math.pow(2, components['exponent']) - 1) {
        let s = sf? -1 : +1;
        let e = exp - bias;
        let m = 1.0 + (fraction / Math.pow(2, components['mantissa']));
        return m * s * Math.pow(2, e);

    } else if (fraction == 0.0 && exp == Math.pow(2, components['exponent']) - 1)
        return sf? -Infinity : +Infinity;

    else if (fraction != 0.0 && (exp == 0 || exp == Math.pow(2, components['exponent']) - 1))
        return sf? -NaN : NaN;

    else if (fraction == 0 && exp == 0)
        return sf? -0.0 : +0.0;

    return undefined;
}

/*
 * Encode a `number` with the specified IEEE754 `components` and return an integer.
 *
 * The `components` parameter is an object with the following fields:
 * {
 *     sign:     // the number of bits to use for the sign flag
 *     exponent: // the number of bits to use for the exponent
 *     mantissa: // the number of bits to use for the fractional component
 * }
 */
export function to_IEEE754(number, components) {
    const bias = Math.pow(2, components['exponent']) / 2 - 1;
    Log.debug(`bias: ${bias}`);

    // figure out what number type the user specified.
    let sf, exp, fr;
    if (isNaN(number)) {
        [sf, exp, fr] = [0, Math.pow(2, components['exponent']) - 1, Math.pow(2, components['mantissa']) - 1];

    } else if (!isFinite(number)) {
        [sf, exp, fr] = [(number < 0.0)? 1 : 0, Math.pow(2, components['exponent']) - 1, 0];

    } else if (number == 0.0 && Math.atan2(number, number) == 0.0) {
        [sf, exp, fr] = [0, 0, 0];

    } else if (number == 0.0 && Math.atan2(number, number) < 0.0) {
        [sf, exp, fr] = [1, 0, 0];

    } else {
        const N = Math.abs(number);

        // extract the exponent and mantissa
        let e = Math.ceil(Math.log(N) * Math.LOG2E);
        let m = N / Math.pow(2, e);
        Log.debug(`>e: ${e}`);
        Log.debug(`>m: ${m}`);

        // grab the sign flag
        sf = (number < 0)? 1 : 0;

        // adjust the exponent and remove the implicit bit
        exp = e + bias - 1;
        if (exp != 0)
            m = m * 2.0 - 1.0;

        // convert the fractional mantissa into a binary number
        fr = Math.trunc(m * Math.pow(2, components['mantissa']));
    }

    Log.debug(`sf: ${sf.toString(2)}`);
    Log.debug(`exp: ${exp.toString(2)}`);
    Log.debug(`fraction: ${fr.toString(2)}`);

    // put all the components together
    let res;
    res = components['sign']? sf : 0;
    res = (res * Math.pow(2, components['exponent'])) + exp;
    res = (res * Math.pow(2, components['mantissa'])) + fr;
    return res;
}

// lookup the IEEE754 format for a given size
function get_IEEE754(size) {
    let res;
    switch (size) {
        case 2:
            res = {sign: 1, exponent: 5, mantissa: 10};
            break;
        case 4:
            res = {sign: 1, exponent: 8, mantissa: 23};
            break;
        case 8:
            res = {sign: 1, exponent: 11, mantissa: 52};
            break;
        case 16:
            res = {sign: 1, exponent: 15, mantissa: 113};
            break;
        case 32:
            res = {sign: 1, exponent: 19, mantissa: 237};
            break;
    }
    throw new errors.InvalidSizeError(size);
}

/*
 * Store the floating point `number` of `size` bytes to the specified `address`.
 */
export function storef(address, size, number) {
    const format = get_IEEE754_format(size);
    const res = to_IEEE754(number, format);
    return storeui(address, size, res);
}

/*
 * Load a floating point number of `size` bytes from the specified `address`.
 */
export function loadf(address, size) {
    const format = get_IEEE754_format(size);
    const res = loadui(address, size);
    return of_IEEE754(res, format);
}

/*
 * Backend:
 * Attempt to write an unsigned `integral` of up to `size` bytes to `address`.
 * Returns the number of bytes successfully written.
 * Should return undefined on a writing failure.
 *
 * Example:
 * __store__(ea, 4, n) -> 4
 */
function __store__(address, size, integral) {
    throw new errors.MissingBackendError('store');
}

/*
 * Backend
 * Attempt to read an unsigned integer of up to `size` bytes from `address`.
 * Returns a tuple containing the number of bytes read, and the integer.
 * Should return undefined on a loading failure.
 *
 * Example:
 * __load__(ea, 4) -> [4, n]
 */
function __load__(address, size) {
    throw new errors.MissingBackendError('load');
}

// Check to see if __store__ was defined. Assign a default if not.
if (!global.document.hasOwnProperty('__store__'))
    global.document.__store__ = __store__;

// Check to see if __load__ was defined. Assign a default if not.
if (!global.document.hasOwnProperty('__load__'))
    global.document.__load__ = __load__;
