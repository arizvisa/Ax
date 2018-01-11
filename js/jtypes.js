import * as Ax from './ax';

import * as errors from 'errors';
import './errors';

import * as Lazy from 'lazy.js';

/* Error message types for jtypes. */
errors.create({
    name: 'UndefinedFieldError',
    defaultExplanation: 'This subclass is missing a required field.',
    parent: errors.NotImplementedError,
});
errors.create({
    name: 'InvalidSizeError',
    defaultExplanation: 'An invalid size has been specified.',
    parent: errors.NativeError,
});
errors.create({
    name: 'InvalidAddressError',
    defaultExplanation: 'An invalid address has been specified.',
    parent: errors.NativeError,
});
errors.create({
    name: 'UninitializedError',
    defaultExplanation: 'This instance is not currently initialized.',
    parent: errors.NativeError,
});

/* General utility functions */
function ofCharCode(n) {
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

/* Base class definitions */
export class Jatomic {
    get classname() { return "Jatomic"; }
    get Size() {
        throw new errors.PropertyNotImplementedError('Size');
    }
    constructor(address, parent=undefined) {
        [this.address, this.parent] = [address, parent];
    }
    bytes() {
        let [integral, cb] = [this.getValue(), this.getSize()];
        let res = [];
        while (cb--) {
            res.push(integral % 256);
            integral = Math.trunc(integral / 256);
        }
        return res;
    }
    serialize() {
        let [integral, cb] = [this.getValue(), this.getSize()];
        let res = [];
        while (cb--) {
            let ch = integral % 256;
            res.push(String.fromCharCode(ch));
            integral = integral / 256;
        }
        return Lazy.default(res)
                   .join("");
    }
    getAddress() {
        return this.address;
    }
    getSize() {
        return this.Size;
    }
    getValue() {
        throw new errors.MethodNotImplementedError('getValue');
    }
    dump() {
        return Lazy.default(Ax.load(this.getAddress(), this.getSize()))
                   .map(Ax.toHex).join(" ");
    }
    summary() {
        return this.getValue().toString();
    }
    repr() {
        let ea = Ax.toHex(this.getAddress());
        let value = this.summary();
        return `[${ea}] <${this.classname}> : ${value}`;
    }
}

export class Jatomicu extends Jatomic {
    get classname() { return "Jatomicu"; }
    getValue() {
        let [ofs, cb] = [this.getAddress(), this.getSize()];
        switch (cb) {
            case 1:
                return Ax.loadui(ofs, 1);
            case 2:
                return Ax.loadui(ofs, 2);
            case 4:
                return Ax.loadui(ofs, 4);
            case 8:
                return Ax.loadui(ofs, 8);
        }
        if (cb <= 8) {
            return Lazy.default(Ax.load(ofs, cb))
                       .reverse()
                       .reduce((agg, n) => agg * 256 + n);
        }
        throw new errors.InvalidSizeError(`Invalid size ${cb} for an unsigned integer was requested.`);
    }
    summary() {
        let value = this.getValue();
        let value_x = Ax.toHex(value);
        let value_s = value.toString();
        return `${value_x} (${value_s})`;
    }
}

export class Jatomics extends Jatomic {
    get classname() { return "Jatomics"; }
    getValue() {
        let [ofs, cb] = [this.getAddress(), this.getSize()];
        switch (cb) {
            case 1:
                return Ax.loadsi(ofs, 1);
            case 2:
                return Ax.loadsi(ofs, 2);
            case 4:
                return Ax.loadsi(ofs, 4);
            case 8:
                return Ax.loadsi(ofs, 8);
        }
        let sf = Math.pow(2, cb*8 - 1);
        if (cb <= 8) {
            let res = Lazy.default(Ax.load(ofs, cb))
                       .reverse()
                       .reduce((agg, n) => agg * 256 + n);
            return (res & sf)? Math.pow(2, 8*cb) - (res % (sf-1)) : res;
        }
        throw new errors.InvalidSizeError(`Invalid size ${cb} for a signed integer was requested.`);
    }
    summary() {
        let value = this.getValue();
        let value_x = Ax.toHex(value);
        let value_s = value.toString();
        return `${value_x} (${value_s})`;
    }
}

export class Jpointer extends Jatomicu {
    get classname() { return "Jpointer"; }
    get Size() {
        return 4;
    }
    get Type() {
        throw new errors.UndefinedFieldError('Type');
    }
    get d() {
        return this.dereference();
    }
    calculate(ea) {
        return ea;
    }
    dereference() {
        let t = this.Type;
        let ea = this.calculate(this.getValue());
        return new t(ea, this);
    }
    summary() {
        let value = this.getValue();
        let value_x = Ax.toHex(value);
        let type = this.Type;
        let type_s = new type().classname;
        return `${value_x} -> ${type_s}`;
    }
}

export class Jcontainer {
    get classname() { return "Jcontainer"; }
    constructor(address, parent=undefined) {
        [this.address, this.parent] = [address, parent];
        this.value = [];
        this.indices = {};
    }
    new(t, ...args) {
        let res = new t(...args);
        res.parent = this;
        return res;
    }
    bytes() {
        return Lazy.default(this.value)
                   .map(n => n.bytes())
                   .flatten()
                   .toArray();
    }
    serialize() {
        return Lazy.default(this.value)
                   .map(n => n.serialize())
                   .join("");
    }
    getAddress() {
        return this.address;
    }
    getLength() {
        return this.value.length;
    }
    getSize() {
        return this.value.reduce((total, instance) => total + instance.getSize(), 0);
    }
    getValue() {
        return this.value;
    }
    field(name) {
        let index = this.indices[name];
        return this.value[index];
    }
    dump() {
        return Lazy.default(Ax.load(this.getAddress(), this.getSize()))
                   .map(Ax.toHex)
                   .join(" ");
    }
    summary() {
        return this.dump();
    }
    repr() {
        let ea = Ax.toHex(this.getAddress());
        let value = this.summary();
        return `[${ea}] <${this.classname}> : ${value}`;
    }
}

/* Base container definitions */
export class Jarray extends Jcontainer {
    get classname() { return "Jarray"; }
    get Type() {
        throw new errors.UndefinedFieldError('Type');
    }
    get Length() {
        throw new errors.UndefinedFieldError('Length');
    }
    constructor(address, parent=undefined) {
        super(address, parent);
        let object = this.Type;
        let count = this.Length;
        let indices = this.indices;

        let ea = this.getAddress();
        while (count) {
            let res = new object(ea, this);
            indices[this.value.length] = this.value.length;
            this.value.push(res);
            ea += res.getSize();
            count -= 1;
        }
    }
}

export class Jstruct extends Jcontainer {
    get classname() { return "Jstruct"; }
    get Fields() {
        throw new errors.UndefinedFieldError('Fields');
    }

    constructor(address, parent=undefined) {
        super(address, parent);
        let fields = this.Fields;

        const indices = this.indices;

        let ea = this.getAddress();
        fields.map(
            field => {
                let [name, type] = field;
                let res = new type(ea, this);
                indices[name] = this.value.length;
                this.value.push(res);
                ea += res.getSize();
            }
        );
    }
    repr() {
        let ea = this.getAddress();
        let fields = this.Fields;
        let result = [];
        result.push(`<${this.classname}>`);
        for (let i=0; i < this.value.length; i++) {
            let addr = Ax.toHex(ea);
            let [name, _] = fields[i];
            let value = this.value[i];
            let summary = value.summary();
            result.push(`[${addr}] "${name}" <${value.classname}> : ${summary}`);
            ea += this.value[i].getSize();
        }
        return result.join("\n");
    }
}

/* Dynamic container types */
export class Jtarray extends Jcontainer {
    get classname() { return "Jtarray"; }
    get Type() {
        throw new errors.UndefinedFieldError('Type');
    }
    get Length() {
        return this.value.length;
    }
    isTerminator(value) {
        throw new errors.MethodNotImplementedError('IsTerminator');
    }
    constructor(address, parent=undefined) {
        super(address, parent);
        let object = this.Type;
        let indices = this.indices;
        let ea = this.getAddress();

        let res;
        do {
            res = new object(ea, this);
            indices[this.value.length] = this.value.length;
            this.value.push(res);
            ea += res.getSize();
        } while (!this.isTerminator(res));
    }
}

export class Jstring extends Jarray {
    get classname() { return "Jstring"; }
    get Type() { return Juint8; }
    get Length() {
        throw new errors.UndefinedFieldError('Length');
    }
    getString() {
        return Lazy.default(this.value)
                   .map(n => n.getValue())
                   .map(String.fromCharCode)
                   .join("");
    }
    summary() {
        return Lazy.default(this.value)
                   .map(n => n.getValue())
                   .map(ofCharCode)
                   .join("");
    }
    repr() {
        let ea = Ax.toHex(this.getAddress());
        let value = this.summary();
        return `[${ea}] <${this.classname}> : "${value}"`;
    }
}

export class Jszstring extends Jtarray {
    get classname() { return "Jszstring"; }
    get Type() { return Juint8; }
    isTerminator(value) {
        return value.getValue() == 0;
    }
    getString() {
        return Lazy.default(this.value)
                   .map(n => n.getValue())
                   .map(String.fromCharCode)
                   .slice(0, -1)
                   .join("");
    }
    summary() {
        return Lazy.default(this.value)
                   .map(n => n.getValue())
                   .map(ofCharCode)
                   .join("");
    }
    repr() {
        let ea = Ax.toHex(this.getAddress());
        let value = this.summary();
        return `[${ea}] <${this.classname}> : "${value}"`;
    }
}

/* Atomic types */
export class Juint8 extends Jatomicu {
    get classname() { return "Juint8"; }
    get Size() { return 1; }
}
export class Juint16 extends Jatomicu {
    get classname() { return "Juint16"; }
    get Size() { return 2; }
}
export class Juint32 extends Jatomicu {
    get classname() { return "Juint32"; }
    get Size() { return 4; }
}
export class Juint64 extends Jatomicu {
    get classname() { return "Juint64"; }
    get Size() { return 8; }
}
export class Jsint8 extends Jatomics {
    get classname() { return "Jsint8"; }
    get Size() { return 1; }
}
export class Jsint16 extends Jatomics {
    get classname() { return "Jsint16"; }
    get Size() { return 2; }
}
export class Jsint32 extends Jatomics {
    get classname() { return "Jsint32"; }
    get Size() { return 4; }
}
export class Jsint64 extends Jatomics {
    get classname() { return "Jsint64"; }
    get Size() { return 8; }
}
