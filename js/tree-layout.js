import {htreeLayout} from './htree-layout.js';
import {downtreeLayout} from "./downtree-layout.js";
import {uptreeLayout} from "./uptree-layout.js";

/**
 *
 * @param rootNd
 * // {
 *      id: "nd_1"
 *      el: "idOrElement",
 *      expand: true/false,
 *      expBtnId
 *      expBtnEl: : "idOrElement",
 *      childs: [
 *          { ... }
 *      ]
 * // }
 *
 * @param direction
 *  h  horizontal with left nodes and right nodes balance
 *  h-right  horizontal and all nodes on right
 *  up - from bottom to top
 *  down - from top to bottom
 * @param otherOptions
 * @return
 *
 */
const treeLayout = (rootNd, {direction = 'h', ...otherOptions}) => {
    if (['h', 'h-right'].includes(direction)) {
        return htreeLayout(rootNd, {
            allNdsOnRight: 'h-right' === direction,
            ...otherOptions,
        });
    }
    if ('down' === direction) {
        return downtreeLayout(rootNd, {...otherOptions,});
    }
    if ('up' === direction) {
        return uptreeLayout(rootNd, {...otherOptions,});
    }


    const errMsg = "unsupported layout: " + direction;
    console.error(errMsg);
    throw errMsg;
};

export {
    treeLayout
};