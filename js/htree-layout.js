import {toInt} from './util.js';
import {calcHiddenNdsAndExpBtnsStyle, flattenNds, loadRects, refineNdPos} from "./common.js";
import {htreeLayoutDefaultOptions} from "./const.js";


/**
 *
 * @param rootNd
 * // {
 *      id: "nd_1"
 *      selectorOrEle: "idOrElement",
 *      expand: true/false,
 *      expBtnId
 *      expBtnEl: : "idOrElement",
 *      childs: [
 *      ]
 * // }
 * @param options
 * // {
 *     nodePaddingTopSecondary: 20,
 *     nodePaddingTop: 10,
 *     xDistAngleDegree: 13,
 *     xDistRoot: 60,
 *     xDist: 40,
 * // }
 */
const htreeLayout = (rootNd, options = {}) => {
    if (!rootNd) {
        return {};
    }

    options = {
        ...htreeLayoutDefaultOptions,
        ...options,
    };

    let result = {
        rects: {},
        expBtnRects: {},
        directions: {},
        ndStyles: {},
        expBtnStyles: {},
        wrapperStyle: {},
    };

    const cache = {
        allHeight: new Map(),
        subTreeHeight: new Map(),
        sameLevMaxNdWidth: new Map(),
        maxXDistFromNdToSubNd: new Map(),
    };

    const flatNdMap = new Map();
    flattenNds(rootNd, null, flatNdMap);
    loadRects(flatNdMap, result);

    // put nodes and calc canvas size
    let [w, h] = putNds({
        rootNd,
        resultWrapper: result,
        options,
        flatNdMap,
        cache,
    });
    result.wrapperStyle = {
        width: w,
        height: h,
    };

    calcHiddenNdsAndExpBtnsStyle(flatNdMap, result);
    return result;
}


const putNds = ({rootNd, resultWrapper, options, flatNdMap, cache}) => {
    const {nodePaddingTopSecondary, sameLevNdsAlign} = options;
    let [leftH, rightH] = setNdDirection({rootNd, resultWrapper, options, cache});

    // horizontal space from root node to sub node
    const xDist = calcXDist({
        nd: rootNd,
        resultWrapper,
        leftAndRightH: [leftH, rightH],
        options,
        cache
    });

    let currLeftTop = (leftH < rightH ? toInt((rightH - leftH) / 2) : 0);
    let currRightTop = (rightH < leftH ? toInt((leftH - rightH) / 2) : 0);

    // root node position
    // assume x is 500
    // y is in the middle of the higher one of left subtree and right subtree
    let rootLoc = [
        500,
        toInt((Math.max(leftH, rightH) - resultWrapper.rects[rootNd.id].height) / 2)
    ];


    resultWrapper.ndStyles[rootNd.id] = {
        left: rootLoc[0],
        top: rootLoc[1],
    }

    putExpBtn({nd: rootNd, l: rootLoc[0], t: rootLoc[1], left: false, resultWrapper});


    if (true === rootNd.expand) {
        // left tree
        const maxXDistLeft = calcMaxXDist({
            flatNdMap,
            resultWrapper,
            options,
            cache,
            lev: 1,
            left: true,
        });
        let maxNdWidth = sameLevNdsAlign ?
            calcMaxSameLevNdWidth({flatNdMap, resultWrapper, cache, lev: 1, left: true}) :
            0;

        (rootNd?.childs ?? []).filter(nd => resultWrapper.directions[nd.id]).forEach(nd => {
            let allHeight = getNdHeight({nd, resultWrapper, options, cache});

            // root node left - space - node self width
            let l = toInt(rootLoc[0] - xDist - resultWrapper.rects[nd.id].width);
            let t = toInt(currLeftTop + (allHeight - resultWrapper.rects[nd.id].height) / 2);
            resultWrapper.ndStyles[nd.id] = {left: l, top: t}
            putExpBtn({nd, l, t, left: true, resultWrapper});

            const subXDist = calcXDist({nd, resultWrapper, leftAndRightH: null, options, cache});

            let startL = rootLoc[0] - xDist - resultWrapper.rects[nd.id].width - subXDist;
            if (sameLevNdsAlign) {
                startL = toInt(rootLoc[0] - xDist - Math.max(maxNdWidth, resultWrapper.rects[nd.id].width)) - maxXDistLeft;
            }

            putSubNds({
                startT: currLeftTop,
                startL,
                parNd: nd,
                left: true,
                resultWrapper,
                options,
                cache,
                flatNdMap
            });
            currLeftTop += allHeight + toInt(nodePaddingTopSecondary);
        });

        // right tree
        const maxXDistRight = calcMaxXDist({
            flatNdMap,
            resultWrapper,
            options,
            cache,
            lev: 1,
            left: false,
        });
        maxNdWidth = sameLevNdsAlign ?
            calcMaxSameLevNdWidth({flatNdMap, resultWrapper, cache, lev: 1, left: false}) :
            0;

        (rootNd?.childs ?? []).filter(nd => !resultWrapper.directions[nd.id]).forEach(nd => {
            let allHeight = getNdHeight({nd, resultWrapper, options, cache});

            // root node left + root node width + space
            let l = toInt(rootLoc[0] + resultWrapper.rects[rootNd.id].width + xDist);
            let t = toInt(currRightTop + (allHeight - resultWrapper.rects[nd.id].height) / 2);
            resultWrapper.ndStyles[nd.id] = {left: l, top: t,}
            putExpBtn({nd, l, t, left: false, resultWrapper});

            const subXDist = calcXDist({nd, resultWrapper, leftAndRightH: null, options, cache});

            let subNdStartLeft = l + resultWrapper.rects[nd.id].width + subXDist;
            if (sameLevNdsAlign) {
                subNdStartLeft = l + Math.max(maxNdWidth, resultWrapper.rects[nd.id].width) + maxXDistRight;
            }

            putSubNds({
                startT: currRightTop,
                startL: subNdStartLeft,
                parNd: nd,
                left: false,
                resultWrapper,
                options,
                cache,
                flatNdMap
            });
            currRightTop += allHeight + toInt(nodePaddingTopSecondary);//
        });
    }

    return refineNdPos(resultWrapper);
}

const calcMaxXDist = ({flatNdMap, resultWrapper, options, cache, lev, left}) => {
    const cacheKey = `${lev}_${!!left}`;
    if (cache.maxXDistFromNdToSubNd.has(cacheKey)) {
        return cache.maxXDistFromNdToSubNd.get(cacheKey);
    }

    const maxXDist = flatNdMap.values()
        .filter(eachNd => eachNd.lev === lev && !!left === !!(resultWrapper.directions[eachNd.id]) && !flatNdMap.get(eachNd.id).hidden)
        .reduce((accu, eachNd) => {
            const eachXDist = calcXDist({
                nd: eachNd,
                resultWrapper,
                leftAndRightH: null,
                options,
                cache,
            });
            return Math.max(accu, eachXDist);
        }, 0);
    cache.maxXDistFromNdToSubNd.set(cacheKey, maxXDist);
    return maxXDist;
};

const calcMaxSameLevNdWidth = ({flatNdMap, resultWrapper, cache, lev, left}) => {
    const cacheKey = `${lev}_${!!left}`;
    if (cache.sameLevMaxNdWidth.has(cacheKey)) {
        return cache.sameLevMaxNdWidth.get(cacheKey);
    }

    const maxWidth = flatNdMap.values()
        .filter(eachNd => eachNd.lev === lev && !!left === !!(resultWrapper.directions[eachNd.id]) && !flatNdMap.get(eachNd.id).hidden)
        .reduce((accu, eachNd) => Math.max(accu, resultWrapper.rects[eachNd.id].width), 0);
    cache.sameLevMaxNdWidth.set(cacheKey, maxWidth);
    return maxWidth;
};

const putSubNds = ({startT, startL, parNd, left, resultWrapper, options, cache, flatNdMap}) => {
    if (true !== parNd.expand) {
        return;
    }

    const {nodePaddingTop, sameLevNdsAlign,} = options;

    // add some offset if all sub nodes height less than the parent node self height
    const parHeight = toInt(resultWrapper.rects[parNd.id].height);
    let childAllHeight = 0;
    parNd.childs.forEach((nd, childInd) => {
        childAllHeight += getNdHeight({nd, resultWrapper, options, cache}) + (0 < childInd ? toInt(nodePaddingTop) : 0);
    });
    if (childAllHeight < parHeight) {
        startT = toInt(startT + (parHeight - childAllHeight) / 2);
    }

    const maxXDist = calcMaxXDist({
        flatNdMap,
        resultWrapper,
        options,
        cache,
        lev: parNd.lev + 1,
        left,
    });

    const maxSameLevNdWidth = calcMaxSameLevNdWidth({
        flatNdMap,
        resultWrapper,
        cache,
        lev: parNd.lev + 1,
        left,
    });

    parNd?.childs?.forEach(nd => {
        // horizontal space from nd to its sub nodes
        const xDist = calcXDist({nd, resultWrapper, leftAndRightH: null, options, cache});

        // put sub nodes to the right
        if (!left) {
            let allHeight = getNdHeight({nd, resultWrapper, options, cache});
            let t = toInt(startT + (allHeight - resultWrapper.rects[nd.id].height) / 2);

            resultWrapper.ndStyles[nd.id] = {
                left: startL,
                top: t,
            };

            putExpBtn({nd, l: startL, t, left, resultWrapper});

            let subNdStartLeft = startL + resultWrapper.rects[nd.id].width + xDist;
            if (sameLevNdsAlign) {
                subNdStartLeft = startL + Math.max(maxSameLevNdWidth, resultWrapper.rects[nd.id].width) + maxXDist;
            }

            putSubNds({
                startT,
                startL: subNdStartLeft,
                parNd: nd,
                left,
                resultWrapper,
                options,
                cache,
                flatNdMap
            });
            startT += allHeight + toInt(nodePaddingTop);
            return;
        }

        // put sub nodes to the left
        let allHeight = getNdHeight({nd, resultWrapper, options, cache});
        let t = toInt(startT + (allHeight - resultWrapper.rects[nd.id].height) / 2);
        let l = startL - resultWrapper.rects[nd.id].width;
        resultWrapper.ndStyles[nd.id] = {
            left: l,
            top: t,
        };
        putExpBtn({nd, l, t, left, resultWrapper});

        let subNdStartLeft = startL - resultWrapper.rects[nd.id].width - xDist;
        if (sameLevNdsAlign) {
            subNdStartLeft = startL - Math.max(maxSameLevNdWidth, resultWrapper.rects[nd.id].width) - maxXDist;
        }

        putSubNds({
            startT,
            startL: subNdStartLeft,
            parNd: nd,
            left,
            resultWrapper,
            options,
            cache,
            flatNdMap
        });
        startT += allHeight + toInt(nodePaddingTop);
    });
}

/**
 * calc horizontal distance
 *
 *              /|   -> sub node          ---
 *             / |                         ^
 *            / x|   -> angle degree       |
 *           /   |                         |
 *          /    |                         |  h - vertical distance
 *         /     |                         |
 *        /      |                         |
 *       /       |                         v
 *      /________|                        ---
 *      ^        ^
 *   par node   vertical
 *
 * horizontal distance = h * tan( x * PI / 180 ), x is of unit degree
 * the return value will be the max of 'horizontal distance' and 'assigned value in options'
 *
 * @param nd
 * @param resultWrapper
 * @param leftAndRightH // [left tree height of root node, right tree height of root node] only supply when nd is root node
 * @param options
 * @param cache
 */
const calcXDist = ({nd, resultWrapper, leftAndRightH, options, cache}) => {
    const {
        xDistAngleDegree,
        xDistRoot,
        xDist
    } = options;

    // not expand or no child node
    if (true !== nd.expand || 0 === (nd?.childs ?? []).length) {
        return 0;
    }
    let hDist = 0;

    // root node to sub node:
    // calc the max height distance for first node and last node of left tree and first node and last node of right tree,
    // and then use the formula the calc the distance,
    // and get the max of the above value and config value
    if (0 === nd.lev) {
        const [leftH, rightH] = leftAndRightH;
        if (leftH > 0) {
            const leftNds = nd.childs.filter(subNd => resultWrapper.directions[subNd.id]);
            let fromY = toInt(leftH / 2);
            const allHeight = leftH ?? 0;
            let tmpHDist = getVDist({
                allHeight,
                fromY,
                subNd: leftNds[0],
                resultWrapper,
                topDown: true,
                options,
                cache
            });
            hDist = Math.max(tmpHDist, hDist);
            tmpHDist = getVDist({
                allHeight,
                fromY,
                subNd: leftNds[leftNds.length - 1],
                resultWrapper,
                topDown: false,
                options,
                cache
            });
            hDist = Math.max(tmpHDist, hDist);
        }
        if (rightH > 0) {
            const rightNds = nd.childs.filter(subNd => !resultWrapper.directions[subNd.id]);
            let fromY = toInt(rightH / 2);
            const allHeight = rightH ?? 0;
            let tmpHDist = getVDist({
                allHeight,
                fromY,
                subNd: rightNds[0],
                resultWrapper,
                topDown: true,
                options,
                cache
            });
            hDist = Math.max(tmpHDist, hDist);
            tmpHDist = getVDist({
                allHeight,
                fromY,
                subNd: rightNds[rightNds.length - 1],
                resultWrapper,
                topDown: false,
                options,
                cache
            });
            hDist = Math.max(tmpHDist, hDist);
        }

        return toInt(Math.max(
            xDistRoot,
            toInt(hDist * Math.tan(xDistAngleDegree * Math.PI / 180))
        ));
    }

    // second node (or sub node) to its sub node
    const allHeight = getSubTreeHeight({nd, resultWrapper, options, cache});

    // start position:
    // for the root node and second level node, position is the center
    // for other node, position is the bottom
    let fromY = toInt(allHeight / 2);
    if (nd.lev >= 2) {
        fromY += toInt(resultWrapper.rects[nd.id].height / 2);
    }

    // get the max vertical distance of node to the first sub node and to the last sub node
    // calc for first sub node from top to down, and down to top for the last sub node
    let tmpHDist = getVDist({
        allHeight,
        fromY,
        subNd: nd.childs[0],
        resultWrapper,
        topDown: true,
        options,
        cache
    });
    hDist = Math.max(tmpHDist, hDist);
    tmpHDist = getVDist({
        allHeight,
        fromY,
        subNd: nd.childs[nd.childs.length - 1],
        resultWrapper,
        topDown: false,
        options,
        cache
    });
    hDist = Math.max(tmpHDist, hDist);

    return toInt(Math.max(
        xDist,
        toInt(hDist * Math.tan(xDistAngleDegree * Math.PI / 180))
    ));
}

/**
 *    condition1: top to down
 *    |     |
 *    |     |     | ------> subSelfHeight: sub node self height (without subtree)
 *    |     |  -----------> subAllHeight: sub node tree height
 *    |
 *    |  -----------------> fromY: half of parent node tree height
 *    |
 *    |
 *
 *    condition2: down to top
 *    |
 *    |
 *    |
 *    |
 *    |  -----------------> fromY: half of parent node tree height
 *    |
 *    |     |
 *    |     |     | ------> subSelfHeight: sub node self height (without subtree)
 *    |     |  -----------> subAllHeight: sub node tree height
 *    ^ ------------------> allHeight: parent node tree height
 */
const getVDist = ({allHeight, fromY, subNd, resultWrapper, topDown, options, cache}) => {
    let subAllHeight = getNdHeight({nd: subNd, resultWrapper, options, cache});
    let subSelfHeight = resultWrapper.rects[subNd.id].height;
    let toY = (subAllHeight - subSelfHeight) / 2 + (1 === subNd.lev ? subSelfHeight / 2 : subSelfHeight);
    if (!topDown) {
        toY = allHeight - (subAllHeight - subSelfHeight) / 2 - subSelfHeight + (1 === subNd.lev ? subSelfHeight / 2 : subSelfHeight);
    }
    return toInt(Math.abs(toY - fromY));
}

const putExpBtn = ({nd, l, t, left = false, resultWrapper}) => {
    if (0 === (nd?.childs ?? []).length) {
        return;
    }

    // assume the exp btn position is on the right of the node
    resultWrapper.expBtnStyles[nd.id] = {
        left: toInt(l + resultWrapper.rects[nd.id].width),
        top: toInt(t + resultWrapper.rects[nd.id].height - resultWrapper.expBtnRects[nd.id].height + 4),
    };
    // if node is in the left tree, put the btn to the left
    if (left) {
        resultWrapper.expBtnStyles[nd.id].left = toInt(l - resultWrapper.expBtnRects[nd.id].width);
    }
    // do some adjustment if the node is root node or second level node
    if (0 === nd.lev || 1 === nd.lev) {
        if (true === nd.expand) {
            resultWrapper.expBtnStyles[nd.id].top = toInt(t + resultWrapper.rects[nd.id].height / 2 - resultWrapper.expBtnRects[nd.id].height + 4);
        } else {
            resultWrapper.expBtnStyles[nd.id].top = toInt(t + resultWrapper.rects[nd.id].height / 2 - (resultWrapper.expBtnRects[nd.id].height / 1.5) + 4);
        }

    }

    // base on the top handling, for the third level node contains sub node and collapsed, adjust some top value
    if (nd.lev >= 2 && true !== nd.expand) {
        resultWrapper.expBtnStyles[nd.id].top -= 5;
    }
}

/**
 * calc the direction of root node and return [left tree height, right tree height]
 */
const setNdDirection = ({rootNd, resultWrapper, options, cache}) => {
    const {
        allNdsOnRight,
        nodePaddingTop,
    } = options;

    // assume all node on the right
    let leftH = 0;
    let rightH = 0;

    // root node not expand or no child node
    if (0 === (rootNd?.childs ?? []).length || true !== rootNd.expand) {
        return [leftH, rightH];
    }

    const setDirectionsRecursively = (nd, left) => {
        resultWrapper.directions[nd.id] = left;
        (nd?.childs ?? []).forEach(subNd => setDirectionsRecursively(subNd, left));
    };

    let sumNdCnt = 0;
    (rootNd?.childs ?? []).forEach((child, ind) => {
        // true-left false-right
        setDirectionsRecursively(child, false);
        rightH += (0 < ind ? toInt(nodePaddingTop) : 0) + getNdHeight({nd: child, resultWrapper, options, cache});
        ++sumNdCnt;
    });
    let dist = rightH;

    // force all node on the right
    if (allNdsOnRight) {
        return [leftH, rightH];
    }

    // root node has only one child node
    if (1 === (rootNd?.childs ?? []).length) {
        return [leftH, rightH];
    }

    // from the last node, try to move the node to the left and calc the distance of left tree and right tree,
    // if the distance less than the distance before move, then confirm to move
    // and so on util found the min distance of left tree and right tree
    let end = false;
    let leftNdCnt = 0;
    [...(rootNd?.childs ?? [])].reverse().forEach(child => {
        if (end) {
            return;
        }
        let h = getNdHeight({nd: child, resultWrapper, options, cache});
        let newLeftH = leftH + (0 < leftH ? toInt(nodePaddingTop) : 0) + h;//
        let newRightH = rightH - h - (1 < sumNdCnt - leftNdCnt ? toInt(nodePaddingTop) : 0);
        let newDist = Math.abs(newRightH - newLeftH);

        if (newDist < dist) {
            // true: left;
            setDirectionsRecursively(child, true);
            leftH = newLeftH;
            rightH = newRightH;
            dist = newDist;
            ++leftNdCnt;
            return;
        }
        end = true;
    });
    return [leftH, rightH];
}


const getSubTreeHeight = ({nd, resultWrapper, options, cache}) => {
    return getNdHeight({
        nd,
        resultWrapper,
        options,
        cache,
        onlySubTreeHeight: true
    });
}

const getNdHeight = ({nd, resultWrapper, options, cache, onlySubTreeHeight = false}) => {
    if (onlySubTreeHeight && cache.subTreeHeight.has(nd.id)) {
        return cache.subTreeHeight.get(nd.id);
    }
    if (!onlySubTreeHeight && cache.allHeight.has(nd.id)) {
        return cache.allHeight.get(nd.id);
    }

    const {nodePaddingTop,} = options;

    // no sub node or not expand, subtree height is 0, all height is the height or node self
    if (0 === (nd?.childs ?? []).length || true !== nd.expand) {
        cache.subTreeHeight.set(nd.id, 0);
        cache.allHeight.set(nd.id, toInt(resultWrapper.rects[nd.id].height));
    }
    // has sub node and expand
    // subtree height contains deep subnode tree
    // all height is the max of self height and subtree height
    else {
        let sumChildrenH = 0;
        nd.childs.forEach((child, ind) => {
            // from the second one, add some space
            sumChildrenH += (0 < ind ? toInt(nodePaddingTop) : 0);
            sumChildrenH += getNdHeight({
                nd: child,
                resultWrapper,
                options,
                cache,
                onlySubTreeHeight: false,
            });
        });
        cache.subTreeHeight.set(nd.id, sumChildrenH);
        cache.allHeight.set(nd.id, toInt(`${Math.max(resultWrapper.rects[nd.id].height, sumChildrenH)}`));
    }

    return onlySubTreeHeight ? cache.subTreeHeight.get(nd.id) : cache.allHeight.get(nd.id);
}


export {
    htreeLayout
};