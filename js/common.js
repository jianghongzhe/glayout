import {containerMinH, containerMinW, graphPadding} from "./const.js";
import {getEle} from "./util.js";

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

export {
    flattenNds,
    loadRects,
    calcHiddenNdsAndExpBtnsStyle,
    refineNdPos,
}