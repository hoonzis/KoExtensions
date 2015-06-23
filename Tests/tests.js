"use strict";
require.config({
    paths: {
        'QUnit': '../Scripts/qunit-1.18.0',
        'd3': '../Scripts/d3',
    },
    shim: {
        'QUnit': {
            exports: 'QUnit',
            init: function () {
                QUnit.config.autoload = false;
                QUnit.config.autostart = false;
            }
        }
    }
});


// require the unit tests.
require(
    ['QUnit', 'kotoolstests','kotreetests'],
    function (QUnit, kotoolstests,kotreetests) {

        kotoolstests.run();
        kotreetests.run();

        // start QUnit.
        QUnit.load();
        QUnit.start();
    }
);
