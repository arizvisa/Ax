import * as errors from 'errors';

/** Base classes that all exception types are derived from. */
errors.create({
    name: 'NotImplementedError',
    defaultExplanation: 'Missing implementation.',
});

errors.create({
    name: 'StaticError',
    defaultExplanation: 'A static error has occurred.',
});

errors.create({
    name: 'RuntimeError',
    defaultExplanation: 'A runtime error has occurred.',
});

errors.create({
    name: 'PropertyNotImplementedError',
    defaultExplanation: 'This class is missing the implementation of a required propery.',
    parent: errors.NotImplementedError,
});

errors.create({
    name: 'MethodNotImplementedError',
    defaultExplanation: 'This class is missing the implementation of a required method.',
    parent: errors.NotImplementedError,
});

errors.create({
    name: 'PrivateMemberError',
    defaultExplanation: 'This member is private and may not be accessed.',
    parent: errors.StaticError,
});

errors.create({
    name: 'ProtectedMemberError',
    defaultExplanation: 'This member is protected and may not be modified.',
    parent: errors.StaticError,
});

errors.create({
    name: 'IntegerError',
    defaultExplanation: 'An integer error has occurred.',
    parent: errors.RuntimeError,
});

errors.create({
    name: 'FloatingPointError',
    defaultExplanation: 'A floating-point error has occurred.',
    parent: errors.RuntimeError,
});

errors.create({
    name: 'AssertionError',
    defaultExplanation: 'An assertion has failed.',
    parent: errors.StaticError,
});

errors.create({
    name: 'MemoryError',
    defaultExplanation: 'An invalid memory access has occurred.',
    parent: errors.RuntimeError,
});

