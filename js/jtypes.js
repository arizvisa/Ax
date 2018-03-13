import * as Ax from './ax';

import * as Err from 'errors';
import './errors';
const errors = Err.default;

import * as Lazy from 'lazy.js';

/* Error message types for jtypes. */
Err.create({
    name: 'UndefinedFieldError',
    defaultExplanation: 'This subclass is missing a required field.',
    parent: Err.NotImplementedError,
});
Err.create({
    name: 'InvalidSizeError',
    defaultExplanation: 'An invalid size has been specified.',
    parent: Err.IntegerError,
});
Err.create({
    name: 'InvalidAddressError',
    defaultExplanation: 'An invalid address has been specified.',
    parent: Err.MemoryError,
});
Err.create({
    name: 'UninitializedError',
    defaultExplanation: 'This instance is not currently initialized.',
    parent: Err.RuntimeError,
});
Err.create({
    name: 'ArgumentTypeError',
    defaultExplanation: 'An incorrect type was passed as an argument.',
    parent: Err.StaticError,
});
Err.create({
    name: 'FieldNotFoundError',
    defaultExplanation: 'The specified field was not found.',
    parent: Err.RuntimeError,
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

/** Base class for everything **/
class Jtype {
    static typename() { return 'undefined'; }
    get classname() { return this.constructor.typename(); }

    /* new type(address, ?parent)
     * can set .parent here in case instantiation of a sub-class requires
     * prior knowledge of another type relative to this one.
     */
    constructor(address, parent=undefined) {
        [this.address, this.parent] = [address, parent];
    }
    /* .new(type, address, ?parent)
     * just a wrapper around the constructor. this wrapper modifies the arguments
     * to include the method owner as the .parent of the newly created type.
     */
    new(type, ...args) {
        const res = (args.length < 2)? args.concat([this]) : args;
        return new type(...res);
    }
    /* getter/setter for the .value property  */
    get value() {
        throw new errors.PropertyNotImplementedError('value');
    }
    set value(n) {
        throw new errors.PropertyNotImplementedError('value');
    }
    // methods that a sub-class needs to implement
    bytes() {
        throw new errors.MethodNotImplementedError('bytes');
    }
    serialize() {
        throw new errors.MethodNotImplementedError('serialize');
    }
    summary() {
        throw new errors.MethodNotImplementedError('summary');
    }
    repr() {
        throw new errors.MethodNotImplementedError('repr');
    }
}

/* Basic class definitions for the user */
export class Jatomic extends Jtype {
    static typename() { return 'Jatomic'; }
    get Size() {
        throw new errors.UndefinedFieldError('Size');
    }
    /* Atomic types interact with their .value on-demand. */
    get value() {
        throw new errors.PropertyNotImplementedError('value');
    }
    set value(n) {
        throw new errors.PropertyNotImplementedError('value');
    }
    /* Atomic types are constant-sized as well. */
    get size() {
        return this.Size;
    }
    set size(n) {
        throw new this.ProtectedMemberError('size');
    }
    /* regular methods */
    bytes() {
        let [integral, cb] = [this.value, this.size];
        let res = [];
        while (cb--) {
            res.push(integral % 256);
            integral = Math.trunc(integral / 256);
        }
        return res;
    }
    serialize() {
        let [integral, cb] = [this.value, this.size];
        let res = [];
        while (cb--) {
            let ch = integral % 256;
            res.push(String.fromCharCode(ch));
            integral = integral / 256;
        }
        return Lazy.default(res)
                   .join('');
    }
    dump() {
        const value = Ax.load(this.address, this.size);
        return Lazy.default(value)
                   .map(n => Ax.toHex(n))
                   .join(' ');
    }
    summary() {
        return this.value.toString();
    }
    repr() {
        const [ea, summary] = [Ax.toHex(this.address), this.summary()];
        return `[${ea}] <${this.classname}> : ${summary}`;
    }
    int() {
        return this.value;
    }
}

export class Jatomicu extends Jatomic {
    static typename() { return 'Jatomicu'; }
    get value() {
        let [ofs, cb] = [this.address, this.size];
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
            const value = Ax.load(ofs, cb);
            return Lazy.default(value)
                       .reverse()
                       .reduce((agg, n) => agg * 256 + n);
        }
        throw new errors.InvalidSizeError(`Invalid size ${cb} for an unsigned integer was requested.`);
    }
    summary() {
        const value = this.value;
        let [value_x, value_s] = [Ax.toHex(value), value.toString()];
        return `${value_x} (${value_s})`;
    }
}

export class Jatomics extends Jatomic {
    static typename() { return 'Jatomics'; }
    get value() {
        let [ofs, cb] = [this.address, this.size];
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
            const value = Ax.load(ofs, cb);
            let res = Lazy.default(value)
                          .reverse()
                          .reduce((agg, n) => agg * 256 + n);
            return (res & sf)? Math.pow(2, 8*cb) - (res % (sf-1)) : res;
        }
        throw new errors.InvalidSizeError(`Invalid size ${cb} for a signed integer was requested.`);
    }
    summary() {
        const value = this.value;
        let [value_x, value_s] = [Ax.toHex(value), value.toString()];
        return `${value_x} (${value_s})`;
    }
}

export class Jpointer extends Jatomicu {
    static typename() { return 'Jtype*'; }
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
        const [t, ea] = [this.Type, this.calculate(this.int())];
        return this.new(t, ea);
    }
    summary() {
        const [res, type] = [this.value, this.Type];
        let [value_x, type_s] = [Ax.toHex(res), type.typename()];  // FIXME: is there a better way to get the classname than calling a constructor?
        return `${value_x} -> ${type_s}`;
    }
}

// FIXME: allow one to specify their own `calculate` method.
export function DefinePointer(type, name=undefined) {
    const realname = `Pointer(${('typename' in type)? type.typename() : type})`;

    let type_;
    if (type.prototype instanceof Jtype)
        type_ = (T) => type;
    else if (typeof object == "function")
        type_ = (T) => type(T);
    else
        throw new errors.ArgumentTypeError("object");

    let name_;
    if (typeof name == "string")
        name_ = (T) => name;
    else if (typeof name == "function")
        name_ = (T) => name(T);
    else if (typeof name == "undefined")
        name_ = (T) => `DynamicArray(${T.Type.typename()}, ${T.Length})`;
    else
        throw new errors.ArgumentTypeError("name");

    class DynamicPointer extends Jpointer {
        static typename() { return realname; }
        get classname() { return name_(this); }
        get Type() { return type_(this); }
    }
    return DynamicPointer;
}

export class Jcontainer extends Jtype {
    static typename() { return 'Jcontainer'; }

    /* Container types cache all the types that are contained. */
    get value() { return this._value; }
    set value(n) { throw new this.ProtectedMemberError('value'); }
    /* Container types are always honest about their length... */
    get length() { return this._value.length; }
    set length(n) { throw new this.ProtectedMemberError('length'); }
    /* ...and also their size. */
    get size() {
        return this._value.reduce((total, instance) => total + instance.size, 0);
    }
    set size(n) { throw new this.ProtectedMemberError('size'); }

    constructor(...args) {
        super(...args);
        this._value = [];
        this._indices = {};
    }
    bytes() {
        const value = this._value;
        return Lazy.default(value)
                   .map(n => n.bytes())
                   .flatten()
                   .toArray();
    }
    serialize() {
        const value = this._value;
        return Lazy.default(value)
                   .map(n => n.serialize())
                   .join('');
    }
    field(name) {
        const index = this._indices[name];
        if (this._value[index] === void 0)
            throw new errors.FieldNotFoundError(name);
        return this._value[index];
    }
    dump() {
        const value = Ax.load(this.address, this.size);
        return Lazy.default(value)
                   .map(n => Ax.toHex(n))
                   .join(' ');
    }
    summary() {
        return this.dump();
    }
    repr() {
        const [ea, value] = [Ax.toHex(this.address), this.summary()];
        return `[${ea}] <${this.classname}> : ${value}`;
    }
}

/* Base container definitions */
export class Jarray extends Jcontainer {
    static typename() { return 'Jarray'; }
    get Type() {
        throw new errors.UndefinedFieldError('Type');
    }
    get Length() {
        throw new errors.UndefinedFieldError('Length');
    }
    constructor(...args) {
        super(...args);

        const object = this.Type;
        let [count, indices, value] = [this.Length, this._indices, this.value];

        let ea = this.address;
        while (count) {
            let res = this.new(object, ea);
            indices[value.length] = value.length;
            value.push(res);
            ea += res.size;
            count -= 1;
        }
    }
}

export function DefineArray(object, length, name=undefined) {
    const realname = `DynamicArray(${('typename' in object)? object.typename() : object}, ${(typeof length == "number")? length : '...'})`;

    let object_;
    if (object.prototype instanceof Jtype)
        object_ = (T) => object;
    else if (typeof object == "function")
        object_ = (T) => object(T);
    else
        throw new errors.ArgumentTypeError("object");

    let length_;
    if (typeof length == "number")
        length_ = (T) => length;
    else if (typeof length == "function")
        length_ = (T) => length(T);
    else
        throw new errors.ArgumentTypeError("length");

    let name_;
    if (typeof name == "string")
        name_ = (T) => name;
    else if (typeof name == "function")
        name_ = (T) => name(T);
    else if (typeof name == "undefined")
        name_ = (T) => `DynamicArray(${T.Type.typename()}, ${T.Length})`;
    else
        throw new errors.ArgumentTypeError("name");

    class DynamicArray extends Jarray {
        static typename() { return realname; }
        get classname() { return name_(this); }
        get Type() { return object_(this); }
        get Length() { return length_(this); }
    }
    return DynamicArray;
}

export class Jstruct extends Jcontainer {
    static typename() { return 'Jstruct'; }
    get Fields() {
        throw new errors.UndefinedFieldError('Fields');
    }
    constructor(...args) {
        super(...args);
        const fields = this.Fields;

        let [indices, value] = [this._indices, this.value];
        let ea = this.address;
        fields.map(
            field => {
                let [name, type] = field;
                let res = this.new(type, ea);
                indices[name] = value.length;
                value.push(res);
                ea += res.size;
            }
        );
    }
    repr() {
        const fields = this.Fields;
        let [ea, value] = [this.address, this.value];

        let result = [];
        result.push(`<${this.classname}>`);
        for (let i=0; i < value.length; i++) {
            let [ea_x, [name, _], val] = [Ax.toHex(ea), fields[i], value[i]];
            result.push(`[${ea_x}] "${name}" <${val.classname}> : ${val.summary()}`);
            ea += val.size;
        }
        return result.join('\n');
    }
}

export function DefineStruct(fields, name=undefined) {
    const fields_ = fields.slice();

    let name_;
    if (typeof name == "string")
        name_ = (T) => name;
    else if (typeof name == "function")
        name_ = (T) => name(T);
    else if (typeof name == "undefined")
        name_ = (T) => T.typename();
    else
        throw new errors.ArgumentTypeError("name");

    class DynamicStruct extends Jstruct {
        static typename() {
            return `DynamicStruct([..${fields_.length} fields..])`;
        }

        get classname() { return name_(this); }

        // XXX: does it make sense for the following to be dynamic/callable?
        get Fields() { return fields_; }
    }
    return DynamicStruct;
}

/* Dynamic container types */
export class Jtarray extends Jcontainer {
    static typename() { return 'Jtarray'; }
    get Type() {
        throw new errors.UndefinedFieldError('Type');
    }
    get Length() {
        return this.value.length;
    }
    isTerminator(value) {
        throw new errors.MethodNotImplementedError('IsTerminator');
    }
    constructor(...args) {
        super(...args);

        const object = this.Type;
        let [ea, indices, value] = [this.address, this._indices, this.value];

        let res;
        do {
            res = this.new(object, ea);
            indices[value.length] = value.length;
            value.push(res);
            ea += res.size;
        } while (!this.isTerminator(res));
    }
}

export class Jstring extends Jarray {
    static typename() { return 'Jstring'; }
    get Type() { return Juint8; }
    get Length() {
        throw new errors.UndefinedFieldError('Length');
    }
    str() {
        return Lazy.default(this.value)
                   .map(n => n.value)
                   .map(ch => String.fromCharCode(ch))
                   .join('');
    }
    summary() {
        return Lazy.default(this.value)
                   .map(n => n.value)
                   .map(ch => ofCharCode(ch))
                   .join('');
    }
    repr() {
        let [ea_x, value_s] = [Ax.toHex(this.address), this.summary()];
        return `[${ea_x}] <${this.classname}> : "${value_s}"`;
    }
}

export class Jszstring extends Jtarray {
    static typename() { return 'Jszstring'; }
    get Type() { return Juint8; }
    isTerminator(object) {
        return object.value == 0;
    }
    str() {
        return Lazy.default(this.value)
                   .map(n => n.value)
                   .map(ch => String.fromCharCode(ch))
                   .slice(0, -1)
                   .join('');
    }
    summary() {
        return Lazy.default(this.value)
                   .map(n => n.value)
                   .map(ch => ofCharCode(ch))
                   .join('');
    }
    repr() {
        let [ea_x, value_s] = [Ax.toHex(this.address), this.summary()];
        return `[${ea_x}] <${this.classname}> : "${value_s}"`;
    }
}

export class Jwstring extends Jarray {
    static typename() { return 'Jwstring'; }
    get Type() { return Juint16; }
    get Length() {
        throw new errors.UndefinedFieldError('Length');
    }
    str() {
        return Lazy.default(this.value)
                   .map(n => n.value)
                   .map(ch => String.fromCharCode(ch))
                   .join('');
    }
    summary() {
        return Lazy.default(this.value)
                   .map(n => n.value)
                   .map(ch => ofCharCode(ch))
                   .join('');
    }
    repr() {
        let [ea_x, value_s] = [Ax.toHex(this.address), this.summary()];
        return `[${ea_x}] <${this.classname}> : "${value_s}"`;
    }
}

export class Jszwstring extends Jtarray {
    static typename() { return 'Jszwstring'; }
    get Type() { return Juint16; }
    isTerminator(object) {
        return object.value == 0;
    }
    str() {
        return Lazy.default(this.value)
                   .map(n => n.value)
                   .map(ch => String.fromCharCode(ch))
                   .slice(0, -1)
                   .join('');
    }
    summary() {
        return Lazy.default(this.value)
                   .map(n => n.value)
                   .map(ch => ofCharCode(ch))
                   .join('');
    }
    repr() {
        let [ea_x, value_s] = [Ax.toHex(this.address), this.summary()];
        return `[${ea_x}] <${this.classname}> : "${value_s}"`;
    }
}

/* Atomic types */
export class Juint8 extends Jatomicu {
    static typename() { return 'Juint8'; }
    get Size() { return 1; }
}
export class Juint16 extends Jatomicu {
    static typename() { return 'Juint16'; }
    get Size() { return 2; }
}
export class Juint32 extends Jatomicu {
    static typename() { return 'Juint32'; }
    get Size() { return 4; }
}
export class Juint64 extends Jatomicu {
    static typename() { return 'Juint64'; }
    get Size() { return 8; }
}
export class Jsint8 extends Jatomics {
    static typename() { return 'Jsint8'; }
    get Size() { return 1; }
}
export class Jsint16 extends Jatomics {
    static typename() { return 'Jsint16'; }
    get Size() { return 2; }
}
export class Jsint32 extends Jatomics {
    static typename() { return 'Jsint32'; }
    get Size() { return 4; }
}
export class Jsint64 extends Jatomics {
    static typename() { return 'Jsint64'; }
    get Size() { return 8; }
}
