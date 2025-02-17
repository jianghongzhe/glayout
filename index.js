import {treeLayout} from './js/facade.js';


let ndTree = {};


const initNodes = () => {
    const createNdEle = (id, lev, leaf) => {
        const ndEle = document.createElement("div");
        ndEle.id = id;
        ndEle.classList.add("transition", "nd");
        ndEle.style.width = `${Math.round(100 + Math.random() * 100)}px`;
        ndEle.style.height = `${Math.round(50 + Math.random() * 100)}px`;
        ndEle.innerText = id;
        document.querySelector("#container").appendChild(ndEle);

        if (!leaf) {
            const expBtnEle = document.createElement("div");
            expBtnEle.id = `btn_${id}`;
            expBtnEle.classList.add("transition");
            expBtnEle.style.zindex = 2;
            expBtnEle.style.position = "absolute";
            expBtnEle.innerText = "-";
            document.querySelector("#container").appendChild(expBtnEle);
        }

        return {
            id,
            expand: true,
            // lev,
            expBtnId: leaf ? null : `btn_${id}`,
            childs: [],
        };
    };

    const rootNd = createNdEle("root", 0, false);
    ndTree = rootNd;

    for (let i = 0; i < 2; i++) {
        const nd = createNdEle(`nd_${i}`, 1, false);
        rootNd.childs.push(nd);

        if (1 === i) {
            nd.lineColor = "blue";
        }

        for (let j = 0; j < 2; j++) {
            const nd2 = createNdEle(`nd_${i}_${j}`, 2, false);
            nd.childs.push(nd2);

            // if(1===i && 0===j){
            //     nd2.lineColor="red";
            // }

            for (let k = 0; k < 2; k++) {
                const nd3 = createNdEle(`nd_${i}_${j}_${k}`, 3, true);
                nd3.childs = null;
                nd2.childs.push(nd3);
            }
        }
    }

    ndTree = rootNd;
};


initNodes();

console.log("tree", ndTree);


const options = {
    // direction: 'h-right',
    // direction: 'h',
    // direction: 'down',
    direction: 'up',

    //// for h or h-right layout
    // nodePaddingTopSecondary: 20,
    // nodePaddingTop: 10,
    // xDistAngleDegree: 13,
    // xDistRoot: 60,
    // xDist: 40,

    //// for up or down layout
    // nodePaddingLeftSecondary: 20,
    // nodePaddingLeft: 10,
    // yDistRoot: 60,
    // yDist: 40,
    sameLevNdsAlign: true,
};


const applyStyle = () => {
    const t0 = new Date().getTime();
    const {ndStyles, expBtnStyles, wrapperStyle, directions, extra} = treeLayout(ndTree, options);


    console.log("directions", directions);
    console.log("extra", extra);

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
    expBtnEle.innerText = nd.expand ? '-' : `${nd.childs.length}`;
    applyStyle();
};

const bindClickEvents = (nd) => {
    const hasExpBtn = 0 < (nd?.childs ?? []).length;
    if (!hasExpBtn) {
        return;
    }

    const expBtnEle = document.querySelector(`#${nd.expBtnId}`);
    expBtnEle.innerText = nd.expand ? '-' : `${nd.childs.length}`;
    expBtnEle.addEventListener('click', clickHandler.bind(null, nd, expBtnEle));

    nd.childs.forEach(subNd => bindClickEvents(subNd));
};

bindClickEvents(ndTree);

