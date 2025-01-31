import {treeLayout} from './js/tree-layout.js';

treeLayout({
    id:'from',
    el: "#from",
    expand:true,
    childs: [
        {
            id:"to",
            el:"#to",
            expand:true,
            childs:[
                {
                    id:"to2",
                    el:"#to2",
                },
                {
                    id:"to3",
                    el:"#to3",
                }
            ]
        },

    ]
}, {direction:'h'});



