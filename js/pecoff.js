import {Juint8, Juint16, Juint32, Juint64, Jarray, Jstruct} from './jtypes';

class e_reserved extends Jarray {
    get Type() { return Juint16; }
    get Length() { return 4; }
}
class e_reserved2 extends Jarray {
    get Type() { return Juint16; }
    get Length() { return 10; }
}

export class IMAGE_DOS_HEADER extends Jstruct {
    get classname() { return "IMAGE_DOS_HEADER"; }
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
            ['e_reserved', e_reserved],
            ['e_oemid', Juint16],
            ['e_oeminfo', Juint16],
            ['e_reserved2', e_reserved2],
            ['e_lfanew', Juint32],
        ];
    }
}

class IMAGE_FILE_HEADER extends Jstruct {
    get classname() { return "IMAGE_FILE_HEADER"; }
    get Fields() {
        return [
            ['Machine', Juint16],
            ['NumberOfSections', Juint16],
            ['TimeDateStamp', Juint32],
            ['PointerToSymbolTable', Juint32],
            ['NumberOfSymbols', Juint32],
            ['SizeOfOptionalHeader', Juint16],
            ['Characteristics', Juint16],
        ]
    }
}

class IMAGE_OPTIONAL_HEADER extends Jstruct {
    get classname() { return "IMAGE_OPTIONAL_HEADER"; }
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
        ]
    }
}

export class IMAGE_DATA_DIRECTORY extends Jstruct {
    get classname() { return "IMAGE_DATA_DIRECTORY"; }
    get Type() {
        throw("not implemented");
    }
    get Fields() {
        return [
            ['Address', this.Type],
            ['Size', Juint32],
        ]
    }
}

export class IMAGE_SECTION_HEADER extends Jstruct {
    get classname() { return "IMAGE_SECTION_HEADER"; }
    get Fields() {
        return [
            ['Name', Juint64],
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
    get classname() { return "IMAGE_NT_HEADER"; }
    get Fields() {
        return [
            ['Signature', Juint16],
            ['padding(Signature)', Juint16],
            ['FileHeader', IMAGE_FILE_HEADER],
            ['OptionalHeader', IMAGE_OPTIONAL_HEADER],
//            ['DataDirectory', DataDirectory],
//            ['Sections', SectionTable],
        ];
    }
}

export class IMAGE_EXPORT_DIRECTORY extends Jstruct {
    get classname() { return 'IMAGE_EXPORT_DIRECTORY'; }
    get Fields() {
        return [
            ['Flags', Juint32],
            ['TimeDateStamp', Juint32],
            ['MajorVersion', Juint16],
            ['MinorVersion', Juint16],
            ['Name', Juint32],
            ['Base', Juint32],
            ['NumberOfFunctions', Juint32],
            ['NumberOfNames', Juint32],
            ['AddressOfFunctions', Juint32],
            ['AddressOfNames', Juint32],
            ['AddressOfNameOrdinals', Juint32],
        ];
    }
}

export class IMAGE_IMPORT_DIRECTORY_ENTRY extends Jstruct {
    get classname() { return 'IMAGE_IMPORT_DIRECTORY_ENTRY'; }
    get Fields() {
        return [
            ['INT', Juint32],
            ['TimeDateStamp', Juint32],
            ['ForwarderChain', Juint32],
            ['Name', Juint32],
            ['IAT', Juint32],
        ];
    }
}
