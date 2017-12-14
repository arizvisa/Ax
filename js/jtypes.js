export var Ax = new ActiveXObject("Ax.Leaker.1");

// utility functions
function toHex(s) {
    // TODO: use math.log to figure out which power of 2 this number
    //       fits within, and then pad it with 0s.
    return s.toString(16);
}
function ofHex(s) {
    return parseInt(s, 16);
}
var oX = ofHex;
var tX = toHex;

// class definitions
export class Jatomic {
    get classname() { return "Jatomic"; }
    get Size() {
        throw('not implemented');
    }
    constructor(address) {
        this.address = address;
    }
    getAddress() {
        return this.address;
    }
    getSize() {
        return this.Size;
    }
    getValue() {
        throw('not implemented');
    }
    dump() {
        let ea = this.getAddress();
        let size = this.getSize();
        let result = [];
        while (size--) {
            result.push(Ax.uint8_t(ea));
            ea++;
        }
        return result.map(toHex).join(" ");
    }
    summary() {
        return this.getValue().toString();
    }
    repr() {
        let ea = toHex(this.getAddress());
        let value = this.summary();
        return `[${ea}] <${this.classname}> : ${value}`;
    }
}

export class Jatomicu extends Jatomic {
    get classname() { return "Jatomicu"; }
    getValue() {
        let ofs = this.getAddress();
        switch (this.getSize()) {
            case 1:
                return Ax.uint8_t(ofs);
            case 2:
                return Ax.uint16_t(ofs);
            case 4:
                return Ax.uint32_t(ofs);
            case 8:
                return Ax.uint64_t(ofs);
        }
        throw('not implemented');
    }
    summary() {
        let value = this.getValue();
        let value_x = toHex(value);
        let value_s = value.toString();
        return `${value_x} (${value_s})`;
    }
}

export class Jatomics extends Jatomic {
    get classname() { return "Jatomics"; }
    getValue() {
        let ofs = this.getAddress();
        switch (this.getSize()) {
            case 1:
                return Ax.sint8_t(ofs);
            case 2:
                return Ax.sint16_t(ofs);
            case 4:
                return Ax.sint32_t(ofs);
            case 8:
                return Ax.sint64_t(ofs);
        }
        throw('not implemented');
    }
    summary() {
        let value = this.getValue();
        let value_x = toHex(value);
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
        throw('not implemented');
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
        return new t(ea);
    }
    summary() {
        let value = this.getValue();
        let value_x = toHex(value);
        let type = this.Type;
        let type_s = new type().classname;
        return `${value_x} -> ${type_s}`;
    }
}

export class Jcontainer {
    get classname() { return "Jcontainer"; }
    constructor(address) {
        this.address = address;
        this.value = [];
        this.indices = {};
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
        let ea = this.getAddress();
        let size = this.getSize();
        let result = [];
        while (size--) {
            result.push(Ax.uint8_t(ea));
            ea++;
        }
        return result.map(toHex).join(" ");
    }
    summary() {
        return this.dump();
    }
    repr() {
        let ea = toHex(this.getAddress());
        let value = this.summary();
        return `[${ea}] <${this.classname}> : ${value}`;
    }
}

export class Jarray extends Jcontainer {
    get classname() { return "Jarray"; }
    get Type() {
        throw('not implemented');
    }
    get Length() {
        throw('not implemented');
    }
    constructor(address) {
        super(address);
        let object = this.Type;
        let count = this.Length;
        let indices = this.indices;

        let ea = this.getAddress();
        while (count -= 1) {
            let res = new object(ea);
            indices[this.value.length] = this.value.length;
            this.value.push(res);
            ea += res.getSize();
        }
    }
}

export class Jstruct extends Jcontainer {
    get classname() { return "Jstruct"; }
    get Fields() {
        throw('not implemented');
    }

    constructor(address) {
        super(address);
        let fields = this.Fields;

        const indices = this.indices;

        let ea = this.getAddress();
        fields.map(
            field => {
                let [name, type] = field;
                let res = new type(ea);
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
            let addr = toHex(ea);
            let [name, _] = fields[i];
            let value = this.value[i];
            let summary = value.summary();
            result.push(`[${addr}] "${name}" <${value.classname}> : ${summary}`);
            ea += this.value[i].getSize();
        }
        return result.join("\n");
    }
}

// implementations
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

export class ANSI_STRING extends Jstruct {
    get classname() { return "ANSI_STRING"; }
    get Fields() {
        return [
            ['Length', Juint16],
            ['MaximumLength', Juint16],
            ['Buffer', Juint32],
        ]
    }
    summary() {
        let length = this.field('Length').getValue();
        let maxlength = this.field('MaximumLength').getValue();
        let ptr = toHex(this.field('Buffer').getValue());
        let string = Ax.ansistring(this.getAddress());
        return `Length=${length} MaxLength=${maxlength} Buffer=${ptr} : ${string}`
    }
    repr() {
        let ea = toHex(this.getAddress());
        let value = this.summary();
        return `[${ea}] <${this.classname}> : "${value}"`;
    }
}

export class UNICODE_STRING extends Jstruct {
    get classname() { return "UNICODE_STRING"; }
    get Fields() {
        return [
            ['Length', Juint16],
            ['MaximumLength', Juint16],
            ['Buffer', Juint32],
        ]
    }
    summary() {
        let length = this.field('Length').getValue();
        let maxlength = this.field('MaximumLength').getValue();
        let ptr = toHex(this.field('Buffer').getValue());
        let string = Ax.unicodestring(this.getAddress());
        return `Length=${length} MaxLength=${maxlength} Buffer=${ptr} : ${string}`
    }
    repr() {
        let ea = toHex(this.getAddress());
        let value = this.summary();
        return `[${ea}] <${this.classname}> : "${value}"`;
    }
}
