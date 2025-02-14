import {toInt} from "./util.js";

const calcMaxSameLevNdHeight = ({flatNdMap, resultWrapper, cache, lev}) => {
    const cacheKey = `${lev}`;
    if (cache.sameLevMaxNdHeight.has(cacheKey)) {
        return cache.sameLevMaxNdHeight.get(cacheKey);
    }

    const maxHeight = flatNdMap.values()
        .filter(eachNd => eachNd.lev === lev && !flatNdMap.get(eachNd.id).hidden)
        .reduce((accu, eachNd) => Math.max(accu, resultWrapper.rects[eachNd.id].height), 0);
    cache.sameLevMaxNdHeight.set(cacheKey, maxHeight);
    return maxHeight;
};

const getNdWidth = ({nd, resultWrapper, options, cache}) => {
    if (cache.allWidth.has(nd.id)) {
        return cache.allWidth.get(nd.id);
    }

    // no sub nodes or not expand, use the node self width
    if (0 === (nd?.childs ?? []).length || true !== nd.expand) {
        return toInt(resultWrapper.rects[nd.id].width);
    }

    // all sub nodes width (contains subtree) and margin
    let sumChildrenH = 0;
    nd.childs.forEach((child, ind) => {
        if (0 < ind) {
            sumChildrenH += getXDistToSiblingNd({nd:child, options});
        }
        sumChildrenH += getNdWidth({nd: child, resultWrapper, options, cache});
    });

    cache.allWidth.set(nd.id, toInt(Math.max(resultWrapper.rects[nd.id].width, sumChildrenH)));
    return cache.allWidth.get(nd.id);
}

const getYDistToSubNd = ({nd, options}) => {
    const {yDistRoot, yDist} = options;
    return toInt(0 === nd.lev ? yDistRoot : yDist);
};

const getXDistToSiblingNd = ({nd, options}) => {
    const {nodePaddingLeftSecondary, nodePaddingLeft} = options;
    return toInt(1 === nd.lev ? nodePaddingLeftSecondary : nodePaddingLeft);
};

export {
    calcMaxSameLevNdHeight,
    getNdWidth,
    getYDistToSubNd,
    getXDistToSiblingNd,
};