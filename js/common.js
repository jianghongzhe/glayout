import {containerMinH, containerMinW, graphPadding} from "./const.js";
import {getEle} from "./util.js";

const refineNdTree=(rootNd)=>{
    const innerRefineNdTree=(nd, parNd, currLev)=>{
        return {
            ...nd,
            lev: currLev,
            childs: (nd.childs ?? []).map(subNd => innerRefineNdTree(subNd, nd, currLev + 1)),
            isRoot: null === parNd,
            isLeaf: 0 === (nd.childs ?? []),
        };
    };
    return innerRefineNdTree(rootNd, null, 0);
};

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

const loadRects = (flatNdMap, result) => {
    flatNdMap.forEach((nd, id) => {
        result.rects[id] = getEle(nd.selectorOrEle ? nd.selectorOrEle : `#${nd.id}`).getBoundingClientRect();
        if (0 < (nd?.childs ?? []).length) {
            result.expBtnRects[id] = getEle(nd.expBtnSelectorOrEle ? nd.expBtnSelectorOrEle : `#${nd.expBtnId}`).getBoundingClientRect();
        }
    });
};

/**
 * calc hidden nodes and their exp btn location : use the location of the nearest non-hidden ancestry util the root node
 * @param flatNdMap
 * @param result
 */
const calcHiddenNdsAndExpBtnsStyle = (flatNdMap, result) => {
    flatNdMap.forEach((nd, ndId) => {
        if (!nd.hidden) {
            return;
        }

        let visibleAncestry = nd.par;
        while (visibleAncestry.hidden) {
            visibleAncestry = visibleAncestry.par;
        }

        result.ndStyles[ndId] = {
            left: result.ndStyles[visibleAncestry.id].left + (result.rects[visibleAncestry.id].width - result.rects[ndId].width) / 2,
            top: result.ndStyles[visibleAncestry.id].top + (result.rects[visibleAncestry.id].height - result.rects[ndId].height) / 2,
            hidden: true,
        };

        if (0 < (nd?.childs ?? []).length) {
            result.expBtnStyles[ndId] = {
                ...result.ndStyles[ndId],
            };
        }
    });
};

const refineNdPos = (resultWrapper) => {
    // calc min and max position
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

    // container size, contains padding
    let requireW = (maxX - minX) + graphPadding * 2;
    let requireH = (maxY - minY) + graphPadding * 2;

    let xAdjust = graphPadding - minX;
    let yAdjust = graphPadding - minY;
    let moreXAdjust = 0;

    // container width or height less than min width or min height, use min width or min height,
    // and keep horizontal center
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
};

const setExtraRecursively = (rootNd, options, resultWrapper) => {
    const {defLineColor,} = options;

    const innerSetExtraRecursively = (nd, parNd, options, resultWrapper) => {
        resultWrapper.extra[nd.id] = {
            lineColor: nd.lineColor || (parNd ? resultWrapper.extra[parNd.id].lineColor : defLineColor),
            parId: parNd ? parNd.id : null,
            childIds: (nd.childs ?? []).map(subNd => subNd.id),
            isRoot: nd.isRoot,
            isLeaf: nd.isLeaf,
            lev: nd.lev,
        };

        (nd.childs ?? []).forEach(subNd => innerSetExtraRecursively(subNd, nd, options, resultWrapper));
    };
    innerSetExtraRecursively(rootNd, null,  options, resultWrapper);
};


export {
    flattenNds,
    loadRects,
    calcHiddenNdsAndExpBtnsStyle,
    refineNdPos,
    setExtraRecursively,
    refineNdTree,
}