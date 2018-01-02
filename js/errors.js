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
