import * as memory from './memory';
import * as J from './jtypes';
import * as pstypes from './ndk-pstypes';
import * as pecoff from './pecoff';
import * as pe from './pe-tools';

import * as utils from './utils';
import * as tools from './tools';
import * as Ax from './ax';

import * as Err from 'errors';
const errors = Err.default;

import * as L from 'loglevel';
L.setLevel('trace');
const Log = L.getLogger('Ax.index');

global.document.__load__ = Ax.load;
global.document.__store__ = Ax.store;

function redirect_log(log, E, width=120, height=10) {
    // Create a textarea for output
    let Section = global.document.createElement('textarea');
    E.appendChild(Section);

    // Set its dimensions
    const H = global.document.createAttribute('rows'); H.value = height;
    const W = global.document.createAttribute('cols'); W.value = width;
    Section.setAttributeNode(H); Section.setAttributeNode(W);

    // Modify loglevel to use the new logger
    const oldFactory = log.methodFactory;
    log.methodFactory = function(methodName, logLevel, loggerName) {
        const rawMethod = oldFactory(methodName, logLevel, loggerName);
        // Our new Logging function
        return function(message) {
            // Add a text node to the Section
            let row = global.document.createTextNode(`${methodName.toUpperCase()}: ${message}\n`);
            Section.appendChild(row);

            // Scroll to the bottom of it.
            Section.scrollTop = Section.scrollHeight;
        };
    };

    // Power cycle the module..
    log.setLevel(log.getLevel());
}

function main() {
    let Status = global.document.querySelector('.status');
    redirect_log(Log, Status);

    let Command = global.document.querySelector('.command');
    let Action = global.document.querySelector('.action');
    Command.size = 120;

    Command.addEventListener('keypress', (ev) => {
        let clicker = global.document.createEvent('MouseEvent');
        clicker.initMouseEvent('click', true, true, global.window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        if (ev.keyCode == 13)
            Action.dispatchEvent(clicker);
    });

    Action.addEventListener('click', (ev) => {
        const cmd = Command.value;

        let res;
        try {
            res = global.eval(cmd);
        } catch(e) {
            Log.error(e);
            return;
        }
        Log.info(`eval: ${cmd}`);

        let t = typeof res;
        switch (t) {
        case "object":
            let output = [];
            for (let k in res) {
                output.push(`    ${utils.dquote(k)}: ${res[k].toString()},`);
            }
            Log.warn(`object: {\n${output.join('\n')}\n}`);
            break;

        case "undefined":
            Log.warn(`${t}`);
            break;

        case "string":
            Log.warn(`string: ${utils.dquote(res)}`);
            break;

        default:
            Log.warn(`${t}: ${res}`);
        }

        Command.value = '';
    });

    Command.focus();

    Log.info('hola mundo.');
    let peb = Ax.getProcessPeb();
    Log.warn(`${utils.toHex(peb)}`);

    for (let m of tools.LdrWalk(peb)) {
        Log.info(m.repr());
    }

    global.document.ax = Ax;
    global.document.tools = tools;
    global.document.memory = memory;
    global.document.utils = utils;
}

global.onload = main;
