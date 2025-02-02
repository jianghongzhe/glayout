import {getEle, toInt} from './util.js';


const defaultOptions = {
    allNdsOnRight: false,
    nodePaddingTopSecondary: 20,
    nodePaddingTop: 10,
    xDistAngleDegree: 13,
    xDistRoot: 60,
    xDist: 40,
};

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
 * //{
 *     nodePaddingTopSecondary: 20,
 *     nodePaddingTop: 10,
 *     xDistAngleDegree: 13,
 *     xDistRoot: 60,
 *     xDist: 40,
 * //}
 */
const htreeLayout = (rootNd, options = {}) => {
    if (!rootNd) {
        return {};
    }

    options = {
        ...defaultOptions,
        ...options,
    };

    let result = {
        rects: {},
        expBtnRects: {},
        directions: {},
        ndStyles: {},
        expBtnStyles: {},
        wrapperStyle: {},
        lineStyles: {},
    };

    const flatNdMap = new Map();
    flattenNds(rootNd, null, flatNdMap);

    // load nd rects and exp btn rects
    flatNdMap.forEach((nd, id) => {
        result.rects[id] = getEle(nd.selectorOrEle).getBoundingClientRect();
        if (0 < (nd?.childs ?? []).length) {
            result.expBtnRects[id] = getEle(nd.expBtnSelectorOrEle).getBoundingClientRect();
        }
    });

    // put nodes and calc canvas size
    let [w, h] = putNds(rootNd, result, options, flatNdMap);
    result.wrapperStyle = {
        width: w,
        height: h,
    };

    // calc hidden nodes and their exp btn location : use the location of the nearest non-hidden ancestry util the root node
    flatNdMap.forEach((nd, ndId) => {
        if (!nd.hidden) {
            return;
        }

        let visibleAncestry = nd.par;
        while (visibleAncestry.hidden) {
            visibleAncestry = visibleAncestry.par;
        }

        result.ndStyles[ndId] = {
            left: result.ndStyles[visibleAncestry.id].left,
            top: result.ndStyles[visibleAncestry.id].top + (result.rects[visibleAncestry.id].height - result.rects[ndId].height) / 2,
            hidden: true,
        };

        if (0 < (nd?.childs ?? []).length) {
            result.expBtnStyles[ndId] = {
                ...result.ndStyles[ndId],
            };
        }
    });


    return result;
}

const flattenNds = (nd, parNd, result) => {
    const isHidden = () => {
        if (null === parNd) {
            return false;
        }

        let hiddenAncestry = result.get(parNd.id);
        while (null !== hiddenAncestry && true === hiddenAncestry.expand) {
            hiddenAncestry = hiddenAncestry.par;
        }

        return null !== hiddenAncestry && true !== hiddenAncestry.expand;
    };

    result.set(nd.id, {
        ...nd,
        par: null === parNd ? null : result.get(parNd.id),
        isRoot: null === parNd,
        isSecondary: 1 === nd.lev,
        hidden: isHidden(),
    });
    (nd?.childs ?? []).forEach(subNd => flattenNds(subNd, nd, result));
};


const putNds = (rootNd, resultWrapper, options, flattenNds) => {
    const {nodePaddingTopSecondary} = options;
    let [leftH, rightH] = setNdDirection(rootNd, resultWrapper, options);

    // 计算根节点与其子节点间的水平距离
    const xDist = calcXDist(rootNd, resultWrapper, [leftH, rightH], options, flattenNds);

    let currLeftTop = (leftH < rightH ? toInt((rightH - leftH) / 2) : 0);
    let currRightTop = (rightH < leftH ? toInt((leftH - rightH) / 2) : 0);


    //根节点位置：x假设为500，y为在左右两边子树中高的一侧居中的位置
    let rootLoc = [500, toInt((Math.max(leftH, rightH) - resultWrapper.rects[rootNd.id].height) / 2)];


    resultWrapper.ndStyles[rootNd.id] = {
        left: rootLoc[0],
        top: rootLoc[1],
    }

    putExpBtn(rootNd, rootLoc[0], rootLoc[1], false, resultWrapper);


    if (true === rootNd.expand) {
        //左
        (rootNd?.childs ?? []).filter(nd => resultWrapper.directions[nd.id]).forEach(nd => {
            // 设置根节点的子节点的位置，并递归设置再下层节点的位置
            let allHeight = getNdHeight(nd, resultWrapper, options);
            let l = toInt(rootLoc[0] - xDist - resultWrapper.rects[nd.id].width);//根节点x - 空隙 - 节点本身宽度
            let t = toInt(currLeftTop + (allHeight - resultWrapper.rects[nd.id].height) / 2);
            resultWrapper.ndStyles[nd.id] = {left: l, top: t}
            putExpBtn(nd, l, t, true, resultWrapper);

            const subXDist = calcXDist(nd, resultWrapper, null, options);
            putSubNds(currLeftTop, l - subXDist, nd, true, resultWrapper, options);
            currLeftTop += allHeight + toInt(nodePaddingTopSecondary);
        });

        //右
        (rootNd?.childs ?? []).filter(nd => !resultWrapper.directions[nd.id]).forEach(nd => {
            // 设置根节点的子节点的位置，并递归设置再下层节点的位置
            let allHeight = getNdHeight(nd, resultWrapper, options);
            let l = toInt(rootLoc[0] + resultWrapper.rects[rootNd.id].width + xDist);//根节点x + 根节点宽 + 空隙
            let t = toInt(currRightTop + (allHeight - resultWrapper.rects[nd.id].height) / 2);
            resultWrapper.ndStyles[nd.id] = {left: l, top: t,}
            putExpBtn(nd, l, t, false, resultWrapper);

            const subXDist = calcXDist(nd, resultWrapper, null, options);
            putSubNds(currRightTop, l + resultWrapper.rects[nd.id].width + subXDist, nd, false, resultWrapper, options);
            currRightTop += allHeight + toInt(nodePaddingTopSecondary);//
        });
    }

    return refineNdPos(resultWrapper);
}


const refineNdPos = (resultWrapper) => {
    //计算最小位置与最大位置
    let minX = 9999999;
    let minY = 9999999;
    let maxX = 0;
    let maxY = 0;

    for (let key in resultWrapper.ndStyles) {
        let l = resultWrapper.ndStyles[key].left;
        let t = resultWrapper.ndStyles[key].top;
        let r = l + resultWrapper.rects[key].width;
        let b = t + resultWrapper.rects[key].height;

        if (l < minX) {
            minX = l;
        }
        if (t < minY) {
            minY = t;
        }
        if (r > maxX) {
            maxX = r;
        }
        if (b > maxY) {
            maxY = b;
        }
    }

    //图表容器的大小，里面包括空白
    let requireW = (maxX - minX) + graphPadding * 2;
    let requireH = (maxY - minY) + graphPadding * 2;

    let xAdjust = graphPadding - minX;
    let yAdjust = graphPadding - minY;
    let moreXAdjust = 0;

    //如果容器大小还不到整个区域的大小-10,则增加到该值，同时x坐标也增加以保证在容器里居中
    if (requireW < containerMinW) {
        moreXAdjust = (containerMinW - requireW) / 2;
        requireW = containerMinW;
    }
    if (requireH < containerMinH) {
        requireH = containerMinH;
    }

    for (let key in resultWrapper.ndStyles) {
        resultWrapper.ndStyles[key].left += xAdjust + moreXAdjust;
        resultWrapper.ndStyles[key].top += yAdjust;
    }
    for (let key in resultWrapper.expBtnStyles) {
        resultWrapper.expBtnStyles[key].left += xAdjust + moreXAdjust;
        resultWrapper.expBtnStyles[key].top += yAdjust;
    }

    return [requireW, requireH];
}


const putSubNds = (startT, startL, parNd, left = false, resultWrapper = null, options) => {
    if (true !== parNd.expand) {
        return;
    }

    const {nodePaddingTop} = options;

    // 子节点y坐标起始位置校正
    // 如果子节点高度之和小于父节点本身高度，则起始位置增加两者差值的一半
    const parHeight = toInt(resultWrapper.rects[parNd.id].height);
    let childAllHeight = 0;
    parNd.childs.forEach((nd, childInd) => {
        childAllHeight += getNdHeight(nd, resultWrapper, options) + (0 < childInd ? toInt(nodePaddingTop) : 0);
    });
    if (childAllHeight < parHeight) {
        startT = toInt(startT + (parHeight - childAllHeight) / 2);
    }


    parNd?.childs?.forEach(nd => {
        // 子节点与下级节点间的水平距离
        const xDist = calcXDist(nd, resultWrapper, null, options);

        //往右排
        if (!left) {
            let allHeight = getNdHeight(nd, resultWrapper, options);
            let t = toInt(startT + (allHeight - resultWrapper.rects[nd.id].height) / 2);

            resultWrapper.ndStyles[nd.id] = {
                left: startL,
                top: t,
            };

            putExpBtn(nd, startL, t, left, resultWrapper);
            putSubNds(startT, startL + resultWrapper.rects[nd.id].width + xDist, nd, left, resultWrapper, options);//右边节点的位置是当前节点
            startT += allHeight + toInt(nodePaddingTop);
            return;
        }

        //往左排
        let allHeight = getNdHeight(nd, resultWrapper, options);
        let t = toInt(startT + (allHeight - resultWrapper.rects[nd.id].height) / 2);
        let l = startL - resultWrapper.rects[nd.id].width;
        resultWrapper.ndStyles[nd.id] = {
            left: l,
            top: t,
        };
        putExpBtn(nd, l, t, left, resultWrapper);
        putSubNds(startT, l - xDist, nd, left, resultWrapper, options);
        startT += allHeight + toInt(nodePaddingTop);
        return;
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
 */
const calcXDist = (nd, resultWrapper, leftAndRightH, options) => {
    const {
        xDistAngleDegree,
        xDistRoot,
        xDist
    } = options;

    // 节点未展开或没有子节点，返回0
    if (true !== nd.expand || 0 === (nd?.childs ?? []).length) {
        return 0;
    }
    let hDist = 0;

    // 如果是根节点到子节点，则分别计算左子树的第一个节点与最后一个节点和右子树的第一个节点与最后一个节点中最大的高度差；
    // 然后根据公式计算得到水平距离并与指定最小值取较大者
    if (0 === nd.lev) {
        const [leftH, rightH] = leftAndRightH;
        if (leftH > 0) {
            const leftNds = nd.childs.filter(subNd => resultWrapper.directions[subNd.id]);
            let fromY = toInt(leftH / 2);
            let tmpHDist = getVDist(leftH, fromY, leftNds[0], resultWrapper, true, options);
            hDist = Math.max(tmpHDist, hDist);
            tmpHDist = getVDist(leftH, fromY, leftNds[leftNds.length - 1], resultWrapper, false, options);
            hDist = Math.max(tmpHDist, hDist);
        }
        if (rightH > 0) {
            const rightNds = nd.childs.filter(subNd => !resultWrapper.directions[subNd.id]);
            let fromY = toInt(rightH / 2);
            let tmpHDist = getVDist(rightH, fromY, rightNds[0], resultWrapper, true, options);
            hDist = Math.max(tmpHDist, hDist);
            tmpHDist = getVDist(rightH, fromY, rightNds[rightNds.length - 1], resultWrapper, false, options);
            hDist = Math.max(tmpHDist, hDist);
        }

        const calcXDist = toInt(hDist * Math.tan(xDistAngleDegree * Math.PI / 180));
        return toInt(Math.max(xDistRoot, calcXDist));
    }


    // 二级或以下节点到子节点的情况
    const allHeight = getSubTreeHeight(nd, resultWrapper, options);

    // 起始纵坐标位置：
    // 如果为根节点或二级节点到其子节点的连接线，起始位置为节点中间；否则，起始位置为节点底部
    let fromY = toInt(allHeight / 2);
    if (nd.lev >= 2) {
        fromY += toInt(resultWrapper.rects[nd.id].height / 2);
    }

    // 以第一个子节点和最后一个子节点为代表计算与起始位置的高度差，取较大者
    // 第一个子节点，位置从头算
    // 最后一个子节点，位置从末尾高度减去空白开始算
    let tmpHDist = getVDist(allHeight, fromY, nd.childs[0], resultWrapper, true, options);
    hDist = Math.max(tmpHDist, hDist);
    tmpHDist = getVDist(allHeight, fromY, nd.childs[nd.childs.length - 1], resultWrapper, false, options);
    hDist = Math.max(tmpHDist, hDist);

    // 取按夹角计算的水平距离与指定最小距离中的较大者
    const calcXDist = toInt(hDist * Math.tan(xDistAngleDegree * Math.PI / 180));
    return toInt(Math.max(xDist, calcXDist));
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
const getVDist = (allHeight, fromY, subNd, resultWrapper, topDown = true, options) => {
    let subAllHeight = getNdHeight(subNd, resultWrapper, options);
    let subSelfHeight = resultWrapper.rects[subNd.id].height;
    let toY = (subAllHeight - subSelfHeight) / 2 + (1 === subNd.lev ? subSelfHeight / 2 : subSelfHeight);
    if (!topDown) {
        toY = allHeight - (subAllHeight - subSelfHeight) / 2 - subSelfHeight + (1 === subNd.lev ? subSelfHeight / 2 : subSelfHeight);
    }
    let tmpHDist = toInt(Math.abs(toY - fromY));
    return tmpHDist;
}

const putExpBtn = (nd, l, t, left = false, resultWrapper = null) => {
    if (0 === (nd?.childs ?? []).length) {
        return;
    }

    resultWrapper.expBtnStyles[nd.id] = {
        left: toInt(l + resultWrapper.rects[nd.id].width), //先假设横向位置在节点右侧
        top: toInt(t + resultWrapper.rects[nd.id].height - resultWrapper.expBtnRects[nd.id].height + 4),
    };
    //如果横向位置在左，侧重新设置
    if (left) {
        resultWrapper.expBtnStyles[nd.id].left = toInt(l - resultWrapper.expBtnRects[nd.id].width);
    }
    //如果是根节点和二级节点，则纵向位置不同，且在展开/折叠状态时纵向位置也不同
    if (0 === nd.lev || 1 === nd.lev) {
        if (true === nd.expand) {
            resultWrapper.expBtnStyles[nd.id].top = toInt(t + resultWrapper.rects[nd.id].height / 2 - resultWrapper.expBtnRects[nd.id].height + 4);
        } else {
            resultWrapper.expBtnStyles[nd.id].top = toInt(t + resultWrapper.rects[nd.id].height / 2 - (resultWrapper.expBtnRects[nd.id].height / 1.5) + 4);
        }

    }

    // 在之前基础上，对于三级以上（>=2）节点，且是折叠的时候，高度减去5
    if (nd.lev >= 2 && true !== nd.expand) {
        resultWrapper.expBtnStyles[nd.id].top -= 5;
    }
}

/**
 * 对根节点的子树进行左右方向的计算，并返回左右子树的高度
 */
const setNdDirection = (rootNd, resultWrapper, options) => {
    const {
        allNdsOnRight,
        nodePaddingTop,
    } = options;

    //先假设所有节点都在右边
    let leftH = 0;
    let rightH = 0;

    //如果根节点未展开，则不再继续计算
    if (0 === (rootNd?.childs ?? []).length || true !== rootNd.expand) {
        return [leftH, rightH];
    }

    let sumNdCnt = 0;
    (rootNd?.childs ?? []).forEach((child, ind) => {
        // true-left false-right
        resultWrapper.directions[child.id] = false;
        rightH += (0 < ind ? toInt(nodePaddingTop) : 0) + getNdHeight(child, resultWrapper, {nodePaddingTop,});
        ++sumNdCnt;
    });
    let dist = rightH;

    //如果设置了强制所有节点都在右侧，则直接返回
    if (allNdsOnRight) {
        return [leftH, rightH];
    }

    // 如果根节点只有一个子节点，则直接返回
    if (1 === (rootNd?.childs ?? []).length) {
        return [leftH, rightH];
    }

    // 从最后一个节点开始，依次计算如果把节点放到左侧，是否两边高度差比之前小，如果是就移动，否则结束
    let end = false;
    let leftNdCnt = 0;
    [...(rootNd?.childs ?? [])].reverse().forEach(child => {
        if (end) {
            return;
        }
        let h = getNdHeight(child, resultWrapper, options);
        let newLeftH = leftH + (0 < leftH ? toInt(nodePaddingTop) : 0) + h;//
        let newRightH = rightH - h - (1 < sumNdCnt - leftNdCnt ? toInt(nodePaddingTop) : 0);
        let newDist = Math.abs(newRightH - newLeftH);

        if (newDist < dist) {
            //child.left = true;
            resultWrapper.directions[child.id] = true;
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


const getSubTreeHeight = (nd, resultWrapper, options) => {
    if (0 === (nd?.childs ?? []).length || true !== nd.expand) {
        return 0;
    }
    const {nodePaddingTop} = options;
    let sumChildrenH = 0;
    nd.childs.forEach((child, ind) => {
        sumChildrenH += (0 < ind ? toInt(nodePaddingTop) : 0) + getNdHeight(child, resultWrapper, options);//从第二个子节点开始，要加上空白的距离
    });
    return sumChildrenH;
}

const getNdHeight = (nd, resultWrapper, {nodePaddingTop,}) => {
    //无子节点或未展开，取本节点的高度
    if (0 === (nd?.childs ?? []).length || true !== nd.expand) {
        return toInt(resultWrapper.rects[nd.id].height);
    }

    //有子节点，取所有子节点的高度和，中间加上空白的距离
    let sumChildrenH = 0;
    nd.childs.forEach((child, ind) => {
        sumChildrenH += (0 < ind ? toInt(nodePaddingTop) : 0) + getNdHeight(child, resultWrapper, {nodePaddingTop,});//从第二个子节点开始，要加上空白的距离
    });
    return toInt(`${Math.max(resultWrapper.rects[nd.id].height, sumChildrenH)}`);
}


/**
 * calc self height and subtree height and sum height
 * @param nd
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
 * @return
 * // {
 *      ndHeight: 10,
 *      subtreeHeight: 20,
 *      sumHeight: 20,
 * // }
 */

const containerMinW = 800;    //导图容器最小宽
const containerMinH = 600;    //导图容器最小高
const graphPadding = 40;    //图表内容与容器边缘之间的距离


export {
    htreeLayout
};