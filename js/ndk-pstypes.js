import * as J from './jtypes';
import * as um from './ndk-umtypes';

import * as Err from 'errors';
const errors = Err.default;

// pstypes.js
class LDR_DATA_TABLE_ENTRY extends J.Jstruct {
    static typename() { return 'LDR_DATA_TABLE_ENTRY'; }
    get Fields() {
        return [
            ['InLoadOrderLinks', PEB_LDR_DATA__InLoadOrderModuleList],
            ['InMemoryOrderLinks', PEB_LDR_DATA__InMemoryOrderModuleList],
            ['InInitializationOrderLinks', PEB_LDR_DATA__InInitializationOrderModuleList],
            ['DllBase', J.Juint32],
            ['EntryPoint', J.Juint32],
            ['SizeOfImage', J.Juint32],
            ['FullDllName', um.UNICODE_STRING],
            ['BaseDllName', um.UNICODE_STRING],
        ];
    }
}

class LIST_ENTRY extends J.Jstruct {
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

class PEB_LDR_DATA__InLoadOrderModuleList__Ptr extends J.Jpointer {
    static typename() { return 'LDR_DATA_TABLE_ENTRY*'; }
    get Type() { return LDR_DATA_TABLE_ENTRY; }
    calculate(ea) {
        return ea - 0;
    }
}
class PEB_LDR_DATA__InLoadOrderModuleList extends LIST_ENTRY {
    get Type() { return PEB_LDR_DATA__InLoadOrderModuleList__Ptr; }
}
class PEB_LDR_DATA__InMemoryOrderModuleList__Ptr extends J.Jpointer {
    static typename() { return 'LDR_DATA_TABLE_ENTRY*'; }
    get Type() { return LDR_DATA_TABLE_ENTRY; }
    calculate(ea) {
        return ea - 8;
    }
}
class PEB_LDR_DATA__InMemoryOrderModuleList extends LIST_ENTRY {
    get Type() { return PEB_LDR_DATA__InMemoryOrderModuleList__Ptr; }
}
class PEB_LDR_DATA__InInitializationOrderModuleList__Ptr extends J.Jpointer {
    static typename() { return 'LDR_DATA_TABLE_ENTRY*'; }
    get Type() { return LDR_DATA_TABLE_ENTRY; }
    calculate(ea) {
        return ea - 16;
    }
}
class PEB_LDR_DATA__InInitializationOrderModuleList extends LIST_ENTRY {
    get Type() { return PEB_LDR_DATA__InInitializationOrderModuleList__Ptr; }
}

class PEB_LDR_DATA extends J.Jstruct {
    static typename() { return 'PEB_LDR_DATA'; }
    get Fields() {
        return [
            ['Length', J.Juint32],
            ['Initialized', J.Juint32],
            ['SsHandle', J.Juint32],
            ['InLoadOrderModuleLoadList', PEB_LDR_DATA__InLoadOrderModuleList],
            ['InMemoryOrderModuleList', PEB_LDR_DATA__InMemoryOrderModuleList],
            ['InInitializationOrderModuleList', PEB_LDR_DATA__InInitializationOrderModuleList],
            ['EntryInProgress', J.Juint32],
            ['ShutdownInProgress', J.Juint32],
            ['ShutdownThreadId', J.Juint32],
        ];
    }
}

class PEB__LdrPointer extends J.Jpointer {
    static typename() { return 'PEB_LDR_DATA*'; }
    get Type() {
        return PEB_LDR_DATA;
    }
}

export class PEB extends J.Jstruct {
    static typename() { return 'PEB'; }
    get Fields() {
        return [
            ['InheritedAddressSpace', J.Juint8],
            ['ReadImageFileExecOptions', J.Juint8],
            ['BeingDebugged', J.Juint8],
            ['BitField', J.Juint8],
            ['Mutant', J.Juint32],
            ['ImageBaseAddress', J.Juint32],
            ['Ldr', PEB__LdrPointer],
        ];
    }
}

