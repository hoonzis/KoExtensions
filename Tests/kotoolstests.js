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
                    equal(res[i].values[0].y, 100);
                }

                equal(res[0].values[2].y, 10);
                equal(res[1].values[1].y.toFixed(2), 300);
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


            test("compare different mileniums", function () {
                var comparer = koTools.monthsComparer;
                var res = comparer("20121", "19991");
                equal(res, 1);
            });

            test("compare different years", function () {
                var comparer = koTools.monthsComparer;
                var res = comparer("20111", "20121");
                equal(res, -1);
            });

            test("adding values to empty matrix", function () {
                var matrix = [];
                matrix.setOrAdd(1, 2, 3);
                matrix.setOrAdd(1, 2, 3);
                equal(matrix[1][2], 6);
            });

            test("set values two times", function () {
                var matrix = [];
                matrix.set(1, 2, 2);
                matrix.set(1, 2, 3);
                equal(matrix[1][2], 3);
            });

            test("densifying a sparse matrix", function () {
                var matrix = [];
                matrix.set(1, 2, 2);
                matrix.set(1, 2, 3);
                equal(matrix[1][2], 3);
            });

            test("adding days", function () {
                var dat = new Date(2015, 12, 30);
                var newDate = dat.addDays(10);
                equal(newDate.getDate(), 9);
            });
        };
        return { run: run }
    }
);
