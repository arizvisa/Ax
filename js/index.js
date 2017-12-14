import { Ax } from './jtypes';
import { PEB } from './ndk-pstypes';
import './pecoff';

let ea = Ax.Peb();
let peb = new PEB(ea);
console.log(peb.repr());
let ldrp = peb.field('Ldr');
console.log(ldrp.repr());
let ldr = ldrp.d;
console.log(ldr.repr());
let ml = ldr.field('InLoadOrderModuleLoadList');
console.log(ml.repr());
let e = ml.field('Flink').d;
console.log(e.repr());
