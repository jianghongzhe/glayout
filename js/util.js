const getEle = (selectorOrEle, quiet = false) => {
    if ('object' === typeof selectorOrEle && selectorOrEle.tagName) {
        return selectorOrEle;
    }
    if ('string' === typeof selectorOrEle) {
        return document.querySelector(selectorOrEle);
    }
    console.error("cannot get element", selectorOrEle);
    if (!quiet) {
        throw new Error("cannot get element");
    }
};

const toInt = (numOrStr) => {
    let num = parseInt(`${numOrStr}`);
    return isNaN(num) ? 0 : num;
}

const round = (num) => toInt(Math.round(parseFloat(`${num}`)));

export {
    getEle,
    toInt,
    round,
}

