import * as Ax from './ax';
import {Juint8, Juint16, Juint32, Juint64, Jstruct} from './jtypes';

/* Native (Ax) structure definitions */
export class ANSI_STRING extends Jstruct {
    static typename() { return 'ANSI_STRING'; }
    get Fields() {
        return [
            ['Length', Juint16],
            ['MaximumLength', Juint16],
            ['Buffer', Juint32],
        ];
    }
    summary() {
        let length = this.field('Length').int();
        let maxlength = this.field('MaximumLength').int();
        let ptr = Ax.toHex(this.field('Buffer').int());
        let string = this.str();
        return `Length=${length} MaxLength=${maxlength} Buffer=${ptr} : ${string}`;
    }
    repr() {
        let ea = Ax.toHex(this.address);
        let value = this.summary();
        return `[${ea}] <${this.constructor.classname}> : "${value}"`;
    }
    str() {
      // FIXME: extract this ansi string correctly instead of using Ax.
      return Ax.ansistring(this.address);
    }
}

export class UNICODE_STRING extends Jstruct {
    static typename() { return 'UNICODE_STRING'; }
    get Fields() {
        return [
            ['Length', Juint16],
            ['MaximumLength', Juint16],
            ['Buffer', Juint32],
        ];
    }
    summary() {
        let length = this.field('Length').int();
        let maxlength = this.field('MaximumLength').int();
        let ptr = Ax.toHex(this.field('Buffer').int());
        let string = this.str();
        return `Length=${length} MaxLength=${maxlength} Buffer=${ptr} : ${string}`;
    }
    repr() {
        let ea = Ax.toHex(this.address);
        let value = this.summary();
        return `[${ea}] <${this.constructor.classname}> : "${value}"`;
    }
    str() {
      // FIXME: extract this unicode string correctly instead of using Ax.
      return Ax.unicodestring(this.address);
    }
}
