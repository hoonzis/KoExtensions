"use strict";
require.config({
    paths: {
        'QUnit': '../Scripts/qunit-1.18.0',
        'd3': '../Scripts/d3',
		'ko':'../Scripts/knockout-3.2.0'
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
var ko;
var d3;

//require d3 and ko which have to be defined globally
require(['ko', 'd3'], function(kol, d3l) {	
	// require the unit tests.
	ko = kol;
	d3 = d3l;
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
});
