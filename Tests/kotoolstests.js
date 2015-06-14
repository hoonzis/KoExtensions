"use strict";
define(
    ['../Scripts/KoExtensions/kotools'],
    function (koTools) {
        var run = function () {
            test("isValidDate returns true if object is date and has meaningful value", function () {
                var res = koTools.isValidDate(new Date("12/12/2012"));
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

            test("Enlarge text by copying", function () {
                var value = koTools.toLength("test", 8);
                equal(value, "testtest", "Should be 8 characters!");
            });

            test("String is string", function () {
                var v = "0.05";
                equal(koTools.isString(v), true, 'Is string');
            });

            test("Int is not string", function () {
                var v = 0.05;
                equal(koTools.isString(v), false, 'Is not string');
            });

            test("Min common value for simple integers", function () {
                var data = [
                    [1, 45, 0, 26],
                    [12, 32, 5, 0]
                ];

                var val = koTools.minCommonValue(data);
                equal(val, 0);
            });

            test("Min common value object array", function () {
                var data = [
                    [{x:12}, { x: 45 }, { x: 0 }, { x: 26 }],
                    [{ x: 12 }, { x: 32 }, { x: 5 }, { x: 0 }]
                ];

                var val = koTools.minCommonValue(data, function(i) {
                    return i.x;
                });
                equal(val, 0);
            });

            test("Min common for date values", function () {
                var data = [
                    [{ x: "20101" }, { x: "20105" }, { x: "20102" }, { x: "201012" }],
                    [{ x: "201012" }, { x: "20105" }, { x: "20104" }, { x: "20106" }]
                ];

                var val = koTools.minCommonValue(data, function (i) {
                    return i.x;
                });
                equal(val, "20105");
            });

            test("normalizeSeries find common month to normalize values", function () {
                var data = [
                    { values: [{ x: "20101", y: 10 }, { x: "20105", y: 20 }, { x: "201012", y: 40 }] },
                    { values: [{ x: "20105",y:5 },{x:"201012",y:2.5}] }
                ];

                var res = koTools.normalizeSeries(data);

                equal(res[0].values[0].y, 50);
                equal(res[0].values[1].y, 100);
                equal(res[0].values[2].y, 200);

                
                equal(res[1].values[0].y, 100);
                equal(res[1].values[1].y, 50);


            });

            test("default options setter sets all values specified in default options", function () {
                var defaultOptions = {
                    start: 10,
                    mapper: function (x) { return x*2;}
                }

                var testOptions = {
                    hello: 5
                }

                var res = koTools.setDefaultOptions(defaultOptions, testOptions);

                equal(res.start, 10);
                equal(res.hello, 5);
                equal(res.mapper(2), 4);
            });
        };
        return { run: run }
    }
);