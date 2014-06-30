function koToolsTestsInit() {
 
}
$(function () {
    module("kotools", {
        setup: koToolsTestsInit
    });
    test("date valid", function() {
        var res = koTools.isValidDate("20/12/2012");
        ok(res);
    });
});