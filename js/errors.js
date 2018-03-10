import * as Err from 'errors';

/** Base classes that all exception types are derived from. */
Err.create({
    name: 'NotImplementedError',
    defaultExplanation: 'Missing implementation.',
});

Err.create({
    name: 'StaticError',
    defaultExplanation: 'A static error has occurred.',
});

Err.create({
    name: 'RuntimeError',
    defaultExplanation: 'A runtime error has occurred.',
});

Err.create({
    name: 'PropertyNotImplementedError',
    defaultExplanation: 'This class is missing the implementation of a required propery.',
    parent: Err.NotImplementedError,
});

Err.create({
    name: 'MethodNotImplementedError',
    defaultExplanation: 'This class is missing the implementation of a required method.',
    parent: Err.NotImplementedError,
});

Err.create({
    name: 'PrivateMemberError',
    defaultExplanation: 'This member is private and may not be accessed.',
    parent: Err.StaticError,
});

Err.create({
    name: 'ProtectedMemberError',
    defaultExplanation: 'This member is protected and may not be modified.',
    parent: Err.StaticError,
});

Err.create({
    name: 'IntegerError',
    defaultExplanation: 'An integer error has occurred.',
    parent: Err.RuntimeError,
});

Err.create({
    name: 'FloatingPointError',
    defaultExplanation: 'A floating-point error has occurred.',
    parent: Err.RuntimeError,
});

Err.create({
    name: 'AssertionError',
    defaultExplanation: 'An assertion has failed.',
    parent: Err.StaticError,
});

Err.create({
    name: 'MemoryError',
    defaultExplanation: 'An invalid memory access has occurred.',
    parent: Err.RuntimeError,
});

