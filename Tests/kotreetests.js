"use strict";
define(
    ['../Scripts/KoExtensions/kotree'],
    function (koTree) {
        var run = function () {

            test("test adding 4 objects nesting in 2 leves", function () {
                var tree = new koTree();
                var car1 = { motor: 'diesel', transmission: 'automatic', price: 100 };
                var car2 = { motor: 'diesel', transmission: 'manual', price: 50 };
                var car3 = { motor: 'super', transmission: 'automatic', price: 80 };
                var car4 = { motor: 'super', transmission: 'automatic', price: 40 };

                tree.addNode(tree, ['motor', 'transmission'], car1, 'price');
                tree.addNode(tree, ['motor', 'transmission'], car2, 'price');
                tree.addNode(tree, ['motor', 'transmission'], car3, 'price');
                tree.addNode(tree, ['motor', 'transmission'], car4, 'price');

                equal(tree.children.length, 2);
                equal(tree.children[0].name, 'automatic');
                equal(tree.children[1].name, 'manual');

                var automatics = tree.children[0].children;
                equal(automatics.length, 2);
                equal(automatics[0].name, 'diesel');
                equal(automatics[0].price, 100);
                equal(automatics[0].count, 1);

                equal(automatics[1].name, 'super');
                equal(automatics[1].price, 120);
                equal(automatics[1].count, 2);
            });
        };
        return { run: run }
    }
);