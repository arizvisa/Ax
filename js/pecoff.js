import {Juint8, Juint16, Juint32, Juint64, Jarray, Jstruct, Jtarray, Jstring, Jszstring, Jpointer} from './jtypes';
import {toHex, ofHex} from './ax';

import * as L from 'loglevel';
const Log = L.getLogger('pecoff');

import * as Err from 'errors';
const errors = Err.default;

Err.create({
    name: 'TypeNotFoundError',
    defaultExplanation: 'Unable to locate specific type.',
    parent: Err.RuntimeError,
});

class RVAPointer extends Jpointer {
    calculate(ea) {
        let res = this;
        while (res) {
            if (res instanceof IMAGE_DOS_HEADER)
                return res.address + ea;
            res = res.parent;
        }
        throw new errors.TypeNotFoundError(IMAGE_DOS_HEADER);
    }
}

class IMAGE_DOS_HEADER__e_reserved extends Jarray {
    get Type() { return Juint16; }
    get Length() { return 4; }
}
class IMAGE_DOS_HEADER__e_reserved2 extends Jarray {
    get Type() { return Juint16; }
    get Length() { return 10; }
}

export class IMAGE_DOS_HEADER extends Jstruct {
    static typename() { return 'IMAGE_DOS_HEADER'; }
    get Fields() {
        return [
            ['e_magic', Juint16],
            ['e_cblp', Juint16],
            ['e_cb', Juint16],
            ['e_crlc', Juint16],
            ['e_cparhdr', Juint16],
            ['e_minalloc', Juint16],
            ['e_maxalloc', Juint16],
            ['e_ss', Juint16],
            ['e_sp', Juint16],
            ['e_csum', Juint16],
            ['e_ip', Juint16],
            ['e_cs', Juint16],
            ['e_lfarlc', Juint16],
            ['e_ovno', Juint16],
            ['e_reserved', IMAGE_DOS_HEADER__e_reserved],
            ['e_oemid', Juint16],
            ['e_oeminfo', Juint16],
            ['e_reserved2', IMAGE_DOS_HEADER__e_reserved2],
            ['e_lfanew', Juint32],
        ];
    }
}

class IMAGE_FILE_HEADER extends Jstruct {
    static typename() { return 'IMAGE_FILE_HEADER'; }
    get Fields() {
        return [
            ['Machine', Juint16],
            ['NumberOfSections', Juint16],
            ['TimeDateStamp', Juint32],
            ['PointerToSymbolTable', Juint32],
            ['NumberOfSymbols', Juint32],
            ['SizeOfOptionalHeader', Juint16],
            ['Characteristics', Juint16],
        ];
    }
}

class IMAGE_OPTIONAL_HEADER extends Jstruct {
    static typename() { return 'IMAGE_OPTIONAL_HEADER'; }
    get Fields() {
        return [
            ['Magic', Juint16],
            ['MajorLinkVersion', Juint8],
            ['MinorLinkVersion', Juint8],
            ['SizeOfCode', Juint32],
            ['SizeOfInitializedData', Juint32],
            ['SizeOfUninitializedData', Juint32],
            ['AddressOfEntryPoint', Juint32],
            ['BaseOfCode', Juint32],
            ['BaseOfData', Juint32],
            ['ImageBase', Juint32],
            ['SectionAlignment', Juint32],
            ['FileAlignment', Juint32],
            ['MajorOperatingSystemVersion', Juint16],
            ['MinorOperatingSystemVersion', Juint16],
            ['MajorImageVersion' , Juint16],
            ['MinorImageVersion', Juint16],
            ['MajorSubsystemVersion', Juint16],
            ['MinorSubsystemVersion', Juint16],
            ['Win32VersionValue', Juint32],
            ['SizeOfImage', Juint32],
            ['SizeOfHeaders', Juint32],
            ['CheckSum', Juint32],
            ['Subsystem', Juint16],
            ['DllCharacteristics', Juint16],
            ['SizeOfStackReserve', Juint32],
            ['SizeOfStackCommit', Juint32],
            ['SizeOfHeapReserve', Juint32],
            ['SizeOfHeapCommit', Juint32],
            ['LoaderFlags', Juint32],
            ['NumberOfRvaAndSizes', Juint32],
        ];
    }
}

export class IMAGE_DATA_DIRECTORY extends Jstruct {
    static typename() { return 'IMAGE_DATA_DIRECTORY'; }
    get Type() {
        let ea = this.address;
        Log.debug(`Ignoring untyped pointer for field Address in IMAGE_DATA_DIRECTORY(${toHex(ea)}).`);
        return Juint32;
    }
    get Fields() {
        return [
            ['Address', this.Type],
            ['Size', Juint32],
        ];
    }
}

class IMAGE_SECTION_HEADER__Name extends Jstring {
    get Length() { return 8; }
}

export class IMAGE_SECTION_HEADER extends Jstruct {
    static typename() { return 'IMAGE_SECTION_HEADER'; }
    get Fields() {
        return [
            ['Name', IMAGE_SECTION_HEADER__Name],
            ['VirtualSize', Juint32],
            ['VirtualAddress', Juint32],
            ['SizeOfRawData', Juint32],
            ['PointerToRawData', Juint32],
            ['PointerToRelocations', Juint32],
            ['PointerToLinenumbers', Juint32],
            ['NumberOfRelocations', Juint16],
            ['NumberOfLinenumbers', Juint16],
            ['Characteristics', Juint32],
        ];
    }
}

export class IMAGE_NT_HEADER extends Jstruct {
    static typename() { return 'IMAGE_NT_HEADER'; }
    get Fields() {
        return [
            ['Signature', Juint16],
            ['padding(Signature)', Juint16],
            ['FileHeader', IMAGE_FILE_HEADER],
            ['OptionalHeader', IMAGE_OPTIONAL_HEADER],
            ['DataDirectory', IMAGE_NT_HEADER__DataDirectory],
            ['Sections', IMAGE_NT_HEADER__SectionTable],
        ];
    }
}

export class IMAGE_NT_HEADER__DataDirectory extends Jarray {
    static typename() { return 'DataDirectory{...}'; }
    get classname() { return 'DataDirectory{' + this.Length + '}'; }
    get Type() { return IMAGE_DATA_DIRECTORY; }
    get Length() {
        let header = this.parent;
        let res = header.field('OptionalHeader').field('NumberOfRvaAndSizes');
        return res.int();
    }
}

export class IMAGE_NT_HEADER__SectionTable extends Jarray {
    static typename() { return 'SectionTable{...}'; }
    get classname() { return 'SectionTable{' + this.Length + '}'; }
    get Type() { return IMAGE_SECTION_HEADER; }
    get Length() {
        let header = this.parent;
        let res = header.field('FileHeader').field('NumberOfSections');
        return res.int();
    }
}

class IMAGE_EXPORT_DIRECTORY__Name extends RVAPointer {
    static typename() { return 'Jszstring*'; }
    get Type() { return Jszstring; }
}

class IMAGE_EXPORT_DIRECTORY__pAddressOfFunctions extends RVAPointer {
    static typename() { return 'Jpointer{...}*'; }
    get Type() { return IMAGE_EXPORT_DIRECTORY__AddressOfFunctions; }
}
class IMAGE_EXPORT_DIRECTORY__AddressOfFunctions extends Jarray {
    static typename() { return 'Jpointer{...}'; }
    get Type() { return Jpointer; }  /* FIXME: pointer to a virtualaddress */
    get Length() {
        let ptr = this.parent;
        let directory = ptr.parent;
        return directory.field('NumberOfFunctions').int();
    }
}

class IMAGE_EXPORT_DIRECTORY__pAddressOfNames extends RVAPointer {
    static typename() { return 'Jszstring*{...}*'; }
    get Type() { return IMAGE_EXPORT_DIRECTORY__AddressOfNames; }
}
class IMAGE_EXPORT_DIRECTORY__AddressOfNames extends Jarray {
    static typename() { return 'Jszstring*{...}'; }
    get Type() { return IMAGE_EXPORT_DIRECTORY__AddressOfNames__pString; }
    get Length() {
        let ptr = this.parent;
        let directory = ptr.parent;
        return directory.field('NumberOfNames').int();
    }
}
class IMAGE_EXPORT_DIRECTORY__AddressOfNames__pString extends RVAPointer {
    static typename() { return 'Jszstring*'; }
    get Type() { return Jszstring; }
}

class IMAGE_EXPORT_DIRECTORY__pAddressOfNameOrdinals extends RVAPointer {
    static typename() { return 'Juint16{...}*'; }
    get Type() { return IMAGE_EXPORT_DIRECTORY__AddressOfNameOrdinals; }
}
class IMAGE_EXPORT_DIRECTORY__AddressOfNameOrdinals extends Jarray {
    static typename() { return 'Juint16{...}'; }
    get Type() { return Juint16; }
    get Length() {
        let ptr = this.parent;
        let directory = ptr.parent;
        return directory.field('NumberOfNames').int();
    }
}

export class IMAGE_EXPORT_DIRECTORY extends Jstruct {
    static typename() { return 'IMAGE_EXPORT_DIRECTORY'; }
    get Fields() {
        return [
            ['Flags', Juint32],
            ['TimeDateStamp', Juint32],
            ['MajorVersion', Juint16],
            ['MinorVersion', Juint16],
            ['Name', IMAGE_EXPORT_DIRECTORY__Name],
            ['Base', Juint32],
            ['NumberOfFunctions', Juint32],
            ['NumberOfNames', Juint32],
            ['AddressOfFunctions', IMAGE_EXPORT_DIRECTORY__pAddressOfFunctions],
            ['AddressOfNames', IMAGE_EXPORT_DIRECTORY__pAddressOfNames],
            ['AddressOfNameOrdinals', IMAGE_EXPORT_DIRECTORY__pAddressOfNameOrdinals],
        ];
    }
}

class IMAGE_IMPORT_DIRECTORY_ENTRY__pINT extends RVAPointer {
    static typename() { return 'IMAGE_IMPORT_NAME_HINT{...}**'; }
    get Type() { return IMAGE_IMPORT_DIRECTORY_ENTRY__INT; }
}
class IMAGE_IMPORT_DIRECTORY_ENTRY__INT extends Jtarray {
    static typename() { return 'IMAGE_IMPORT_NAME_HINT{...}*'; }
    get Type() { return IMAGE_IMPORT_DIRECTORY_ENTRY__INT__HINT; }
    isTerminator(object) {
        return object.int() == 0;
    }
}
class IMAGE_IMPORT_DIRECTORY_ENTRY__INT__HINT extends RVAPointer {
    static typename() { return 'IMAGE_IMPORT_NAME_HINT*'; }
    get Type() { return IMAGE_IMPORT_NAME_HINT; }
}
class IMAGE_IMPORT_NAME_HINT extends Jstruct {
    static typename() { return 'IMAGE_IMPORT_NAME_HINT'; }
    get Fields() {
        return [
            ['Hint', Juint16],
            ['String', Jszstring], // FIXME: should be word-aligned
        ];
    }
}

class IMAGE_IMPORT_DIRECTORY_ENTRY__pName extends RVAPointer {
    static typename() { return 'Jszstring*'; }
    get Type() { return Jszstring; }
}

class IMAGE_IMPORT_DIRECTORY_ENTRY__pIAT extends RVAPointer {
    static typename() { return 'Juint32{...}*'; }
    get Type() { return IMAGE_IMPORT_DIRECTORY_ENTRY__IAT; }
}
class IMAGE_IMPORT_DIRECTORY_ENTRY__IAT extends Jtarray {
    static typename() { return 'Juint32{...}'; }
    get Type() { return Juint32; }
    isTerminator(object) {
        return object.int() == 0;
    }
}

export class IMAGE_IMPORT_DIRECTORY_ENTRY extends Jstruct {
    static typename() { return 'IMAGE_IMPORT_DIRECTORY_ENTRY'; }
    get Fields() {
        return [
            ['INT', IMAGE_IMPORT_DIRECTORY_ENTRY__pINT],
            ['TimeDateStamp', Juint32],
            ['ForwarderChain', Juint32],
            ['Name', IMAGE_IMPORT_DIRECTORY_ENTRY__pName],
            ['IAT', IMAGE_IMPORT_DIRECTORY_ENTRY__pIAT],
        ];
    }
}

export class IMAGE_IMPORT_DIRECTORY extends Jtarray {
    static typename() { return 'IMAGE_IMPORT_DIRECTORY'; }
    get Type() { return IMAGE_IMPORT_DIRECTORY_ENTRY; }
    isTerminator(object) {
        return object.field('IAT').int() == 0;
    }
}
