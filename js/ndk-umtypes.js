import * as utils from './ax';
import * as J from './jtypes';

/* Native structure definitions */
class ANSI_STRING__Buffer extends J.Jpointer {
    get Type() {
        const fld = this.parent.field('Length');
        let length = fld.int();
        class SizedString extends J.Jstring {
            get Length() {
                return length;
            }
        }
        return SizedString;
    }
}

export class ANSI_STRING extends J.Jstruct {
    static typename() { return 'ANSI_STRING'; }
    get Fields() {
        return [
            ['Length', J.Juint16],
            ['MaximumLength', J.Juint16],
            ['Buffer', ANSI_STRING__Buffer],
        ];
    }
    summary() {
        let length = this.field('Length').int();
        let maxlength = this.field('MaximumLength').int();
        let ptr = utils.toHex(this.field('Buffer').int());
        let string = this.str();
        return `Length=${length} MaxLength=${maxlength} Buffer=${ptr} : ${string}`;
    }
    repr() {
        let ea = utils.toHex(this.address);
        let value = this.summary();
        return `[${ea}] <${this.constructor.classname}> : "${value}"`;
    }
    str() {
      let fld = this.field('Buffer');
      let res = fld.d.str();
      let idx = res.indexOf('\0');
      return idx > -1? res.slice(0, idx) : res;
    }
}

class UNICODE_STRING__Buffer extends J.Jpointer {
    get Type() {
        const fld = this.parent.field('Length');
        let length = fld.int();
        class SizedString extends J.Jwstring {
            get Length() {
                return length;
            }
        }
        return SizedString;
    }
}

export class UNICODE_STRING extends J.Jstruct {
    static typename() { return 'UNICODE_STRING'; }
    get Fields() {
        return [
            ['Length', J.Juint16],
            ['MaximumLength', J.Juint16],
            ['Buffer', UNICODE_STRING__Buffer],
        ];
    }
    summary() {
        let length = this.field('Length').int();
        let maxlength = this.field('MaximumLength').int();
        let ptr = utils.toHex(this.field('Buffer').int());
        let string = this.str();
        return `Length=${length} MaxLength=${maxlength} Buffer=${ptr} : ${string}`;
    }
    repr() {
        let ea = utils.toHex(this.address);
        let value = this.summary();
        return `[${ea}] <${this.constructor.classname}> : "${value}"`;
    }
    str() {
      let fld = this.field('Buffer');
      let res = fld.d.str();
      let idx = res.indexOf('\0');
      return idx > -1? res.slice(0, idx) : res;
    }
}
