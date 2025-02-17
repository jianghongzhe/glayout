import {
    calcHiddenNdsAndExpBtnsStyle,
    flattenNds,
    loadRects,
    refineNdPos,
    refineNdTree,
    setExtraRecursively
} from "./common.js";
import {toInt} from "./util.js";
import {upDownTreeLayoutDefaultOptions} from "./const.js";
import {calcMaxSameLevNdHeight, getNdWidth, getXDistToSiblingNd, getYDistToSubNd} from "./common-updowntree.js";


const uptreeLayout = (rootNd, options = {}) => {
    if (!rootNd) {
        return {};
    }

    rootNd=refineNdTree(rootNd);

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
        extra: {},
    };

    const cache = {
        allWidth: new Map(),
        subTreeWidth: new Map(),
        sameLevMaxNdHeight: new Map(),
    };

    setExtraRecursively(rootNd, options, result);

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
    putNdsRecursively({nd, resultWrapper, beginLeft: 0, beginBottom: 0, options, cache, flatNdMap});
    return refineNdPos(resultWrapper);
}

const putNdsRecursively = ({nd, resultWrapper, beginLeft, beginBottom, options, cache, flatNdMap}) => {

    const {sameLevNdsAlign} = options;

    const selfW = toInt(resultWrapper.rects[nd.id].width);
    const sumW = getNdWidth({nd, resultWrapper, options, cache});
    resultWrapper.ndStyles[nd.id] = {
        left: toInt(beginLeft + (sumW - selfW) / 2),
        top: beginBottom - resultWrapper.rects[nd.id].height,
    };

    const hasChildsAndExpand = (0 < (nd?.childs ?? []).length && true === nd.expand);
    if (!hasChildsAndExpand) {
        return;
    }

    // sub node bottom:
    // if not sameLevNdsAlign: curr node bottom - curr node height - margin
    // if sameLevNdsAlign:     curr node bottom - max height among sibling nodes of curr node - margin
    let maxNdHeight = resultWrapper.rects[nd.id].height;
    if (sameLevNdsAlign && 0 < nd.lev) {
        maxNdHeight = calcMaxSameLevNdHeight({flatNdMap, resultWrapper, cache, lev: nd.lev});
    }
    const subBeginBottom = beginBottom - maxNdHeight - getYDistToSubNd({nd, options});

    let accuBeginLeft = beginLeft;

    // add some offset if all sub nodes width less than the parent node self width
    let childSumW = 0;
    let maxSubH = 0;
    for (let i = 0; i < nd.childs.length; ++i) {
        childSumW += getNdWidth({nd: nd.childs[i], resultWrapper, options, cache});
        if (i > 0) {
            childSumW +=getXDistToSiblingNd({nd:nd.childs[i], options});
        }
        maxSubH = Math.max(maxSubH, resultWrapper.rects[nd.childs[i].id].height);
    }
    if (childSumW < selfW) {
        accuBeginLeft += toInt((selfW - childSumW) / 2);
    }


    for (const element of nd.childs) {
        putNdsRecursively({
            nd: element,
            resultWrapper,
            beginLeft: accuBeginLeft,
            beginBottom: subBeginBottom,
            options,
            cache,
            flatNdMap
        });
        accuBeginLeft += getNdWidth({
            nd: element,
            resultWrapper,
            options,
            cache
        });
        accuBeginLeft += getXDistToSiblingNd({nd:element, options});
    }
}


const putExpBtnRecursively = ({nd, resultWrapper}) => {
    if (!nd.childs || 0 === nd.childs.length) {
        return;
    }

    const expended = (true === nd.expand);
    let baseLeft = toInt(resultWrapper.ndStyles[nd.id].left + resultWrapper.rects[nd.id].width / 2);
    let baseTop = toInt(resultWrapper.ndStyles[nd.id].top);

    // adjust some offset, different with expanded and collapsed status
    if (expended) {
        baseLeft -= 2;
        baseTop -= 21;
    } else {
        baseLeft -= 12;
        baseTop -= 19;
    }

    resultWrapper.expBtnStyles[nd.id] = {
        left: toInt(baseLeft),
        top: toInt(baseTop),
    };

    // calc sub node exp btn position recursively
    if (expended) {
        nd.childs.forEach(subNd => putExpBtnRecursively({nd: subNd, resultWrapper}));
    }
};


export {uptreeLayout};