import * as errors from 'errors';

errors.create({
    name: 'NotImplementedError',
    defaultExplanation: 'Missing implementation.',
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
    name: 'NativeError',
    defaultExplanation: 'An internal error has occurred.',
});

errors.create({
    name: 'IntegerError',
    defaultExplanation: 'An integer error has occurred.',
    parent: errors.NativeError,
});

errors.create({
    name: 'FloatingPointError',
    defaultExplanation: 'A floating-point error has occurred.',
    parent: errors.NativeError,
});

errors.create({
    name: 'AssertionError',
    defaultExplanation: 'An assertion has failed.',
});
