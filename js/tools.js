import { ofHex, toHex, Ax } from './ax';
import { R } from 'ramda';

import * as L from 'loglevel';
const Log = L.getLogger('tools');

export function* ScanForExecutables(start=0x1000, end=0x80000000) {
    const sizeQ = R.allPass([R.is(Number), R.lte(0)]);
    const fingerprintQ = R.allPass([R.is(Number), R.equals(0x5A4D)]);

    let address = start;
    while (address < end) {
        let [mbase, msize] = [Ax.mem_baseaddress(address), Ax.mem_size(address)];

        if (sizeQ([mbase, sizeQ(msize)])) {
            address = address + 0x1000;
            continue;
        }

        Log.debug(`ScanForExecutables -> ${toHex(address)} : ${toHex(mbase)}+${toHex(msize)}`);
        if (mbase != address)
            Log.warn(`Address ${toHex(address)} does not match base address ${toHex(mbase)}.`);

        // check that first word matches our header fingerprint
        let res = Ax.uint16_t(address);
        if (fingerprintQ(res))
            yield mbase;

        // skip to next mapping
        address = address + msize;
    }
}
