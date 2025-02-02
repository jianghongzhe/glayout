import {treeLayout} from './js/tree-layout.js';

const ndTree = {
    id: 'from',
    selectorOrEle: "#from",
    expand: true,
    lev: 0,
    expBtnId: "btn_from",
    expBtnSelectorOrEle: "#btn_from",
    childs: [
        {
            id: "to",
            lev: 1,
            selectorOrEle: "#to",
            expand: false,
            expBtnId: "btn_to",
            expBtnSelectorOrEle: "#btn_to",
            childs: [
                {
                    id: "to2",
                    lev: 2,
                    selectorOrEle: "#to2",
                },

            ]
        },
        {
            id: "to3",
            lev: 1,
            selectorOrEle: "#to3",
            expand: true,
            expBtnId: "btn_to3",
            expBtnSelectorOrEle: "#btn_to3",
            childs: [
                {
                    id: "to4",
                    lev: 2,
                    selectorOrEle: "#to4",
                },
                {
                    id: "to5",
                    lev: 2,
                    selectorOrEle: "#to5",
                },



            ]
        }

    ]
};


const options = {
    direction: 'h-right',
    // direction: 'h',

    // nodePaddingTopSecondary: 20,
    // nodePaddingTop: 40,
    // xDistAngleDegree: 13,
    // xDistRoot: 60,
    // xDist: 40,
};


const applyStyle = () => {
    const t0 = new Date().getTime();
    const {ndStyles, expBtnStyles, wrapperStyle} = treeLayout(ndTree, options);
    const t1 = new Date().getTime();

    for (let id in ndStyles) {
        const ele = document.querySelector(`#${id}`);
        ele.style.visibility = ndStyles[id].hidden ? "hidden" : "visible";
        ele.style.opacity = ndStyles[id].hidden ? "0" : "1";
        ele.style.left = `${ndStyles[id].left}px`;
        ele.style.top = `${ndStyles[id].top}px`;
    }

    for (let id in expBtnStyles) {
        const ele = document.querySelector(`#btn_${id}`);
        ele.style.visibility = expBtnStyles[id].hidden ? "hidden" : "visible";
        ele.style.opacity = expBtnStyles[id].hidden ? "0" : "1";
        ele.style.left = `${expBtnStyles[id].left}px`;
        ele.style.top = `${expBtnStyles[id].top}px`;
    }

    document.querySelector("#container").style.width = `${wrapperStyle.width}px`;
    document.querySelector("#container").style.height = `${wrapperStyle.height}px`;
    const t2 = new Date().getTime();
    console.log("----------");
    console.log(`calc  layout time ${t1 - t0} ms`);
    console.log(`apply layout time ${t2 - t1} ms`);
    console.log(`sum          time ${t2 - t0} ms`);
};

setTimeout(() => {
    applyStyle();
    document.querySelector("#loading").remove();
}, 1_000);

const clickHandler = (nd, expBtnEle) => {
    nd.expand = !(nd.expand);
    expBtnEle.innerText = !!(nd.expand) ? '-' : `${nd.childs.length}`;
    applyStyle();
};

const bindClickEvents = (nd) => {
    const hasExpBtn = 0 < (nd?.childs ?? []).length;
    if (!hasExpBtn) {
        return;
    }

    const expBtnEle = document.querySelector(`#${nd.expBtnId}`);
    expBtnEle.innerText = !!(nd.expand) ? '-' : `${nd.childs.length}`;
    expBtnEle.addEventListener('click', clickHandler.bind(null, nd, expBtnEle));

    nd.childs.forEach(subNd => bindClickEvents(subNd));
};

bindClickEvents(ndTree);

