import * as pecoff from './pecoff';

import * as L from 'loglevel';
const Log = L.getLogger('Ax.pe-tools');

import * as Err from 'errors';
import './errors';
const errors = Err.default;

/* Different Pecoff parsing errors */
Err.create({
    name: 'PeCoffParsingException',
    defaultExplanation: 'Unexpected error while attempting to parse PECOFF executable.',
    parent: Err.RuntimeError,
});
Err.create({
    name: 'ImportTableMissingError',
    defaultExplanation: 'No import table found within specified PECOFF executable.',
    parent: Err.PeCoffParsingException,
});
Err.create({
    name: 'ExportTableMissingError',
    defaultExplanation: 'No export table found within specified PECOFF executable.',
    parent: Err.PeCoffParsingException,
});
Err.create({
    name: 'ImportModuleNotFoundError',
    defaultExplanation: 'Specified import module was not found.',
    parent: Err.RuntimeError,
});

/* Miscellaneous tools for dealing with Pecoff files */
export function loadHeader(imagebase) {
    let dosHeader = new pecoff.IMAGE_DOS_HEADER(imagebase);

    // identify the PE header
    let pebase = imagebase + dosHeader.field('e_lfanew').int();
    let res = dosHeader.new(pecoff.IMAGE_NT_HEADER, pebase);

    return res;
}

export function loadImportTable(imagebase, pe) {
    let dd = pe.field('DataDirectory');
    let entry = dd.field(1);
    if (entry.field('Address').int())
        return entry.new(pecoff.IMAGE_IMPORT_DIRECTORY, imagebase + entry.field('Address').int());
    throw new errors.ImportTableMissingError();     // FIXME: store some useful information
}

export function loadExportTable(imagebase, pe) {
    let dd = pe.field('DataDirectory');
    let entry = dd.field(0);
    if (entry.field('Address').int())
        return entry.new(pecoff.IMAGE_EXPORT_DIRECTORY, imagebase + entry.field('Address').int());
    throw new errors.ExportTableMissingError();     // FIXME: store some useful information
}

export function getImportModule(imagebase, module) {
    let pe = loadHeader(imagebase);
    let it = loadImportTable(imagebase, pe);

    for (let i = 0; i < it.length; i++) {
        let m = it.field(i);
        if (!m.field('Name').int())
            continue;
        let n = m.field('Name').d.serialize();
        if (n.slice(0, -1) == module)
            return m;
    }
    throw new errors.ImportModuleNotFoundError(module);
}

export function GetModuleImportList(imagebase) {
    let pe = loadHeader(imagebase);
    let it = loadImportTable(imagebase, pe);

    let result = [];
    for (let i = 0; i < it.length; i++) {
        let m = it.field(i);
        if (m.field('Name').int()) {
            let s = m.field('Name').d.serialize();
            result.push(s.slice(0, -1));
        }
    }
    return result;
}

export function GetModuleImports(imagebase, module) {
    let m = getImportModule(imagebase, module);

    let result = [];
    let [INT, IAT] = [m.field('INT').d, m.field('IAT').d];
    for (let i = 0; i < IAT.length; i++) {
        let imp = INT.field(i).d;
        let [hint, name] = [imp.field('Hint').int(), imp.field('String').serialize()];
        result.push([[hint, name.slice(0, -1)], IAT.field(i).int()]);
    }
    return result;
}

export function GetModuleExports(imagebase) {
    const pe = loadHeader(imagebase);
    const et = loadExportTable(imagebase, pe);
    const [aof, aon, aono] = [et.field('AddressOfFunctions').d, et.field('AddressOfNames').d, et.field('AddressOfNameOrdinals').d];

    let res = [];
    for (let i = 0; i < aono.length; i++) {
        const [name, index] = [aon.field(i).d.str(), aono.field(i).int()];
        res.push([name, aof.field(index).int() + imagebase]);
    }
    return res;
}
