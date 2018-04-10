/* returns a number converted to a hexadecimal number */
export function toHex(n) {
    // TODO: use Math.log to figure out which power of 2 this number
    //       fits within, and then pad it with 0s.
    return n.toString(16);
}

/* converts a hexadecimal number into an integer */
export function ofHex(s) {
    return parseInt(s, 16);
}

export function jsbreakpoint() {
    /* jshint -W087 */ debugger;
}

/* Convert a character code into a printable character */
export function ofCharCode(n) {
    switch (n) {
        case 0:
            return "\\0";
        case 1:
            return "\\1";
        case 2:
            return "\\2";
        case 3:
            return "\\3";
        case 4:
            return "\\4";
        case 5:
            return "\\5";
        case 6:
            return "\\6";
        case 7:
            return "\\a";
        case 8:
            return "\\b";
        case 9:
            return "\\t";
        case 10:
            return "\\n";
        case 11:
            return "\\v";
        case 12:
            return "\\f";
        case 13:
            return "\\r";
        default:
            return (n & 0x80 || ((n&31) == n))? `\\x${n.toString(16)}` : String.fromCharCode(n);
    }
}

/* reformat some text so it renders in html properly */
export function htmlescape(string) {
    let res = document.createElement('div');
    res.innerText = string;
    return res.innerHTML;
}

/* double-quote a string whilst escaping any inside it */
export function dquote(string) {
    return JSON.stringify(string);
}
