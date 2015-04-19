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
                    { values: [1000, 500, 100] },
                    { values: [0.1, 0.3, 1] }
                ];

                var res = koTools.normalizeSeries(data);
                for (var i = 0; i < data.length; i++) {
                    equal(res[i].values[0], 100);
                }

                equal(res[0].values[2], 10);
                equal(res[1].values[1].toFixed(2), 300);
            });

            test("normalizeSeries, wont normalize series if they are composed of objects", function() {
                var data = [
                    {values: [{x:"hello"}, { x: "world" }]}
                ];

                var res = koTools.normalizeSeries(data);
                
                equal(res[0].values[0].x, "hello");
                equal(res[0].values[1].x, "world");
            });

            test("convertSeriesToXYPairs, will convert if series is just array of numbers", function () {
                var data = [1000, 500, 100];
                var res = koTools.convertSeriesToXYPairs(data);

                equal(res[0].y, 1000);
                equal(res[2].x,2);
            });

            test("convertAllSeriesToXYPairs, will ignore if no values property is available", function () {
                var data = [
                   [1000, 500, 100] ,
                   { x:"test" }
                ];
                var res = koTools.convertAllSeriesToXYPairs(data);

                equal(res[0][0], 1000);
                equal(res[1].x, "test");
            });
        };
        return { run: run }
    }
);