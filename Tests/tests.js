var koTools = koextensions.tools;

QUnit.test("isValidDate returns true if object is date and has meaningful value", function(assert) {
    var res = koTools.isValidDate(new Date("12/12/2012"));
    assert.ok(res);
});

QUnit.test("convertSeriesToXYPairs, will convert if series is just array of numbers", function(assert) {
    var data = [1000, 500, 100];
    var res = koTools.convertSeriesToXYPairs(data);

    assert.equal(res[0].y, 1000);
    assert.equal(res[2].x,2);
});

QUnit.test("convertAllSeriesToXYPairs, will ignore if no values property is available", function(assert) {
    var data = [
       [1000, 500, 100] ,
       { x:"test" }
    ];
    var res = koTools.convertAllSeriesToXYPairs(data);

    assert.equal(res[0][0], 1000);
    assert.equal(res[1].x, "test");
});

QUnit.test("Enlarge text by copying", function(assert) {
    var value = koTools.toLength("test", 8);
    assert.equal(value, "testtest", "Should be 8 characters!");
});

QUnit.test("String is string", function(assert) {
    var v = "0.05";
    assert.equal(koTools.isString(v), true, 'Is string');
});

QUnit.test("Int is not string", function(assert) {
    var v = 0.05;
    assert.equal(koTools.isString(v), false, 'Is not string');
});

QUnit.test("default options setter sets all values specified in default options", function(assert) {
    var defaultOptions = {
        start: 10,
        mapper: function (x) { return x*2;}
    }

    var testOptions = {
        hello: 5
    }

    var res = koTools.setDefaultOptions(defaultOptions, testOptions);

    assert.equal(res.start, 10);
    assert.equal(res.hello, 5);
    assert.equal(res.mapper(2), 4);
});


QUnit.test("compare different mileniums", function(assert) {
    var comparer = koTools.monthsComparer;
    var res = comparer("20121", "19991");
    assert.equal(res, 1);
});

QUnit.test("compare different years", function(assert) {
    var comparer = koTools.monthsComparer;
    var res = comparer("20111", "20121");
    assert.equal(res, -1);
});

QUnit.test("adding values to empty matrix", function(assert) {
    var matrix = [];
    matrix.setOrAdd(1, 2, 3);
    matrix.setOrAdd(1, 2, 3);
    assert.equal(matrix[1][2], 6);
});

QUnit.test("set values two times", function(assert) {
    var matrix = [];
    matrix.set(1, 2, 2);
    matrix.set(1, 2, 3);
    assert.equal(matrix[1][2], 3);
});

QUnit.test("densifying a sparse matrix", function(assert) {
    var matrix = [];
    matrix.set(1, 2, 2);
    matrix.set(1, 2, 3);
    assert.equal(matrix[1][2], 3);
});

QUnit.test("adding days", function(assert) {
    var dat = new Date(2015, 12, 30);
    var newDate = dat.addDays(10);
    assert.equal(newDate.getDate(), 9);
});
