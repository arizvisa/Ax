import * as Ax from './ax';
import {Juint8, Juint16, Juint32, Juint64, Jstruct} from './jtypes';

/* Native (Ax) structure definitions */
export class ANSI_STRING extends Jstruct {
    get classname() { return "ANSI_STRING"; }
    get Fields() {
        return [
            ['Length', Juint16],
            ['MaximumLength', Juint16],
            ['Buffer', Juint32],
        ];
    }
    summary() {
        let length = this.field('Length').getValue();
        let maxlength = this.field('MaximumLength').getValue();
        let ptr = Ax.toHex(this.field('Buffer').getValue());
        let string = Ax.ansistring(this.getAddress());
        return `Length=${length} MaxLength=${maxlength} Buffer=${ptr} : ${string}`;
    }
    repr() {
        let ea = Ax.toHex(this.getAddress());
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
        ];
    }
    summary() {
        let length = this.field('Length').getValue();
        let maxlength = this.field('MaximumLength').getValue();
        let ptr = Ax.toHex(this.field('Buffer').getValue());
        let string = Ax.unicodestring(this.getAddress());
        return `Length=${length} MaxLength=${maxlength} Buffer=${ptr} : ${string}`;
    }
    repr() {
        let ea = Ax.toHex(this.getAddress());
        let value = this.summary();
        return `[${ea}] <${this.classname}> : "${value}"`;
    }
}
