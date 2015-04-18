"use strict";
define(
    ['../Scripts/KoExtensions/kotools'],
    function (koTools) {
        var run = function () {
            test("isValidDate returns true if object is date and has meaningful value", function () {
                var res = koTools.isValidDate(new Date("12/20/2012"));
                ok(res);
            });

            test("normalizeSeries, normalizes all series in array with base being the first value converted to 100", function () {
                var data = [
                    [1000, 500, 100],
                    [0.1, 0.3, 1]
                ];

                var res = koTools.normalizeSeries(data);
                for (var i = 0; i < data.length; i++) {
                    equal(res[i][0], 100);
                }

                equal(res[0][2], 10);
                equal(res[1][1].toFixed(2), 300);
            });
        };
        return { run: run }
    }
);