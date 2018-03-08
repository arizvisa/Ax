import {Jpointer, Juint8, Juint16, Juint32, Juint64, Jarray, Jstruct} from './jtypes';
import {UNICODE_STRING} from './ndk-umtypes';
import * as errors from 'errors';

// pstypes.js
class LDR_DATA_TABLE_ENTRY extends Jstruct {
    static typename() { return 'LDR_DATA_TABLE_ENTRY'; }
    get Fields() {
        return [
            ['InLoadOrderLinks', PEB_LDR_DATA__InLoadOrderModuleList],
            ['InMemoryOrderLinks', PEB_LDR_DATA__InMemoryOrderModuleList],
            ['InInitializationOrderLinks', PEB_LDR_DATA__InInitializationOrderModuleList],
            ['DllBase', Juint32],
            ['EntryPoint', Juint32],
            ['SizeOfImage', Juint32],
            ['FullDllName', UNICODE_STRING],
            ['BaseDllName', UNICODE_STRING],
        ];
    }
}

class LIST_ENTRY extends Jstruct {
    static typename() { return 'LIST_ENTRY'; }
    get Type() {
        throw new errors.UndefinedFieldError('Type');
    }
    get Fields() {
        let pointer = this.Type;
        return [
            ['Flink', pointer],
            ['Blink', pointer],
        ];
    }
}

class PEB_LDR_DATA__InLoadOrderModuleList__Ptr extends Jpointer {
    static typename() { return 'LDR_DATA_TABLE_ENTRY*'; }
    get Type() { return LDR_DATA_TABLE_ENTRY; }
    calculate(ea) {
        return ea - 0;
    }
}
class PEB_LDR_DATA__InLoadOrderModuleList extends LIST_ENTRY {
    get Type() { return PEB_LDR_DATA__InLoadOrderModuleList__Ptr; }
}
class PEB_LDR_DATA__InMemoryOrderModuleList__Ptr extends Jpointer {
    static typename() { return 'LDR_DATA_TABLE_ENTRY*'; }
    get Type() { return LDR_DATA_TABLE_ENTRY; }
    calculate(ea) {
        return ea - 8;
    }
}
class PEB_LDR_DATA__InMemoryOrderModuleList extends LIST_ENTRY {
    get Type() { return PEB_LDR_DATA__InMemoryOrderModuleList__Ptr; }
}
class PEB_LDR_DATA__InInitializationOrderModuleList__Ptr extends Jpointer {
    static typename() { return 'LDR_DATA_TABLE_ENTRY*'; }
    get Type() { return LDR_DATA_TABLE_ENTRY; }
    calculate(ea) {
        return ea - 16;
    }
}
class PEB_LDR_DATA__InInitializationOrderModuleList extends LIST_ENTRY {
    get Type() { return PEB_LDR_DATA__InInitializationOrderModuleList__Ptr; }
}

class PEB_LDR_DATA extends Jstruct {
    static typename() { return 'PEB_LDR_DATA'; }
    get Fields() {
        return [
            ['Length', Juint32],
            ['Initialized', Juint32],
            ['SsHandle', Juint32],
            ['InLoadOrderModuleLoadList', PEB_LDR_DATA__InLoadOrderModuleList],
            ['InMemoryOrderModuleList', PEB_LDR_DATA__InMemoryOrderModuleList],
            ['InInitializationOrderModuleList', PEB_LDR_DATA__InInitializationOrderModuleList],
            ['EntryInProgress', Juint32],
            ['ShutdownInProgress', Juint32],
            ['ShutdownThreadId', Juint32],
        ];
    }
}

class PEB__LdrPointer extends Jpointer {
    static typename() { return 'PEB_LDR_DATA*'; }
    get Type() {
        return PEB_LDR_DATA;
    }
}

export class PEB extends Jstruct {
    static typename() { return 'PEB'; }
    get Fields() {
        return [
            ['InheritedAddressSpace', Juint8],
            ['ReadImageFileExecOptions', Juint8],
            ['BeingDebugged', Juint8],
            ['BitField', Juint8],
            ['Mutant', Juint32],
            ['ImageBaseAddress', Juint32],
            ['Ldr', PEB__LdrPointer],
        ];
    }
}

