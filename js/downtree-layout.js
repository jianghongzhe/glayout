import {calcHiddenNdsAndExpBtnsStyle, flattenNds, loadRects, refineNdPos} from "./common.js";
import {toInt} from "./util.js";
import {upDownTreeLayoutDefaultOptions} from "./const.js";
import {calcMaxSameLevNdHeight, getNdWidth, getXDistToSiblingNd, getYDistToSubNd} from "./common-updowntree.js";

const downtreeLayout = (rootNd, options = {}) => {
    if (!rootNd) {
        return {};
    }

    options = {
        ...upDownTreeLayoutDefaultOptions,
        ...options,
    };

    let result = {
        rects: {},
        expBtnRects: {},
        ndStyles: {},
        expBtnStyles: {},
        wrapperStyle: {},
    };

    const cache = {
        allWidth: new Map(),
        subTreeWidth: new Map(),
        sameLevMaxNdHeight: new Map(),
    };

    const flatNdMap = new Map();
    flattenNds(rootNd, null, flatNdMap);
    loadRects(flatNdMap, result);

    // put nodes and calc canvas size
    let [w, h] = putNds({nd: rootNd, resultWrapper: result, options, cache, flatNdMap});
    result.wrapperStyle = {
        width: w,
        height: h,
    };

    putExpBtnRecursively({nd: rootNd, resultWrapper: result});
    calcHiddenNdsAndExpBtnsStyle(flatNdMap, result);
    return result;
};

const putNds = ({nd, resultWrapper, options, cache, flatNdMap}) => {
    putNdsRecursively({
        nd,
        resultWrapper,
        beginLeft: 0,
        beginTop: 0,
        options,
        cache,
        flatNdMap
    });
    return refineNdPos(resultWrapper);
}

const putNdsRecursively = ({nd, resultWrapper, beginLeft, beginTop, options, cache, flatNdMap}) => {

    const {sameLevNdsAlign} = options;

    const selfW = toInt(resultWrapper.rects[nd.id].width);
    const sumW = getNdWidth({nd, resultWrapper, options, cache});

    resultWrapper.ndStyles[nd.id] = {
        left: toInt(beginLeft + (sumW - selfW) / 2),
        top: beginTop,
    };

    const hasChildsAndExpand = (0 < (nd?.childs ?? []).length && true === nd.expand);
    if (!hasChildsAndExpand) {
        return;
    }

    // sub node top:
    // if not sameLevNdsAlign: curr node top + curr node height + margin
    // if sameLevNdsAlign:     curr node top + max height among sibling nodes of curr node + margin
    let maxNdHeight = resultWrapper.rects[nd.id].height;
    if (sameLevNdsAlign && 0 < nd.lev) {
        maxNdHeight = calcMaxSameLevNdHeight({flatNdMap, resultWrapper, cache, lev: nd.lev});
    }
    const subBeginTop = beginTop + maxNdHeight + getYDistToSubNd({nd, options});


    let accuBeginLeft = beginLeft;

    // add some offset if all sub nodes width less than the parent node self width
    let childSumW = 0;
    for (let i = 0; i < nd.childs.length; ++i) {
        childSumW += getNdWidth({nd: nd.childs[i], resultWrapper, options, cache});
        if (0 < i) {
            childSumW += getXDistToSiblingNd({nd:nd.childs[i], options});
        }
    }
    if (childSumW < selfW) {
        accuBeginLeft += toInt((selfW - childSumW) / 2);
    }

    for (const subNd of nd.childs) {
        putNdsRecursively({
            nd: subNd,
            resultWrapper,
            beginLeft: accuBeginLeft,
            beginTop: subBeginTop,
            options,
            cache,
            flatNdMap
        });
        accuBeginLeft += getNdWidth({
            nd: subNd,
            resultWrapper,
            options,
            cache
        });
        accuBeginLeft += getXDistToSiblingNd({nd:subNd, options});
    }
}

const putExpBtnRecursively = ({nd, resultWrapper}) => {
    if (0 === (nd?.childs ?? []).length) {
        return;
    }

    const expanded = (true === nd.expand);
    let baseLeft = toInt(resultWrapper.ndStyles[nd.id].left + resultWrapper.rects[nd.id].width / 2);
    let baseTop = toInt(resultWrapper.ndStyles[nd.id].top + resultWrapper.rects[nd.id].height);

    // adjust some offset, different with expanded and collapsed status
    if (expanded) {
        baseLeft -= 2;
        baseTop -= 2;
    } else {
        baseLeft -= 12;
        baseTop += 3;
    }

    resultWrapper.expBtnStyles[nd.id] = {
        left: toInt(baseLeft),
        top: toInt(baseTop),
    };

    // calc sub node exp btn position recursively
    if (expanded) {
        nd.childs.forEach(subNd => putExpBtnRecursively({nd: subNd, resultWrapper}));
    }
};


export {downtreeLayout};