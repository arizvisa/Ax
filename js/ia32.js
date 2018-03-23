import * as optable from './ia32.optable';

import * as Err from 'errors';
const errors = Err.default;

import * as L from 'loglevel';
const Log = L.getLogger('ia32');

Err.create({
  name: 'StopIteration',
  defaultExplanation: 'The specified iterator has terminated.',
  parent: Err.RuntimeError,
});

/* instruction operand sizes */
const Word = 4;
const HalfWord = Word / 2;
const Byte = HalfWord / 2;

/* instruction field indices */
const IF_PREFIX = 0;
const IF_INSTRUCTION = 1;
const IF_MODRM = 2;
const IF_SIB = 3;
const IF_DISP = 4;
const IF_IMMEDIATE = 5;

/* available instruction prefixes */
const Prefix = new Set([0x26, 0x2e, 0x36, 0x3e, 0x64, 0x65, 0x66, 0x67, 0xf0, 0xf2, 0xf3]);

/* utility functions */
function is_prefix(index) {
  return Prefix.has(index);
}

function get_modrm(by) {
  return [(by&0xc0)>>6, (by&0x38)>>3, (by&0x07)>>0];
}

function get_sib(by) {
  return [(by&0xc0)>>6, (by&0x38)>>3, (by&0x07)>>0];
}

/* optable lookup utils */
function lookup(iterable) {
  const table = optable[null];

  let res;
  res = iterable.next();
  if (res.value == 0x0F) {
    if (res.done)
      throw new errors.StopIteration(iterable);
    res = iterable.next();
    return table[res.value + 0x100];
  }
  return table[res.value];
}

function has_modrm(result) {
  return (result & 0x80)? true : false;
}

function has_immediate(result) {
  return (result & 0x40)? true : false;
}

function get_immediatelength(result, prefixes) {
  const res = result & 0x3f;
  const opsize = !prefixes.has(0x66);

  let tuple;
  switch(res) {
    case 0x3f:
      tuple = [ 2 * HalfWord, 2 * Word ];
      break;
    case 0x3e:
      tuple = [ Byte, HalfWord ];
      break;
    case 0x3d:
      tuple = [ HalfWord, Word ];
      break;
    case 0x3c:
      tuple = [ Word, Word * 2 ];
      break;
    case 0x3b:
      tuple = [ Word * 2, 2 * HalfWord ];
      break;
    case 0x3a:
      tuple = [ HalfWord + Word, Word ];
      break;
    default:
      tuple = [ res, res ];
      break;
  }
  return tuple[opsize? 1 : 0];
}

/* decoding utils */
function get_siblength(modrm, sib) {
  let mod, rm, base, _;
  [mod, _, rm] = get_modrm(modrm);
  if (rm != 4)
    throw new errors.RuntimeError(rm);

  [_, _, base] = get_sib(sib);
  if (base == 5) {
    const table = [Word, Byte, Word, 0];
    return table[mod];
  }
  return 0;
}

function get_disp16length(modrm) {
  let mod, _;
  const table = [0, Byte, HalfWord, 0];
  [mod, _, _] = get_modrm(modrm);
  return table[mod];
}

function get_disp32length(modrm) {
  const table = [0, Byte, Word, 0];
  let mod, _;
  [mod, _, _] = get_modrm(modrm);
  return table[mod];
}

function get_displength(modrm, prefixes) {
  return prefixes.has(0x67)? get_disp16length(modrm) : get_disp32length(modrm);
}

/* internal instruction decoding */
// FIXME: this seems really hacky?? umm..did this really work back in 2008?
function fetch(iterable) {
  let instruction = [];

  // decode the prefixes
  let prefixes = [];
  while (prefixes.length < 4) {
    let I = iterable.next();
    if (I.done)
      throw new errors.StopIteration(iterable);

    if (!is_prefix(I.value)) {
      instruction.push(I.value);
      break;
    }

    prefixes.push(I.value);
  }
  Log.debug(`prefixes: ${prefixes.size? prefixes : undefined}`);

  // decode the instruction
  if (!instruction.length) {
    let I = iterable.next();
    if (I.done)
      throw new errors.StopIteration(iterable);
    instruction.push(I.value);
  }
  if (instruction[0] == 0x0f) {
    let I = iterable.next();
    if (I.done)
      throw new errors.StopIteration(iterable);
    instruction.push(I.value);
  }
  Log.debug(`instruction: ${instruction}`);

  // lookup the instruction
  let L = lookup(instruction[Symbol.iterator]());
  let modrm = [];
  let sib = [];
  const P = new Set(prefixes);

  // decode the modrm
  if (has_modrm(L)) {
    let I = iterable.next();
    if (I.done)
      throw new errors.StopIteration(iterable);
    modrm.push(I.value);
  }
  Log.debug(`modrm: ${modrm.length? modrm[0] : undefined}`);

  // Figure out the displength
  let displength = 0;
  if (modrm.length) {
    const [mod, reg, rm] = get_modrm(modrm[0]);
    if (mod < 3) {
      displength = get_displength(modrm, P);

      if (rm == 5 && mod == 0)
        displength = Word;

      else if (rm == 4) {
        I = iterable.next();
        if (I.done)
          throw new errors.StopIteration(iterable);
        sib.push(I.value);

        displength = get_disp32length(modrm);
        if (displength == 0)
          displength = get_siblength(modrm, sib[0]);
      }
    }
  }

  // read the disp
  Log.debug(`displacement: ${displength}`);
  let disp = [];
  for (let i = 0; i < displength; i++) {
    let I = iterable.next();
    if (I.done)
      throw new errors.StopIteration(iterable);
    disp.push(I.value);
  }

  // decode the immediate
  let immlength = 0;
  if (has_immediate(L)) {
    immlength = get_immediatelength(L, P);
    if (modrm.length && (instruction[0] == 0xf6 || instruction[0] == 0xf7)) {
      [_, reg, _] = get_modrm(modrm[0]);
      if (reg != 0 && reg != 1)
        immlength = 0;
    } else if (new Set([0xa0, 0xa1, 0xa2, 0xa3]).has(instruction[0] ))
      immlength = 4;
  }

  // read the immediate
  Log.debug(`immediate: ${immlength}`);
  let immediate = [];
  for (let i = 0; i < immlength; i++) {
    let I = iterable.next();
    if (I.done)
      throw new errors.StopIteration(iterable);
    immediate.push(I.value);
  }

  return [prefixes, instruction, modrm, sib, disp, immediate];
}

/* decode instruction and convert each component into a string */
export function consume(iterable) {
  return fetch(iterable).map(A => A.map(n => String.fromCharCode(n)).join(""));
}

/* friendly instruction class */
class Instruction {
  constructor(components) {
    const [pre, ins, mrm, sib, disp, imm] = components;
    this.components = components;
  }
  /* field definitions */
  get prefix() {
    let res = Array.from(this.components[IF_PREFIX]).map(ch => ch.charCodeAt());
    return new Set(res);
  }
  get instruction() {
    return this.components[IF_INSTRUCTION];
  }
  get modrm() {
    let res = this.components[IF_MODRM];
    return res.length? get_modrm(res[0].charCodeAt()) : undefined;
  }
  get sib() {
    let res = this.components[IF_SIB];
    return res.length? get_sib(res[0].charCodeAt()) : undefined;
  }
  get displacement() {
    let res = this.components[IF_DISP];
    return res.length? Array.from(res).reverse().map(ch => ch.charCodeAt()).reduce((acc, n) => acc * 0x100 + n) : undefined;
  }
  get immediate() {
    let res = this.components[IF_IMMEDIATE];
    return res.length? Array.from(res).reverse().map(ch => ch.charCodeAt()).reduce((acc, n) => acc * 0x100 + n) : undefined;
  }

  /* standard methods */
  get length() {
    let res = this.components;
    return res.map(C => C.length).reduce((acc, n) => acc + n);
  }
}

export function decode(iterable) {
  const components = fetch(iterable);
  let processed = components.map(C => C.map(n => String.fromCharCode(n)).join(""));
  return new Instruction(processed);
}
