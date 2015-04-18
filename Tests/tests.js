"use strict";
require.config({
    paths: {
        'QUnit': '../Scripts/qunit-1.18.0',
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
    ['QUnit', 'kotoolstests'],
    function (QUnit, kotoolstests) {

        kotoolstests.run();

        // start QUnit.
        QUnit.load();
        QUnit.start();
    }
);
