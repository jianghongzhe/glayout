const containerMinW = 800;
const containerMinH = 600;
const graphPadding = 40;

const treeLayoutDefaultOptions = {
    defLineColor: 'lightgrey',
};

const htreeLayoutDefaultOptions = {
    ...treeLayoutDefaultOptions,
    allNdsOnRight: false,
    sameLevNdsAlign: false,
    nodePaddingTopSecondary: 20,
    nodePaddingTop: 10,
    xDistAngleDegree: 13,
    xDistRoot: 60,
    xDist: 40,
};

const upDownTreeLayoutDefaultOptions = {
    ...treeLayoutDefaultOptions,
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