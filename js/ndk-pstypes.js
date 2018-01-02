import {Jpointer, Juint8, Juint16, Juint32, Juint64, Jarray, Jstruct, UNICODE_STRING} from './jtypes';
import * as errors from 'errors';

// pstypes.js
class LDR_DATA_TABLE_ENTRY extends Jstruct {
    get classname() { return "LDR_DATA_TABLE_ENTRY"; }
    get Fields() {
        return [
            ['InLoadOrderLinks', LIST_ENTRY_InLoadOrderModuleList],
            ['InMemoryOrderLinks', LIST_ENTRY_InMemoryOrderModuleList],
            ['InInitializationOrderLinks', LIST_ENTRY_InInitializationOrderModuleList],
            ['DllBase', Juint32],
            ['EntryPoint', Juint32],
            ['SizeOfImage', Juint32],
            ['FullDllName', UNICODE_STRING],
            ['BaseDllName', UNICODE_STRING],
        ];
    }
}

class LIST_ENTRY extends Jstruct {
    get classname() { return "LIST_ENTRY"; }
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

class Ptr_InLoadOrderModuleList extends Jpointer {
    get Type() { return LDR_DATA_TABLE_ENTRY; }
    calculate(ea) { 
        return ea - 0;
    }
}
class LIST_ENTRY_InLoadOrderModuleList extends LIST_ENTRY {
    get Type() { return Ptr_InLoadOrderModuleList; }
}
class Ptr_InMemoryOrderModuleList extends Jpointer {
    get Type() { return LDR_DATA_TABLE_ENTRY; }
    calculate(ea) { 
        return ea - 8;
    }
}
class LIST_ENTRY_InMemoryOrderModuleList extends LIST_ENTRY {
    get Type() { return Ptr_InMemoryOrderModuleList; }
}
class Ptr_InInitializationOrderModuleList extends Jpointer {
    get Type() { return LDR_DATA_TABLE_ENTRY; }
    calculate(ea) { 
        return ea - 16;
    }
}
class LIST_ENTRY_InInitializationOrderModuleList extends LIST_ENTRY {
    get Type() { return Ptr_InInitializationOrderModuleList; }
}

class PEB_LDR_DATA extends Jstruct {
    get classname() { return "Ldr"; }
    get Fields() {
        return [
            ['Length', Juint32],
            ['Initialized', Juint32],
            ['SsHandle', Juint32],
            ['InLoadOrderModuleLoadList', LIST_ENTRY_InLoadOrderModuleList],
            ['InMemoryOrderModuleList', LIST_ENTRY_InMemoryOrderModuleList],
            ['InInitializationOrderModuleList', LIST_ENTRY_InInitializationOrderModuleList],
            ['EntryInProgress', Juint32],
            ['ShutdownInProgress', Juint32],
            ['ShutdownThreadId', Juint32],
        ];
    }
}

class LdrPointer extends Jpointer {
    get classname() { return "*Ldr"; }
    get Type() {
        return PEB_LDR_DATA;
    }
}

export class PEB extends Jstruct {
    get classname() { return "PEB"; }
    get Fields() {
        return [
            ['InheritedAddressSpace', Juint8],
            ['ReadImageFileExecOptions', Juint8],
            ['BeingDebugged', Juint8],
            ['BitField', Juint8],
            ['Mutant', Juint32],
            ['ImageBaseAddress', Juint32],
            ['Ldr', LdrPointer],
        ];
    }
}

