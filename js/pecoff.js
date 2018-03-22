import * as Ax from './ax';
import * as J from './jtypes';

import * as L from 'loglevel';
const Log = L.getLogger('Ax.pecoff');

import * as Err from 'errors';
const errors = Err.default;

Err.create({
    name: 'TypeNotFoundError',
    defaultExplanation: 'Unable to locate specific type.',
    parent: Err.RuntimeError,
});

class RVAPointer extends J.Jpointer {
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

class IMAGE_DOS_HEADER__e_reserved extends J.Jarray {
    get Type() { return J.Juint16; }
    get Length() { return 4; }
}
class IMAGE_DOS_HEADER__e_reserved2 extends J.Jarray {
    get Type() { return J.Juint16; }
    get Length() { return 10; }
}

export class IMAGE_DOS_HEADER extends J.Jstruct {
    static typename() { return 'IMAGE_DOS_HEADER'; }
    get Fields() {
        return [
            ['e_magic', J.Juint16],
            ['e_cblp', J.Juint16],
            ['e_cb', J.Juint16],
            ['e_crlc', J.Juint16],
            ['e_cparhdr', J.Juint16],
            ['e_minalloc', J.Juint16],
            ['e_maxalloc', J.Juint16],
            ['e_ss', J.Juint16],
            ['e_sp', J.Juint16],
            ['e_csum', J.Juint16],
            ['e_ip', J.Juint16],
            ['e_cs', J.Juint16],
            ['e_lfarlc', J.Juint16],
            ['e_ovno', J.Juint16],
            ['e_reserved', IMAGE_DOS_HEADER__e_reserved],
            ['e_oemid', J.Juint16],
            ['e_oeminfo', J.Juint16],
            ['e_reserved2', IMAGE_DOS_HEADER__e_reserved2],
            ['e_lfanew', J.Juint32],
        ];
    }
}

class IMAGE_FILE_HEADER extends J.Jstruct {
    static typename() { return 'IMAGE_FILE_HEADER'; }
    get Fields() {
        return [
            ['Machine', J.Juint16],
            ['NumberOfSections', J.Juint16],
            ['TimeDateStamp', J.Juint32],
            ['PointerToSymbolTable', J.Juint32],
            ['NumberOfSymbols', J.Juint32],
            ['SizeOfOptionalHeader', J.Juint16],
            ['Characteristics', J.Juint16],
        ];
    }
}

class IMAGE_OPTIONAL_HEADER extends J.Jstruct {
    static typename() { return 'IMAGE_OPTIONAL_HEADER'; }
    get Fields() {
        return [
            ['Magic', J.Juint16],
            ['MajorLinkVersion', J.Juint8],
            ['MinorLinkVersion', J.Juint8],
            ['SizeOfCode', J.Juint32],
            ['SizeOfInitializedData', J.Juint32],
            ['SizeOfUninitializedData', J.Juint32],
            ['AddressOfEntryPoint', J.Juint32],
            ['BaseOfCode', J.Juint32],
            ['BaseOfData', J.Juint32],
            ['ImageBase', J.Juint32],
            ['SectionAlignment', J.Juint32],
            ['FileAlignment', J.Juint32],
            ['MajorOperatingSystemVersion', J.Juint16],
            ['MinorOperatingSystemVersion', J.Juint16],
            ['MajorImageVersion' , J.Juint16],
            ['MinorImageVersion', J.Juint16],
            ['MajorSubsystemVersion', J.Juint16],
            ['MinorSubsystemVersion', J.Juint16],
            ['Win32VersionValue', J.Juint32],
            ['SizeOfImage', J.Juint32],
            ['SizeOfHeaders', J.Juint32],
            ['CheckSum', J.Juint32],
            ['Subsystem', J.Juint16],
            ['DllCharacteristics', J.Juint16],
            ['SizeOfStackReserve', J.Juint32],
            ['SizeOfStackCommit', J.Juint32],
            ['SizeOfHeapReserve', J.Juint32],
            ['SizeOfHeapCommit', J.Juint32],
            ['LoaderFlags', J.Juint32],
            ['NumberOfRvaAndSizes', J.Juint32],
        ];
    }
}

export class IMAGE_DATA_DIRECTORY extends J.Jstruct {
    static typename() { return 'IMAGE_DATA_DIRECTORY'; }
    get Type() {
        let ea = this.address;
        Log.debug(`Ignoring untyped pointer for field Address in IMAGE_DATA_DIRECTORY(${Ax.toHex(ea)}).`);
        return J.Juint32;
    }
    get Fields() {
        return [
            ['Address', this.Type],
            ['Size', J.Juint32],
        ];
    }
}

class IMAGE_SECTION_HEADER__Name extends J.Jstring {
    get Length() { return 8; }
}

export class IMAGE_SECTION_HEADER extends J.Jstruct {
    static typename() { return 'IMAGE_SECTION_HEADER'; }
    get Fields() {
        return [
            ['Name', IMAGE_SECTION_HEADER__Name],
            ['VirtualSize', J.Juint32],
            ['VirtualAddress', J.Juint32],
            ['SizeOfRawData', J.Juint32],
            ['PointerToRawData', J.Juint32],
            ['PointerToRelocations', J.Juint32],
            ['PointerToLinenumbers', J.Juint32],
            ['NumberOfRelocations', J.Juint16],
            ['NumberOfLinenumbers', J.Juint16],
            ['Characteristics', J.Juint32],
        ];
    }
}

export class IMAGE_NT_HEADER extends J.Jstruct {
    static typename() { return 'IMAGE_NT_HEADER'; }
    get Fields() {
        return [
            ['Signature', J.Juint16],
            ['padding(Signature)', J.Juint16],
            ['FileHeader', IMAGE_FILE_HEADER],
            ['OptionalHeader', IMAGE_OPTIONAL_HEADER],
            ['DataDirectory', IMAGE_NT_HEADER__DataDirectory],
            ['Sections', IMAGE_NT_HEADER__SectionTable],
        ];
    }
}

export class IMAGE_NT_HEADER__DataDirectory extends J.Jarray {
    static typename() { return 'DataDirectory{...}'; }
    get classname() { return 'DataDirectory{' + this.Length + '}'; }
    get Type() { return IMAGE_DATA_DIRECTORY; }
    get Length() {
        let header = this.parent;
        let res = header.field('OptionalHeader').field('NumberOfRvaAndSizes');
        return res.int();
    }
}

export class IMAGE_NT_HEADER__SectionTable extends J.Jarray {
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
    get Type() { return J.Jszstring; }
}

class IMAGE_EXPORT_DIRECTORY__pAddressOfFunctions extends RVAPointer {
    static typename() { return 'Jpointer{...}*'; }
    get Type() { return IMAGE_EXPORT_DIRECTORY__AddressOfFunctions; }
}
class IMAGE_EXPORT_DIRECTORY__AddressOfFunctions extends J.Jarray {
    static typename() { return 'Jpointer{...}'; }
    get Type() { return J.Jpointer; }  /* FIXME: pointer to a virtualaddress */
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
class IMAGE_EXPORT_DIRECTORY__AddressOfNames extends J.Jarray {
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
    get Type() { return J.Jszstring; }
}

class IMAGE_EXPORT_DIRECTORY__pAddressOfNameOrdinals extends RVAPointer {
    static typename() { return 'Juint16{...}*'; }
    get Type() { return IMAGE_EXPORT_DIRECTORY__AddressOfNameOrdinals; }
}
class IMAGE_EXPORT_DIRECTORY__AddressOfNameOrdinals extends J.Jarray {
    static typename() { return 'Juint16{...}'; }
    get Type() { return J.Juint16; }
    get Length() {
        let ptr = this.parent;
        let directory = ptr.parent;
        return directory.field('NumberOfNames').int();
    }
}

export class IMAGE_EXPORT_DIRECTORY extends J.Jstruct {
    static typename() { return 'IMAGE_EXPORT_DIRECTORY'; }
    get Fields() {
        return [
            ['Flags', J.Juint32],
            ['TimeDateStamp', J.Juint32],
            ['MajorVersion', J.Juint16],
            ['MinorVersion', J.Juint16],
            ['Name', IMAGE_EXPORT_DIRECTORY__Name],
            ['Base', J.Juint32],
            ['NumberOfFunctions', J.Juint32],
            ['NumberOfNames', J.Juint32],
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
class IMAGE_IMPORT_DIRECTORY_ENTRY__INT extends J.Jtarray {
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
class IMAGE_IMPORT_NAME_HINT extends J.Jstruct {
    static typename() { return 'IMAGE_IMPORT_NAME_HINT'; }
    get Fields() {
        return [
            ['Hint', J.Juint16],
            ['String', J.Jszstring], // FIXME: should be word-aligned
        ];
    }
}

class IMAGE_IMPORT_DIRECTORY_ENTRY__pName extends RVAPointer {
    static typename() { return 'Jszstring*'; }
    get Type() { return J.Jszstring; }
}

class IMAGE_IMPORT_DIRECTORY_ENTRY__pIAT extends RVAPointer {
    static typename() { return 'Juint32{...}*'; }
    get Type() { return IMAGE_IMPORT_DIRECTORY_ENTRY__IAT; }
}
class IMAGE_IMPORT_DIRECTORY_ENTRY__IAT extends J.Jtarray {
    static typename() { return 'Juint32{...}'; }
    get Type() { return J.Juint32; }
    isTerminator(object) {
        return object.int() == 0;
    }
}

export class IMAGE_IMPORT_DIRECTORY_ENTRY extends J.Jstruct {
    static typename() { return 'IMAGE_IMPORT_DIRECTORY_ENTRY'; }
    get Fields() {
        return [
            ['INT', IMAGE_IMPORT_DIRECTORY_ENTRY__pINT],
            ['TimeDateStamp', J.Juint32],
            ['ForwarderChain', J.Juint32],
            ['Name', IMAGE_IMPORT_DIRECTORY_ENTRY__pName],
            ['IAT', IMAGE_IMPORT_DIRECTORY_ENTRY__pIAT],
        ];
    }
}

export class IMAGE_IMPORT_DIRECTORY extends J.Jtarray {
    static typename() { return 'IMAGE_IMPORT_DIRECTORY'; }
    get Type() { return IMAGE_IMPORT_DIRECTORY_ENTRY; }
    isTerminator(object) {
        return object.field('IAT').int() == 0;
    }
}
