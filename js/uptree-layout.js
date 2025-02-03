import {calcHiddenNdsAndExpBtnsStyle, flattenNds, loadRects, refineNdPos} from "./common.js";
import {toInt} from "./util.js";

const defaultOptions = {
    nodePaddingLeftSecondary: 20,
    nodePaddingLeft: 10,
    yDistRoot: 60,
    yDist: 40,
};


const uptreeLayout = (rootNd, options = {}) => {
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
        ndStyles: {},
        expBtnStyles: {},
        wrapperStyle: {},
    };

    const flatNdMap = new Map();
    flattenNds(rootNd, null, flatNdMap);
    loadRects(flatNdMap, result);

    // put nodes and calc canvas size
    let [w, h] = putNds(rootNd, result, options);
    result.wrapperStyle = {
        width: w,
        height: h,
    };

    putExpBtnRecursively(rootNd, result);
    calcHiddenNdsAndExpBtnsStyle(flatNdMap, result);
    return result;
};

const putNds = (rootNd, resultWrapper, options) => {
    putNdsRecursively(rootNd, resultWrapper, 0, 0, options);
    return refineNdPos(resultWrapper);
}

const putNdsRecursively = (nd, resultWrapper, beginLeft = 0, beginTop = 0, options) => {

    const {yDistRoot, yDist, nodePaddingLeftSecondary, nodePaddingLeft} = options;

    const selfW = toInt(resultWrapper.rects[nd.id].width);
    const sumW = getNdWidth(nd, resultWrapper, options);
    resultWrapper.ndStyles[nd.id] = {
        left: toInt(beginLeft + (sumW - selfW) / 2),
        top: beginTop,
    };


    // 子节点的样式，高度的起始位置为父节点的下面加上空白的距离
    const subBeginTop = beginTop - toInt(0 === nd.lev ? yDistRoot : yDist);


    if (0 < (nd?.childs ?? []).length && true === nd.expand) {
        let accuBeginLeft = beginLeft;

        // 如果子节点所占用的全部宽度比父节点本身宽度还小，则增加一些偏移量（宽度差的一半）
        let childSumW = 0;
        let maxSubH = 0;
        for (let i = 0; i < nd.childs.length; ++i) {
            childSumW += getNdWidth(nd.childs[i], resultWrapper, options)
                + (i > 0 ? toInt(1 === nd.childs[i].lev ? nodePaddingLeftSecondary : nodePaddingLeft) : 0);
            maxSubH = Math.max(maxSubH, resultWrapper.rects[nd.childs[i].id].height);
        }
        if (childSumW < selfW) {
            accuBeginLeft += toInt((selfW - childSumW) / 2);
        }

        for (let i = 0; i < nd.childs.length; ++i) {
            const eachBeginTop = subBeginTop - resultWrapper.rects[nd.childs[i].id].height
            putNdsRecursively(nd.childs[i], resultWrapper, accuBeginLeft, eachBeginTop, options);
            accuBeginLeft += getNdWidth(nd.childs[i], resultWrapper, options) +
                toInt(1 === nd.childs[i].lev ? nodePaddingLeftSecondary : nodePaddingLeft);
        }
    }
}


const putExpBtnRecursively = (nd, resultWrapper) => {
    if (!nd.childs || 0 === nd.childs.length) {
        return;
    }

    const expended = (true === nd.expand);
    let baseLeft = toInt(resultWrapper.ndStyles[nd.id].left + resultWrapper.rects[nd.id].width / 2);
    let baseTop = toInt(resultWrapper.ndStyles[nd.id].top);

    // 根据是展开还是折叠状态，对位置进行校正
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

    // 如果是展开状态，则继续计算子节点的展开按钮样式
    if (expended) {
        nd.childs.forEach(subNd => putExpBtnRecursively(subNd, resultWrapper));
    }
};


const getNdWidth = (nd, resultWrapper, options) => {
    //无子节点或未展开，取本节点的宽度
    if (0 === (nd?.childs ?? []).length || true !== nd.expand) {
        return toInt(resultWrapper.rects[nd.id].width);
    }

    const {nodePaddingLeftSecondary, nodePaddingLeft} = options;

    //有子节点，取所有子节点的高度和，中间加上空白的距离
    let sumChildrenH = 0;
    nd.childs.forEach((child, ind) => {
        sumChildrenH += (0 < ind ? toInt(1 === child.lev ? nodePaddingLeftSecondary : nodePaddingLeft) : 0)
            + getNdWidth(child, resultWrapper, options);//从第二个子节点开始，要加上空白的距离
    });
    return toInt(Math.max(resultWrapper.rects[nd.id].width, sumChildrenH));
}

export {uptreeLayout};