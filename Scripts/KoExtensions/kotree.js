"use strict";
define(['./kotools'],function (koTools){
    function KoTree() {
            var self = this;
            self.levelMax = [0, 0, 0, 0];

            self.addNode = function(root, params, d, adder) {

                if (root.children == null)
                    root.children = [];
                if (root[adder] == null)
                    root[adder] = 0;
                if (root.count == null)
                    root.count = 1;

                var key = params.pop();
                var keyValue = koTools.getProperty(key, d);

                var level = params.length;

                var childIndex = self.findChild(root, keyValue);
                if (childIndex == -1) {
                    var newNode = { name: keyValue };
                    newNode.count= 0;
                    newNode[adder] = 0;
                    childIndex = root.children.push(newNode) - 1;
                }
                if (params.length != 0)
                    self.addNode(root.children[childIndex], params, d,adder);
                else {
                    //add the values to the selected child
                    root.children[childIndex].count += 1;
                    root.children[childIndex][adder] += d[adder];
                }

                //add the values on the root level
                root.count += 1;
                root[adder] += d[adder];

                self.levelMax[level] = Math.max(self.levelMax[level], root.tradedNotional);
            }

            self.findChild = function(root, name) {
                var i;
                for (i = 0; i < root.children.length; i++) {
                    if (root.children[i].name == name) {
                        return i;
                    }
                }
                return -1;
            }
        }
        return KoTree;
    }
);