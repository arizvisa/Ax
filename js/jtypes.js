import * as memory from './memory';
import * as utils from './utils';

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
    size() {
        return this.Size;
    }
    /* regular methods */
    bytes() {
        let [integral, cb] = [this.value, this.size()];
        let res = [];
        while (cb--) {
            res.push(integral % 256);
            integral = Math.trunc(integral / 256);
        }
        return res;
    }
    serialize() {
        let [integral, cb] = [this.value, this.size()];
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
        const value = memory.load(this.address, this.size());
        return Lazy.default(value)
                   .map(n => utils.toHex(n))
                   .join(' ');
    }
    summary() {
        return this.value.toString();
    }
    repr() {
        const [ea, summary] = [utils.toHex(this.address), this.summary()];
        return `[${ea}] <${this.classname}> : ${summary}`;
    }
    int() {
        return this.value;
    }
}

export class Jatomicu extends Jatomic {
    static typename() { return 'Jatomicu'; }
    get value() {
        let [ofs, cb] = [this.address, this.size()];
        switch (cb) {
            case 1:
                return memory.loadui(ofs, 1);
            case 2:
                return memory.loadui(ofs, 2);
            case 4:
                return memory.loadui(ofs, 4);
            case 8:
                return memory.loadui(ofs, 8);
        }
        if (cb <= 8) {
            const value = memory.load(ofs, cb);
            return Lazy.default(value)
                       .reverse()
                       .reduce((agg, n) => agg * 256 + n);
        }
        throw new errors.InvalidSizeError(`Invalid size ${cb} for an unsigned integer was requested.`);
    }
    summary() {
        const value = this.value;
        let [value_x, value_s] = [utils.toHex(value), value.toString()];
        return `${value_x} (${value_s})`;
    }
}

export class Jatomics extends Jatomic {
    static typename() { return 'Jatomics'; }
    get value() {
        let [ofs, cb] = [this.address, this.size()];
        switch (cb) {
            case 1:
                return memory.loadsi(ofs, 1);
            case 2:
                return memory.loadsi(ofs, 2);
            case 4:
                return memory.loadsi(ofs, 4);
            case 8:
                return memory.loadsi(ofs, 8);
        }
        let sf = Math.pow(2, cb*8 - 1);
        if (cb <= 8) {
            const value = memory.load(ofs, cb);
            let res = Lazy.default(value)
                          .reverse()
                          .reduce((agg, n) => agg * 256 + n);
            return (res & sf)? Math.pow(2, 8*cb) - (res % (sf-1)) : res;
        }
        throw new errors.InvalidSizeError(`Invalid size ${cb} for a signed integer was requested.`);
    }
    summary() {
        const value = this.value;
        let [value_x, value_s] = [utils.toHex(value), value.toString()];
        return `${value_x} (${value_s})`;
    }
}

export class Jfloat extends Jatomicu {
    static typename() { return 'Jfloat'; }
    get Components() {
        // [signflag, exponent, mantissa]
        throw new errors.UndefinedFieldError('Components');
    }
    get Size() {
        const [sf, exp, fr] = this.Components;
        let res = sf + exp + fr;
        return Math.trunc(res / 8);
    }
    summary() {
        const [integral, real] = [this.int(), this.float()];
        return `${real} (${utils.toHex(integral)})`;
    }
    float() {
        const [sf, exp, fr] = this.Components;
        const format = {
            sign: sf,
            exponent: exp,
            mantissa: fr,
        };
        return memory.of_IEEE754(this.value, format);
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
        let [value_x, type_s] = [utils.toHex(res), type.typename()];  // FIXME: is there a better way to get the classname than calling a constructor?
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

    constructor(...args) {
        super(...args);
        this._value = [];
        this._indices = {};
    }
    size() {
        return this._value.reduce((total, instance) => total + instance.size(), 0);
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
        const value = memory.load(this.address, this.size());
        return Lazy.default(value)
                   .map(n => utils.toHex(n))
                   .join(' ');
    }
    summary() {
        return this.dump();
    }
    repr() {
        const [ea, value] = [utils.toHex(this.address), this.summary()];
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
            ea += res.size();
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
                ea += res.size();
            }
        );
    }
    repr() {
        const fields = this.Fields;
        let [ea, value] = [this.address, this.value];

        let result = [`<${this.classname}>`];
        for (let i = 0; i < value.length; i++) {
            let [ea_x, [name, _], val] = [utils.toHex(ea), fields[i], value[i]];
            result.push(`[${ea_x}] "${name}" <${val.classname}> : ${val.summary()}`);
            ea += val.size();
        }
        return result.join('\n');
    }
    * iterfields() {
        for (const [k, _] of this.Fields)
            yield k;
    }
    fields() {
        let res = [];
        for (let k of this.iterfields())
            res.push(res, k);
        return res;
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
            ea += res.size();
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
                   .map(ch => utils.ofCharCode(ch))
                   .join('');
    }
    repr() {
        let [ea_x, value_s] = [utils.toHex(this.address), this.summary()];
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
                   .map(ch => utils.ofCharCode(ch))
                   .join('');
    }
    repr() {
        let [ea_x, value_s] = [utils.toHex(this.address), this.summary()];
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
                   .map(ch => utils.ofCharCode(ch))
                   .join('');
    }
    repr() {
        let [ea_x, value_s] = [utils.toHex(this.address), this.summary()];
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
                   .map(ch => utils.ofCharCode(ch))
                   .join('');
    }
    repr() {
        let [ea_x, value_s] = [utils.toHex(this.address), this.summary()];
        return `[${ea_x}] <${this.classname}> : "${value_s}"`;
    }
}

/* Atomic types (unsigned) */
export class Juint8 extends Jatomicu {
    static typename() { return 'uint8_t'; }
    get Size() { return 1; }
}
export class Juint16 extends Jatomicu {
    static typename() { return 'uint16_t'; }
    get Size() { return 2; }
}
export class Juint32 extends Jatomicu {
    static typename() { return 'uint32_t'; }
    get Size() { return 4; }
}
export class Juint64 extends Jatomicu {
    static typename() { return 'uint64_t'; }
    get Size() { return 8; }
}
export class Juint128 extends Jatomicu {
    static typename() { return 'uint128_t'; }
    get Size() { return 16; }
}

/* Atomic types (signed) */
export class Jsint8 extends Jatomics {
    static typename() { return 'sint8_t'; }
    get Size() { return 1; }
}
export class Jsint16 extends Jatomics {
    static typename() { return 'sint16_t'; }
    get Size() { return 2; }
}
export class Jsint32 extends Jatomics {
    static typename() { return 'sint32_t'; }
    get Size() { return 4; }
}
export class Jsint64 extends Jatomics {
    static typename() { return 'sint64_t'; }
    get Size() { return 8; }
}
export class Jsint128 extends Jatomics {
    static typename() { return 'sint128_t'; }
    get Size() { return 16; }
}

/* Atomic types (floating-point) */
export class Jbinary16 extends Jfloat {
    static typename() { return '__fp16'; }
    get Components() { return [1, 5, 10]; }
}
export class Jbinary32 extends Jfloat {
    static typename() { return 'float'; }
    get Components() { return [1, 8, 23]; }
}
export class Jbinary64 extends Jfloat {
    static typename() { return 'double'; }
    get Components() { return [1, 11, 52]; }
}
export class Jbinary128 extends Jfloat {
    static typename() { return '__float128'; }
    get Components() { return [1, 15, 113]; }
}
export class Jbinary256 extends Jfloat {
    static typename() { return '__float256'; }
    get Components() { return [1, 19, 237]; }
}
