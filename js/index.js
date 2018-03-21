import * as Ax from './ax';
import * as J from './jtypes';

import * as pstypes from './ndk-pstypes';

import * as pecoff from './pecoff';
import * as pe from './pe-tools';
import * as tools from './tools';

import * as R from 'ramda';
import * as Lazy from 'lazy.js';

import * as Err from 'errors';
const errors = Err.default;

import * as L from 'loglevel';
L.setLevel('trace');
const Log = L.getLogger('index');

function main() {
}

global.onload = main;
