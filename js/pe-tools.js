import { Ax, toHex, jsbreakpoint } from './ax';
import { Jarray, Jstruct } from './jtypes';
import { IMAGE_DOS_HEADER, IMAGE_NT_HEADER, IMAGE_IMPORT_DIRECTORY, IMAGE_EXPORT_DIRECTORY } from './pecoff';

import * as L from 'loglevel';
const Log = L.getLogger('pe-tools');

import * as errors from 'errors';
import './errors';

/* Different Pecoff parsing errors */
errors.create({
    name: 'PeCoffParsingException',
    defaultExplanation: 'Unexpected error while attempting to parse PECOFF executable.',
    parent: errors.NativeError,
});
errors.create({
    name: 'ImportTableMissingError',
    defaultExplanation: 'No import table found within specified PECOFF executable.',
    parent: errors.PeCoffParsingException,
});
errors.create({
    name: 'ExportTableMissingError',
    defaultExplanation: 'No export table found within specified PECOFF executable.',
    parent: errors.PeCoffParsingException,
});
errors.create({
    name: 'ImportModuleNotFoundError',
    defaultExplanation: 'Specified import module was not found.',
    parent: errors.NativeError,
});

/* Miscellaneous tools for dealing with Pecoff files */
export function loadHeader(imagebase) {
    let dosHeader = new IMAGE_DOS_HEADER(imagebase);
    Log.debug(dosHeader.repr());

    // identify the PE header
    let pebase = imagebase + dosHeader.field('e_lfanew').getValue();
    let res = dosHeader.new(IMAGE_NT_HEADER, pebase);
    Log.debug(`loadHeader : ${res.repr()}`);

    return res;
}

export function loadImportTable(imagebase, pe) {
    let dd = pe.field('DataDirectory');
    let entry = dd.field(1);
    if (entry.field('Address').getValue())
        return entry.new(IMAGE_IMPORT_DIRECTORY, imagebase + entry.field('Address').getValue());
    throw new errors.ImportTableMissingError();     // FIXME: store some useful information
}

export function loadExportTable(imagebase, pe) {
    let dd = pe.field('DataDirectory');
    let entry = dd.field(0);
    if (entry.field('Address').getValue())
        return entry.new(IMAGE_EXPORT_DIRECTORY, imagebase + entry.field('Address').getValue());
    throw new errors.ExportTableMissingError();     // FIXME: store some useful information
}

export function getImportModule(imagebase, module) {
    let pe = loadHeader(imagebase);
    let it = loadImportTable(imagebase, pe);

    for (let i = 0; i < it.getLength(); i++) {
        let m = it.field(i);
        if (!m.field('Name').getValue())
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
    for (let i = 0; i < it.getLength(); i++) {
        let m = it.field(i);
        if (m.field('Name').getValue()) {
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
    for (let i = 0; i < IAT.getLength(); i++) {
        let imp = INT.field(i).d;
        let [hint, name] = [imp.field('Hint').getValue(), imp.field('String').serialize()];
        result.push([[hint, name.slice(0, -1)], IAT.field(i).getValue()]);
    }
    return result;
}

export function GetModuleExports(imagebase) {
    let pe = loadHeader(imagebase);
    let et = loadExportTable(imagebase, pe);
    let res = [];
    for (let i = 0; i < et.getLength(); i++) {
        res.push(et.field(i).getValue());
    }
    return res;
}
