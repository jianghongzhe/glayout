import {htreeLayout} from './htree-layout.js';

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
 *          {
 *              dd
 *
 *          }
 *      ]
 * // }
 *
 * @param direction
 *  h  horizontal with left nodes and right nodes balance
 *  h-right  horizontal and all nodes on right
 *  up - from bottom to top
 *  down - from top to bottom
 *
 * @return
 * [
 *     {
 *         id:'x',
 *         left: 1,
 *         top: 1,
 *         visible: true,
 *         expBtnLeft: 1,
 *         expBtnTop: 1,
 *         expBtnVisible: true,
 *     }
 * ]
 *
 */
const treeLayout = (rootNd, {direction = 'h', ...otherOptions}) => {
    if (['h', 'h-right'].includes(direction)) {
        return htreeLayout(rootNd, {
            allNdsOnRight: 'h-right' === direction,
            ...otherOptions,
        });
    }

    const errMsg="unsupported layout: "+direction;
    console.error(errMsg);
    throw errMsg;
};

export {
    treeLayout
};