const htreeLayout = (rootNd, {allNdsOnRight = false, ...otherOptions}) => {


    // TODO extract from gmap, no need to implement again

    let record = {};
    calcHeight(rootNd, {isRoot: true, allNdsOnRight, ...otherOptions}, record);

    for(let ndId in record) {
        record[ndId].right=true;
    }

    if (rootNd.expand) {
        let leftH=0;
        let rightH=0;



        (rootNd.childs??[]).forEach(nd=>{
            record[nd.id].y=rightH+5;
            rightH+=record[nd.id].sumHeight+5;




        });
    }

    console.log(record);

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
const calcHeight = (nd, {isRoot = false, ...otherOptions}, result) => {
    const el = getEle(nd.el);
    const ndHeight = round(el.getBoundingClientRect().height);
    const childs = (nd?.childs ?? []);

    const sumHeight = Math.max(0, childs.length - 1) * 5 +
        childs.reduce((accu, subNd) => {
            calcHeight(subNd, {isRoot: false, ...otherOptions}, result);
            return accu + result[subNd.id].sumHeight;
        }, 0);
    result[nd.id] = {
        ndHeight,
        sumHeight,
    };

    if (isRoot || true !== nd.expand || 0 === childs.length) {
        result[nd.id].sumHeight = ndHeight;
    }
};

const round = (num) => parseInt(Math.round(num));

const getEle = (selectorOrEle) => {
    if ('object' === typeof selectorOrEle && selectorOrEle.tagName) {
        return selectorOrEle;
    }
    if ('string' === typeof selectorOrEle) {
        return document.querySelector(selectorOrEle);
    }
    console.error("cannot get element", selectorOrEle);
    throw new Error("cannot get element");
};

export {
    htreeLayout
};