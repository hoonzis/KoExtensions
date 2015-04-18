function logMessage(msg) {
    console.log("[PHANTOMJS] " + msg);
}

logMessage('Starting tests...');

var system = require('system');

// parse input params.
if (system.args.length != 2) {
    logMessage("Error parameters. Use: phantomjs [testRunner.js] [testHost.html]");
    phantom.exit();
}
var testHostHtmlPageFilePath = system.args[1];

phantom.viewportSize = { width: 800, height: 600 };
phantom.onError = function (msg, trace) {
    var msgStack = ['PHANTOM ERROR: ' + msg];
    if (trace && trace.length) {
        msgStack.push('TRACE:');
        trace.forEach(function (t) {
            msgStack.push(' -> ' + (t.file || t.sourceURL) + ': ' + t.line + (t.function ? ' (in function ' + t.function + ')' : ''));
        });
    }
    console.error(msgStack.join('\n'));
    phantom.exit(1);
};

function onFinish() {
    phantom.exit();
}

var page = new WebPage();
page.onConsoleMessage = function (msg) {
    console.log(msg);

    // terminate phantom when we have tests results.
    if (msg && msg.indexOf("Test runner has finished") !== -1) {
        onFinish();
    }
};

page.onAlert = function (msg) {
    console.log("WARNING: An alert was invoked with message '" + msg + "'.");
};

page.onError = window.onError = function (msg) {
    var delimiter = '---------------------------';
    logMessage('ERROR: ' + msg + "\n" + delimiter + "\n" + page.content + "\n" + delimiter);
};

page.onResourceError = function (resourceError) {
    logMessage('ERROR: Error opening url ' + resourceError.url + ".\nREASON: " + resourceError.errorString);
};

logMessage('Loading tests host web page...');
page.open(testHostHtmlPageFilePath, function (status) {
    if (status !== 'success') {
        logMessage('Unable to open page: ' + url);
        phantom.exit();
        return;
    }
});