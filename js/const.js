const containerMinW = 800;    //导图容器最小宽
const containerMinH = 600;    //导图容器最小高
const graphPadding = 40;    //图表内容与容器边缘之间的距离

const htreeLayoutDefaultOptions = {
    allNdsOnRight: false,
    sameLevNdsAlign: false,
    nodePaddingTopSecondary: 20,
    nodePaddingTop: 10,
    xDistAngleDegree: 13,
    xDistRoot: 60,
    xDist: 40,
};

const upDownTreeLayoutDefaultOptions = {
    sameLevNdsAlign: false,
    nodePaddingLeftSecondary: 20,
    nodePaddingLeft: 10,
    yDistRoot: 60,
    yDist: 40,
};

export {
    containerMinW,
    containerMinH,
    graphPadding,
    htreeLayoutDefaultOptions,
    upDownTreeLayoutDefaultOptions,
}