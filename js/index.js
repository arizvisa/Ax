import { Ax, toHex } from './ax';
import { Jarray, Jstruct } from './jtypes';
import { PEB } from './ndk-pstypes';
import { IMAGE_DOS_HEADER, IMAGE_NT_HEADER, IMAGE_DATA_DIRECTORY, IMAGE_SECTION_HEADER, IMAGE_IMPORT_DIRECTORY_ENTRY, IMAGE_EXPORT_DIRECTORY_ENTRY } from './pecoff';
import { ScanForExecutables } from './tools';
import * as errors from 'errors';

import * as L from 'loglevel';
L.setLevel('trace');
const Log = L.getLogger('index');

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

function getFirstLdrEntry() {
    // navigate the loader
    let ea = Ax.Peb();
    let peb = new PEB(ea);
    Log.debug(`getFirstLdrEntry() : ${peb.repr()}`);
    let ldrp = peb.field('Ldr');
    Log.debug(`getFirstLdrEntry() : ${ldrp.repr()}`);
    let ldr = ldrp.d;
    Log.debug(`getFirstLdrEntry() : ${ldr.repr()}`);
    let ml = ldr.field('InLoadOrderModuleLoadList');
    Log.debug(`getFirstLdrEntry() : ${ml.repr()}`);
    let res = ml.field('Flink').d;
    Log.debug(`getFirstLdrEntry() : ${res.repr()}`);

    return res;
}

function loadPeHeader(imagebase) {
    let dosHeader = new IMAGE_DOS_HEADER(imagebase);
    Log.debug(dosHeader.repr());

    // identify the PE header
    let pebase = imagebase + dosHeader.field('e_lfanew').getValue();
    let res = new IMAGE_NT_HEADER(pebase);
    Log.debug(`loadPeHeader : ${res.repr()}`);

    return res;
}

function loadDataDirectory(imagebase, pe) {
    let count = pe.field('OptionalHeader').field('NumberOfRvaAndSizes').getValue();
    class DataDirectory extends Jarray {
        get classname() { return 'DataDirectory{' + count + '}'; }
        get Type() { return IMAGE_DATA_DIRECTORY; }
        get Length() { return count; }
    }
    let res = new DataDirectory(pe.getAddress()+pe.getSize());
    Log.debug(`loadDataDirectory : ${res.repr()}`);
    return res;
}

function loadSectionTable(imagebase, pe) {
    let count = pe.field('FileHeader').field('NumberOfSections').getValue();
    class SectionTable extends Jarray {
        get classname() { return 'SectionTable{' + count + '}'; }
        get Type() { return IMAGE_SECTION_HEADER; }
        get Length() { return count; }
    }
    let cb = new IMAGE_DATA_DIRECTORY(0).getSize();
    let res = new SectionTable(pe.getAddress()+pe.getSize()+pe.field('OptionalHeader').field('NumberOfRvaAndSizes').getValue()*cb);
    Log.debug(`loadSectionTable : ${res.repr()}`);
    return res;
}

function loadImportTable(imagebase, pe) {
    let dd = loadDataDirectory(imagebase, pe);
    let entry = dd.field(1);
    if (entry.field('Address').getValue()) {
        // FIXME: Build an array or a generator of the import table until there are no more left.
        let res = new IMAGE_IMPORT_DIRECTORY_ENTRY(imagebase + entry.field('Address').getValue());
        return res;
    }
    throw errors.ImportTableMissingError();     // FIXME: store something useful
}

function loadExportTable(imagebase, pe) {
    let dd = loadDataDirectory(imagebase, pe);
    let entry = dd.field(0);
    if (entry.field('Address').getValue()) {
        let res = new IMAGE_EXPORT_DIRECTORY_ENTRY(imagebase + entry.field('Address').getValue());
        return res;
    }
    throw errors.ExportTableMissingError();     // FIXME: store something useful
}

function main() {
    let le = getFirstLdrEntry();

    // figure out an .exe address
    let g_imagebase = le.field('DllBase').getValue();
    let h_pe = loadPeHeader(g_imagebase);
    let g_pebase = h_pe.getAddress();

    //Log.debug(h_pe.field('FileHeader').repr());
    //Log.debug(h_pe.field('OptionalHeader').repr());

    // get data directory table
    let h_datadirectory = loadDataDirectory(g_imagebase, h_pe);

    // Output each data-directory entry
    for (let i = 0; i < h_datadirectory.getLength(); i++) {
        let entry = h_datadirectory.field(i);
        if (entry.field('Address').getValue()) {
            Log.debug(`Index #${i} ${entry.repr()}`);
        }
    }

    // get section table
    let h_sectiontable = loadSectionTable(g_imagebase, h_pe);
    //Log.debug(h_sectiontable.repr());

    // output each section table entry
    for (let i = 0; i < h_sectiontable.getLength(); i++) {
        let entry = h_sectiontable.field(i);
        Log.debug(`Index #${i} ${entry.repr()}`);
    }

    // find the import table
    try {
        let h_import = loadImportTable(g_imagebase, h_pe);
        Log.debug(h_import.repr());
        Log.debug('INT');
        Log.debug(Ax.dump(g_imagebase+h_import.field('INT').getValue(), 16, 'uint32_t'));
        Log.debug('IAT');
        Log.debug(Ax.dump(g_imagebase+h_import.field('IAT').getValue(), 16, 'uint32_t'));
        Log.debug('Name');
        Log.debug(Ax.dump(g_imagebase+h_import.field('Name').getValue(), 32, 'uint8_t'));
    } catch (e) {
        if (!R.is(e, errors.ImportTableMissingError))
            log.debug(`Unexpected error ${e} caught.`);
        Log.warn('No import table found!');
    }

    // find the export table
    try {
        let h_exports = loadExportTable(g_imagebase, h_pe);
        Log.debug(h_exports.repr());
    } catch (e) {
        if (!R.is(e, errors.ExportTableMissingError))
            log.debug(`Unexpected error ${e} caught.`);
        Log.warn('No export table found!');
    }

    /*
    let output = document.body;
    Log.debug(output);
    output.innerText = 'hola mundo.';

    // scan for executables
    for (const address of ScanForExecutables()) {
        output.innerText += '\n' + Ax.dump(address, 16, 'uint8_t');
        alert(`Found executable at address ${toHex(address)}.`);
    }
    */
}

global.onload = main;
