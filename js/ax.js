import * as errors from 'errors';
import './errors';

// internal ActiveX object for reading things from memory
export var Ax = new ActiveXObject("Ax.Leaker.1");

// numerical functions
export function toHex(s) {
    // TODO: use math.log to figure out which power of 2 this number
    //       fits within, and then pad it with 0s.
    return s.toString(16);
}
export function ofHex(s) {
    return parseInt(s, 16);
}

