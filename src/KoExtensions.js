(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        //Allow using this built library as an AMD module
        //in another project. That other project will only
        //see this AMD call, not the internal modules in
        //the closure below.
        define([], factory);
    } else {
        //Browser globals case. Just assign the
        //result to a property on the global.
        root.libGlobalName = factory();
    }
}(this, function () {/**
 * @license almond 0.3.1 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                name = name.split('/');
                lastIndex = name.length - 1;

                // Node .js allowance:
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                //Lop off the last part of baseParts, so that . matches the
                //"directory" and not name of the baseName's module. For instance,
                //baseName of "one/two/three", maps to "one/two/three.js", but we
                //want the directory, "one/two" for this normalization.
                name = baseParts.slice(0, baseParts.length - 1).concat(name);

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            var args = aps.call(arguments, 0);

            //If first arg is not require('string'), and there is only
            //one arg, it is the array form without a callback. Insert
            //a null so that the following concat is correct.
            if (typeof args[0] !== 'string' && args.length === 1) {
                args.push(null);
            }
            return req.apply(undef, args.concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {
        if (typeof name !== 'string') {
            throw new Error('See almond README: incorrect module build, no module name');
        }

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("../build/almond", function(){});


define('KoExtensions/charting',[],function () {
    if (d3 == null) {
        throw "KoExtensions need d3";
    }
    var charting = {};

    charting.getElementAndCheckData = function(element, data) {
        var el = d3.select(element);
        if (data == null || data.length == 0) {
            element.innerHTML = "No data available";
            return null;
        }
        element.innerHTML = "";
        return el;
    };

    charting.showStandardLegend = function(parent, data, descGetter, color, showLegend, height, valueGetter) {
        var getItemAndValue = function(item) {
            if (valueGetter != null) {
                return descGetter(item) + ": " + valueGetter(item);
            } else {
                return descGetter(item);
            }
        };

        var maxLegendLength = d3.max(data, function(el) {
            return getItemAndValue(el).length;
        });

        //assuming 25 pixels for the small rectangle and 7 pixels per character, rough estimation which more or less works
        var legendWidth = 25 + maxLegendLength * 7;

        if (showLegend) {
            var legend = parent
                .append("svg")
                .attr("width", legendWidth)
                .attr("height", height)
                .selectAll("g")
                .data(data)
                .enter().append("g")
                .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

            legend.append("rect")
                .attr("width", 18)
                .attr("height", 18)
                .style("fill", function(i) { return color(descGetter(i)); });
            legend.append("text")
                .attr("x", 24)
                .attr("y", 9)
                .attr("dy", ".35em")
                .text(getItemAndValue);
        }
    };

    charting.showTooltip = function(info) {
        var toolTip = d3.select("#toolTip");
        var i = 1;
        for (var key in info) {
            d3.select("#info" + i + "header").text(key);
            if (info[key] != null)
                d3.select("#info" + i).text(info[key]);

            //make sure this one is shown
            d3.select("#info" + i + "header").style("display", "block");
            d3.select("#info" + i).style("display", "block");

            i++;
        }

        //hide empty ones
        for (var j = 5; j >= i; j--) {
            d3.select("#info" + j + "header").style("display", "none");
            d3.select("#info" + j).style("display", "none");
        }
        toolTip.transition()
            .duration(200)
            .style("opacity", ".9");

        toolTip.style("left", (d3.event.pageX + 15) + "px")
            .style("top", (d3.event.pageY - 75) + "px");
    };

    charting.hideTooltip = function() {
        var toolTip = d3.select("#toolTip");
        toolTip.transition()
            .duration(300)
            .style("opacity", "0");
    };

    charting.initializeCharts = function() {
        var tooltip = d3.select("body").append("div");

        tooltip
            .attr("id", "toolTip")
            .style("width", "150px")
            .style("position", "absolute")
            .style("opacity", 0)
            .style("background-color", "lightgray")
            .style("border-radius", "5px")
            .style("border", "1px solid black")
            .append("div")
            .style("margin", "5px")
            .style("z-index", 100000);


        tooltip.append("div").attr("id", "info1header")
            .attr("class", "header1");

        tooltip.append("div").attr("id", "info1")
            .attr("class", "header2");

        tooltip.append("div").attr("id", "info2header")
            .attr("class", "header1");

        tooltip.append("div").attr("id", "info2")
            .attr("class", "header2");

    };

    charting.getDimensions = function (options, el) {

        if (options.fillParentController) {
            options.width = el.width;
            options.height = el.height;
        }
        var margin = { top: 20, right: 80, bottom: 50, left: 50 };
        var width = options.width == null ? (960 - margin.left - margin.right) : options.width;
        var height = options.height == null ? (500 - margin.top - margin.bottom) : options.height;
        return {
            width: width,
            height: height,
            margin: margin
        };
    };
    
    charting.appendContainer = function(el, dims) {
        var svg = el.append("svg")
        .attr("width", dims.width + dims.margin.left + dims.margin.right)
        .attr("height", dims.height + dims.margin.top + dims.margin.bottom)
      .append("g")
        .attr("transform", "translate(" + dims.margin.left + "," + dims.margin.top + ")");

        return svg;
    }

    charting.createXAxis = function(svg,options,x,dims) {
        var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

        if (options.xUnitFormat != null)
            xAxis.tickFormat(options.xUnitFormat);

        var xAxisEl = svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + dims.height + ")")
        .call(xAxis);

        if (options.xAxisTextAngle != null) {
            xAxisEl.selectAll("text")
                .attr("y", 0)
                .attr("x", 9)
                .attr("dy", ".35em")
                .attr("transform", "rotate(" + options.xAxisTextAngle + ")")
                .style("text-anchor", "start");
        }
    }


    return charting;
});

define('KoExtensions/kotools',[],function () {
    if (d3 == null) {
        throw "KoTools need d3";
    }
    function KoTools() {

        var self = this;
        var today = new Date();

        self.currentYear = today.getFullYear();
        self.currentMonth = today.getMonth();
        self.isEmpty = function(str) {
            return (!str || 0 === str.length);
        }

        Date.prototype.toFormattedString = function() {

            var cDate = this.getDate();
            var cMonth = this.getMonth() + 1; //Months are zero based
            var cYear = this.getFullYear();
            return cDate + "/" + cMonth + "/" + cYear;
        }

        Array.prototype.setOrAdd = function (x, y, value) {
            if (this[x] == null)
                this[x] = [];
            if (this[x][y] == null || isNaN(this[x][y]))
                this[x][y] = value;
            else
                this[x][y] += value;
        }

        Array.prototype.set = function (x, y, value) {
            if (this[x] == null)
                this[x] = [];
            this[x][y] = value;
        }

        self.getQuarter = function(item) {
            if (item.Year != null && item.Quarter != null) {
                return "Q" + item.Quarter + item.Year;
            }
            return null;
        };

        self.getMonth = function(item) {
            if (item.Year != null && item.Month != null) {
                return item.Year + '' + item.Month;
            }
            return null;
        };

        self.monthsComparer = function(item1, item2) {
            if (self.isString(item1)) {
                var year1 = parseInt(item1.substring(0, 4));
                var month1 = parseInt(item1.substring(4, item1.length));

                var year2 = parseInt(item2.substring(0, 4));
                var month2 = parseInt(item2.substring(4, item2.length));

                if (year1 == year2) {
                    return d3.ascending(month1, month2);
                } else
                    return d3.ascending(year1, year2);
            } else {
                return d3.ascending(item1, item2);
            }
        };

        self.monthsIncrementer = function(item) {
            var year = parseInt(item.substring(0, 4));
            var month = parseInt(item.substring(4, item.length));

            if (month == 12) {
                month = 1;
                year++;
            } else {
                month++;
            }
            var yyyy = year.toString();
            var mm = month.toString();
            return yyyy + (mm[1] ? mm : "0" + mm[0]);
        };

        self.quartersComparer = function(item1, item2) {
            var q1 = item1.substring(1, 2);
            var year1 = item1.substring(2, 6);

            var q2 = item2.substring(1, 2);
            var year2 = item2.substring(2, 6);

            if (year1 == year2) {
                return d3.ascending(q1, q2);
            } else
                return d3.ascending(year1, year2);

        };

        var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        self.getYearAndMonthLabel = function(i) {
            if (!self.isString(i))
                return "";
            var month = monthNames[parseInt(i.substring(4, i.length)) - 1];
            return month;
        };

        self.getProperty = function(key, d) {
            if (typeof (key) == "function") {
                return key(d);
            } else {
                return d[key];
            }
        }

        self.find = function(data, predicate) {
            for (var i = 0; i < data.length; i++)
                if (predicate(data[i]))
                    return data[i];
            return null;
        }

        self.isString = function(x) {
            return typeof (x) == 'string';
        }

        self.isNumber = function(n) {
            return !isNaN(parseFloat(n)) && isFinite(n);
        }

        self.isValidNumber = function(n) {
            return n != null && !isNaN(n);
        }

        self.isDate = function(d) {
            return Object.prototype.toString.call(d) == "[object Date]";
        }

        Number.prototype.formatMoney = function(c, d, t) {
            var n = this,
                c = isNaN(c = Math.abs(c)) ? 2 : c,
                d = d == undefined ? "." : d,
                t = t == undefined ? "," : t,
                s = n < 0 ? "-" : "",
                i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "",
                j = (j = i.length) > 3 ? j % 3 : 0;
            return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
        };

        self.parseDate = function(input) {
            if (input instanceof Date)
                return input;

            //first get rid of the hour & etc...
            var firstSpace = input.indexOf(" ");

            if (firstSpace != -1) {
                input = input.substring(0, firstSpace);
                var separator = "/";
                var parts = [];
                if (input.indexOf("-") != -1) {
                    separator = "-";
                    parts = input.split(separator);
                    if (parts.length == 3) {
                        return new Date(parts[0], parts[1] - 1, parts[2]);
                    } else if (input.indexOf("/") != -1) {
                        return new Date(parts[2], parts[0] - 1, parts[1]);
                    }
                }
            }
            return new Date(Date.parse(input));
        };

        //verify that the date is valid => object is date-time and there is a meaningful value
        self.isValidDate = function(d) {
            if (!self.isDate(d))
                return false;
            return !isNaN(d.getTime());
        }

        self.compare = function(x, y) {
            for (var propertyName in x) {
                if (x[propertyName] !== y[propertyName]) {
                    return false;
                }
            }
            return true;
        }

        self.toLength = function(val, length) {
            if (val.length >= length) {
                return val.substring(0, length);
            }

            var returnVal = "";
            for (var i = 0; i < length; i++) {
                returnVal += val[i % val.length];
            }
            return returnVal;
        }

        Number.prototype.toCurrencyString = function(cur, decSpaces) {
            var formatted = this.toFixed(decSpaces).replace(/(\d)(?=(\d{3})+\b)/g, '$1 ');
            if (cur != null)
                formatted += ' ' + cur;
            return formatted;
        }

        self.toPercent = function(val) {
            if (val == null)
                return 0;
            return (val * 100).toFixed(1) + " %";
        }

        //Size of the object - equivalent of array length
        Object.size = function(obj) {
            var size = 0, key;
            for (key in obj) {
                if (obj.hasOwnProperty(key)) size++;
            }
            return size;
        };


        var objToString = Object.prototype.toString;

        function isString(obj) {
            return objToString.call(obj) == '[object String]';
        }


        //returns a dense version of sparse two dimensional matrix
        self.toDenseMatrix = function(arr) {
            var keys = Object.keys(arr).map(function(item) { return parseInt(item); });

            var minKey = d3.min(keys);
            var maxKey = d3.max(keys);

            var newarray = [];
            for (var i = minKey; i <= maxKey; i++) {
                newarray[i] = [];
                for (var j = minKey; j <= maxKey; j++) {
                    if (arr[i] == null || arr[i][j] == null)
                        newarray[i][j] = 0;
                    else
                        newarray[i][j] = arr[i][j];
                }
            }
            return newarray;
        }

        String.prototype.endsWith = function(suffix) {
            return this.indexOf(suffix, this.length - suffix.length) !== -1;
        };

        //difference in 2 arrays
        self.diff = function(a1, a2) {
            return a1.filter(function(i) { return a2.indexOf(i) < 0; });
        };

        self.tryConvertToNumber = function(orgValue) {
            var intValue = parseInt(orgValue);
            var decimalValue = parseFloat(orgValue);
            var value = intValue != null ? intValue : (decimalValue != null ? decimalValue : orgValue);
            return value;
        };

        self.toBoolean = function(string) {
            if (string == null)
                return false;
            switch (string.toLowerCase()) {
            case "true":
            case "yes":
            case "1":
                return true;
            case "false":
            case "no":
            case "0":
            case null:
                return false;
            default:
                return Boolean(string);
            }
        }

        self.transpose = function(a, xcoord) {
            if (a == null)
                return null;
            if (a.length == 0)
                return [];

            var keys = d3.keys(a[0]).filter(function(k) { return k != xcoord; });

            var horizontalKeys = d3.keys(a);
            var result = [];

            for (k in keys) {
                var key = keys[k];
                var newItem = new Object();
                newItem.name = key;
                horizontalKeys.map(function(hKey) {
                    newItem[a[hKey][xcoord]] = a[hKey][key];
                });
                result.push(newItem);
            }
            return result;
        }

        self.dateToFrenchString = function(date) {
            var month = date.getMonth() + 1;
            return date.getDate() + "/" + month + "/" + date.getFullYear();
        };

        self.dateToUSString = function(date) {
            var month = date.getMonth() + 1;
            return month + "/" + date.getDate() + "/" + date.getFullYear();
        };

        self.getYearAndMonth = function(date) {
            var yyyy = date.getFullYear().toString();
            var mm = (date.getMonth() + 1).toString();
            return yyyy + (mm[1] ? mm : "0" + mm[0]);
        };

        self.splitMonthAndYear = function(monthAndYear) {
            return {
                year: self.tryConvertToNumber(monthAndYear.substring(0, 4)),
                month: self.tryConvertToNumber(monthAndYear.substring(4, 6))
            };
        }

        self.distinct = function(data, mapper) {
            var mapped = data.map(mapper);
            return mapped.filter(function(v, i) { return mapped.indexOf(v) == i; });
        }

        self.normalizeSeries = function (data) {
            if (data == null) {
                return null;
            }

            if (data.length == 0) {
                return data;
            }


            if (data[0].values != null) {
                var testBaseValue = data[0].values[0];
                if (!self.isNumber(testBaseValue)) {
                    var onlyValues = data.map(function(serie) {
                        return serie.values;
                    });

                    var minCommonKey = self.minCommonValue(onlyValues, function (item) {
                        return item.x;
                    });
                }}

            for (var i = 0; i < data.length; i++) {
                if (data[i].values != null) {
                    var baseValue = data[i].values[0];
                    if (self.isNumber(baseValue)) {
                        //here we just convert a standard array into array of x/y pairs and we normalize it as well
                        for (var j = 0; j < data[i].values.length; j++) {

                            data[i].values[j] = {
                                x: j,
                                y: data[i].values[j].y = (data[i].values[j] / baseValue) * 100
                            };
                        }
                    } else if (minCommonKey != null) {
                        //try to find the min. common item in this series
                        var commonItem = self.find(data[i].values, function (item) {
                            return item.x == minCommonKey;
                        });
                        //if the min common item was found, than we can get the y, which will be the base value
                        //used to normalize all values
                        if (commonItem != null) {
                            baseValue = commonItem.y;
                            for (var j = 0; j < data[i].values.length; j++) {
                                data[i].values[j].y = (data[i].values[j].y / baseValue) * 100;
                            }
                        } else {
                            //this series does not have the common item, mark it to remove it
                            data[i].removeIt = true;
                        }
                    }
                }
            }
            return data.filter(function (series) {
                return series.removeIt == null || series.removeIt == false;
            });
        }

        self.convertSeriesToXYPairs = function(data) {
            var converted = [];
            for (var i = 0; i < data.length; i++) {
                converted.push({ x: i, y: data[i] });
            }
            return converted;
        }

        self.convertAllSeriesToXYPairs = function (data) {
            if (data == null) {
                return null;
            }
            for (var i = 0; i < data.length; i++) {
                if (data[i] != null && data[i].values != null) {
                    if (self.isNumber(data[i].values[0])) {
                        data[i].values = self.convertSeriesToXYPairs(data[i].values);
                    }
                }
            }
            return data;
        }

        self.minCommonValue = function (data, accessor) {
            var commonValues = {};
            for (var i = 0; i < data.length; i++) {
                for (var j = 0; j < data[i].length; j++) {
                    var newValue = accessor != null ? accessor(data[i][j]) : data[i][j];
                    if (commonValues[newValue] == null) {
                        commonValues[newValue] = 1;
                    } else {
                        commonValues[newValue] += 1;
                    }
                }
            }

            var max = 0;
            var maxKey = null;
            for (var k in commonValues) {
                if (commonValues[k] > max) {
                    max = commonValues[k];
                    maxKey = k;
                }
            }

            return maxKey;
        }

        self.setDefaultOptions = function (defaultConfig, config) {
            config = config || {};
            for (var key in defaultConfig) {
                config[key] = config[key] || defaultConfig[key];
            }
            return config;
        }

    };

    return new KoTools();
});

//accepts and array of objects. one property of each object is used as the x-coordinate 
//(determined by the xcoord option, which by default is set to 'x')
//the rest of the properties is stacked to the chart
function drawBarChart(data, element, options, lineData, charting) {
    var el = charting.getElementAndCheckData(element, data);
    if (el == null)
        return;

    var defaultOptions = {
        legend: true,
        width: 600,
        height: 200,
        xUnitName: 'x',
        itemName: 'Item',
        xcoord: 'x'
    };

    options = koTools.setDefaultOptions(defaultOptions, options);
    var xcoord = options.xcoord;
    var dims = charting.getDimensions(options, el);

    var x = d3.scale.ordinal()
        .rangeRoundBands([0, dims.width], .3);

    var y = d3.scale.linear()
        .rangeRound([dims.height, 0]);

    var color = d3.scale.category20();


    var yAxis = d3.svg.axis()
        .scale(y)
        .tickSize(dims.width)
        .orient("right");

    // not all the items do have the same set of properties, therefor scan them all and concatenate the result
    var keys = [];
    data.map(function(i) {
        var itemKeys = d3.keys(i).filter(function(key) { return key != xcoord && keys.indexOf(key) < 0; });
        keys = keys.concat(itemKeys);
    });
    color.domain(keys);

    //runs overs all the data. copies the result to a new array
    var arranged = [];
    var arrangedByX = {};
    data.forEach(function(d) {
        var newD = { x: d[xcoord] };
        var y0Neg = 0;
        var y0Pos = 0;


        var values = [];
        color.domain().forEach(function(m) {

            if (d[m] == 0 || d[m] == null)
                return;
            var xLabel = newD.x;
            if (options.xUnitFormat != null)
                xLabel = options.xUnitFormat(newD.x);
            var formattedValue = d[m];
            if (options.unitTransform != null)
                formattedValue = options.unitTransform(d[m]);

            if (d[m] > 0) {
                values.push({ name: m, y0: y0Pos, y1: y0Pos += +d[m], val: d[m], x: newD.x, xLabel: xLabel, xUnitName: options.xUnitName, formattedValue: formattedValue });
            } else {
                var y1 = y0Neg;
                values.push({ name: m, y0: y0Neg += d[m], y1: y1, val: d[m], x: newD.x, xLabel: xLabel, xUnitName: options.xUnitName, formattedValue: formattedValue });
            }
        });

        newD.values = values;
        newD.totalPositive = d3.max(newD.values, function(v) { return v.y1; });
        newD.totalNegative = d3.min(newD.values, function(v) { return v.y0; });
        arranged.push(newD);
        arrangedByX[newD.x] = newD;
    });

    charting.showStandardLegend(el, keys, function(item) { return item; }, color, options.legend, dims.height);

    var svg = charting.appendContainer(el, dims);

    var xKeys = arranged.map(function(d) { return d.x; });
    x.domain(xKeys);
    if (options.style == "stack") {
        y.domain([
            d3.min(arranged, function(d) { return d.totalNegative; }), d3.max(arranged, function(d) {
                if (d == null)
                    return 0;
                return d.totalPositive;
            })
        ]);
    } else {
        y.domain(
        [
            d3.min(arranged, function(d) {
                return d3.min(d.values,
                    function(i) {
                        if (i.val < 0)
                            return i.val;
                        return 0;
                    });
            }),
            d3.max(arranged, function(d) {
                return d3.max(d.values,
                    function(i) { return i.val; });
            })
        ]);
    }

    //for the groupped chart
    var x1 = d3.scale.ordinal();
    x1.domain(keys).rangeRoundBands([0, x.rangeBand()]);

    charting.createXAxis(svg, options, x, dims);

    var gy = svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    gy.selectAll("g").
        filter(function(d) { return d; })
        .classed("minor", true);

    gy.selectAll("text")
        .attr("x", 4)
        .attr("dy", -4);

    var onBarOver = function(d) {
        var column = arrangedByX[d.x];

        d3.select(this).style("stroke", 'black');
        d3.select(this).style("opacity", 1);
        var info = {};
        info[options.xUnitName] = d.xLabel;
        info[d.name] = d.formattedValue;
        if (column.totalNegative == 0)
            info[d.name] += " (" + koTools.toPercent(d.val / column.totalPositive) + ")";
        charting.showTooltip(info);
    }

    var onPointOver = function(d) {
        d3.select(this).style("fill", "blue");
        var info = {};
        var unitName = d.xUnitName;
        if (unitName == null)
            unitName = 'x';
        info[unitName] = d.xLabel;
        if (options.lineFormatter != null)
            info[d.name] = options.lineFormatter(d.y);
        else
            info[d.name] = d.y;
        charting.showTooltip(info);
    }

    var onPointOut = function() {
        d3.select(this).style("fill", "white");
        charting.hideTooltip();
    }

    var onBarOut = function() {
        d3.select(this).style("stroke", 'none');
        d3.select(this).style("opacity", 0.8);
        charting.hideTooltip();
    }

    var group = svg.selectAll(".xVal")
        .data(arranged)
        .enter().append("g")
        .attr("class", "g")
        .attr("transform", function(d) { return "translate(" + x(d.x) + ",0)"; });

    if (options.style == "stack") {
        group.selectAll("rect")
            .data(function(d) { return d.values; })
            .enter().append("rect")
            .attr("width", x.rangeBand())
            .attr("y", function(d) { return y(d.y1); })
            .attr("height", function(d) { return y(d.y0) - y(d.y1); })
            .on("mouseover", onBarOver)
            .on("mouseout", onBarOut)
            .style("opacity", 0.8)
            .style("cursor", "pointer")
            .style("fill", function(d) {
                return color(d.name);
            });

    } else {
        group.selectAll("rect")
            .data(function(d) {
                return d.values;
            })
            .enter().append("rect")
            .attr("width", x1.rangeBand())
            .attr("x", function(d) {
                return x1(d.name);
            })
            .attr("y", function(d) {
                return y(d.val);
            })
            .attr("height", function(d) {
                return dims.height - y(d.val);
            })
            .style("cursor", "pointer")
            .on("mouseover", onBarOver)
            .on("mouseout", onBarOut)
            .style("fill", function(d) { return color(d.name); });
    }

    //Add the single line
    if (lineData == null || lineData.length == 0)
        return;

    var lineY = d3.scale.linear()
        .range([dims.height, 0]);

    var line = d3.svg.line()
        .interpolate("linear")
        .x(function(d) {
            return x(d.x) + x.rangeBand() / 2;
        })
        .y(function(d) {
            return lineY(d.y);
        });

    //in some cases it makes sense to use the same scale for both
    //typically the cash-flow chart
    //for other cases (line  volumne / units correlations a separate scale should be used for each)
    if (!options.sameScaleLinesAndBars) {
        lineY.domain([
            0,
            d3.max(lineData, function(v) { return v.y; })
        ]);
    } else {
        lineY.domain(y.domain());
    }


    var yAxisRight = d3.svg.axis()
        .scale(lineY)
        .orient("right");

    svg.append("g")
        .call(yAxisRight)
        .attr("transform", "translate(" + dims.width + " ,0)");


    svg.append("path")
        .attr("d", line(lineData))
        .style("stroke", "blue")
        .style("stroke-width", 2)
        .style("fill", "none");

    var circles = svg.selectAll("circle")
        .data(lineData)
        .enter()
        .append("circle");

    circles.attr("cx", function(d) { return x(d.x) + x.rangeBand() / 2; })
        .attr("cy", function(d) { return lineY(d.y); })
        .attr("r", function() { return 4; })
        .style("fill", "white")
        .style("stroke-width", 2)
        .style("stroke", "blue")
        .style("cursor", "pointer")
        .on("mouseover", onPointOver)
        .on("mouseout", onPointOut);
};
define("KoExtensions/Charts/barchart", function(){});

//Takes as input collection of items [data]. Each item has two values [x] and [y].
//x is the label and y the value which determines the size of the slice of the pie chart.
function drawPieChart(data, element,options,charting) {
    var el = charting.getElementAndCheckData(element, data);
    if (el == null)
        return;

    var defaultOptions = {
        legend: true,
        width: 200,
        height: 200
    };

    options = koTools.setDefaultOptions(defaultOptions, options);

    var color;

    //for a piechart only positive values make sense
    data = data.filter(function (i) {
        return i.y > 0;
    });

    if (data.length == 0)
        return;

    //TODO: why is the color scale passed as paramter
    if (options.colors != null) {
        color = options.colors;
    } else {
        color = d3.scale.category20();
        var keys = data.map(function (item) {
            return item.x;
        });
        color.domain(keys);
    }
   

    var width = options.width / 2;
    var height = options.height;
    var outerRadius = Math.min(width, height) / 2 - 3,
    innerRadius = outerRadius * .3,
    donut = d3.layout.pie(),
    arc = d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius);
    donut.value(function (d) { return d.y; });
    var sum = d3.sum(data, function (item) { return item.y; });
    charting.showStandardLegend(el, data, function (i) { return i.x; }, color, options.legend, height, function (i) {
        if (options.unitTransform != null)
            return options.unitTransform(i.y);
        return i.y;
    });
    var vis = el.append("svg")
      .data([data])
      .attr("width", width)
      .attr("height", height);

    var arcs = vis.selectAll("g.arc")
        .data(donut)
      .enter().append("g")
        .attr("class", "arc")
        .attr("transform", "translate(" + outerRadius + "," + outerRadius + ")");

    var arcMouseOver = function(d) {
        d3.select(this).style("stroke", 'black');
        d3.select(this).style("opacity", 1);
        var info = {};
        var value = d.formatted + " (" + koTools.toPercent(d.percentage) + ")";
        info[d.data.x] = value;
        charting.showTooltip(info);
    }

    var arcMouseOut = function() {
        d3.select(this).style("stroke", 'none');
        d3.select(this).style("opacity", 0.7);
        charting.hideTooltip();
    }

    arcs.append("path")
        .attr("d", arc)
        .style("fill", function(d) { return color(d.data.x); })
        .style("stroke-width", 2)
        .style("stroke", "none")
        .on("mouseover", arcMouseOver)
        .on("mouseout", arcMouseOut)
        .style("cursor", "pointer")
        .style("opacity",0.7)
        .each(function(d) { 
            d.percentage = d.data.y / sum;
            d.formatted = options.unitTransform ? options.unitTransform(d.data.y) : d.data.y;
    });
}


;
define("KoExtensions/Charts/piechart", function(){});

//Takes as input collection of items [data]. Each item has two values [x] and [y].
//[{x:1, receivedEtf:123, tradedEtf:100},{x:2, receivedEtf:200, tradedEtf:100}]
//[{linename:receivedEtf, values:[x:q1, y:200]}]
function drawLineChart(data, element, options,charting) {
    var el = charting.getElementAndCheckData(element, data);
    if (el == null)
        return;

    var defaultOptions = {
        legend: true,
        width: 200,
        height: 200,
        xUnitName: 'x'
    }

    options = koTools.setDefaultOptions(defaultOptions, options);

    if (options.normalizeSeries) {
        data = koTools.normalizeSeries(data);
    }
  
    var dims = charting.getDimensions(options,el);
    data.forEach(function (singleLine) {
        if (singleLine.values == null)
            throw "Each line needs to have values property containing tuples of x and y values";
    });

    var x = d3.scale.ordinal()
        .rangeRoundBands([0, dims.width], .1);

    var y = d3.scale.linear()
      .range([dims.height, 0]);

    var color = d3.scale.category20();

    var getColor = function(l) {
        if (l.color == null) return color(l.x);
        return l.color;
    }

    //xKeys - not all the lines have neceseraly the same x values -> concat & filter
    var xKeys = [];
    data.map(function (i) {
        var itemKeys = i.values.map(function (v) {
            return v.x;
        }).filter(function (v) {
            return xKeys.indexOf(v) < 0;
        });

        xKeys = xKeys.concat(itemKeys);
    });
    x.domain(xKeys);

    y.domain([
        d3.min(data, function (c) {
            return d3.min(c.values, function (v) {
                if (v.y < 0)
                    return v.y;
                return 0;
            });
        }),
        d3.max(data, function (c) {
            return d3.max(c.values,
                function (v) { return v.y; });
        })
    ]);

    var yAxis = d3.svg.axis()
      .scale(y)
      .tickSize(dims.width)
      .orient("right");

    x.invert = function(xPos) {
        var leftEdges = x.range();
        var rangeWidth = x.rangeBand();
        var j;
        for (j = 0; xPos > (leftEdges[j] + rangeWidth) ; j++) {
        }
        return j;
    };

    var line = d3.svg.line()
      .interpolate("linear")
      .x(function(d) { return x(d.x) + x.rangeBand() / 2; })
      .y(function(d) { return y(d.y); });

    var svg = charting.appendContainer(el, dims);

    var keys = data.map(function(item) { return item.x; });
    color.domain(keys);
    charting.showStandardLegend(el,keys, function(i) { return i; },color,options.legend,dims.height);

    charting.createXAxis(svg, options, x, dims);

    var gy = svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);
    
    gy.selectAll("g").
        filter(function (d) { return d; })
        .classed("minor", true);

    gy.selectAll("text")
    .attr("x", 4)
    .attr("dy", -4);

    var point = svg.selectAll(".point")
        .data(data)
        .enter().append("g")
        .each(function (d) {d.values.forEach(
            function (item) {
                item.color = getColor(d);
                if(item.formattedValue!= null)
                    return;
                if(item.name == null)
                  item.name = d.x;
                var formattedValue = item.y;
                if (options.unitTransform != null)
                    formattedValue = options.unitTransform(item.y);
                item.formattedValue = formattedValue;
            });
        });

    var lines = point.selectAll("circle")
        .data(function (d) {
            return d.values;
        });

  
    var spMouseOut = function() {
        d3.select(this).style("fill", "white");
        point.style("opacity", 1);
        charting.hideTooltip();
    }

    var spMouseOver = function (d) {
        var xLabel = d.xLabel != null ? d.xLabel : d.x;
        var info = {};
        info[options.xUnitName] = xLabel;
        info[d.name] = d.formattedValue;
        charting.showTooltip(info);
        d3.select(this).style("fill", d.color);

        point.style("opacity", function(item) {
            if (item.x != d.linename)
                return 0.4;
            return 1;
        });
    }
  
  point.append("path")
      .attr("class", "line")
      .attr("d", function (d) {
          return line(d.values);
      })
      .style("stroke-width", 2)
      .style("stroke", function (d) {
          return getColor(d);
      })
      .style("fill", "none");

  lines.enter().append("circle")
       .attr("cx", function (d) {
           return x(d.x) + x.rangeBand() / 2;
       })
      .attr("cy", function (d) { return y(d.y); })
      .attr("r", function () { return 4; })
      .style("fill","white")
      .style("stroke-width", "2")
      .style("stroke", function (d) { return d.color; })
      .style("cursor", "pointer")
      .on("mouseover", spMouseOver)
      .on("click", spMouseOver)
      .on("mouseout", spMouseOut);
}




;
define("KoExtensions/Charts/linechart", function(){});

var charting = null;
var koTools;
define('KoExtensions/koextensions',['./charting', './kotools','./Charts/barchart','./Charts/piechart','./Charts/linechart'],
    function (ch, kotools) {
        function koextensions() {
            var self = this;
            if (ko == null)
                throw "Ko extensions depend on globally defined knockout ko variable";
            koTools = kotools;
            charting = ch;
            charting.initializeCharts();
            var markers = [];

            self.registerExtensions = function() {
                ko.bindingHandlers.map = {
                    init: function(element, valueAccessor, allBindingsAccessor, viewModel) {

                        try {
                            var position = new google.maps.LatLng(allBindingsAccessor().latitude(), allBindingsAccessor().longitude());

                            var marker = new google.maps.Marker({
                                map: allBindingsAccessor().map,
                                position: position,
                                title: name
                            });

                            google.maps.event.addListener(marker, 'click', function() {
                                allBindingsAccessor().itemSelected();
                            });

                            markers.push(marker);
                            viewModel._mapMarker = marker;

                            allBindingsAccessor().map.setCenter(position);
                        } catch (err) {
                        }
                    },
                    update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
                        try {
                            var latlng = new google.maps.LatLng(allBindingsAccessor().latitude(), allBindingsAccessor().longitude());
                            viewModel._mapMarker.setPosition(latlng);
                        } catch (err) {
                        }
                    }
                };

                ko.bindingHandlers.datepicker = {
                    init: function(element, valueAccessor, allBindingsAccessor) {
                        //initialize datepicker with some optional options
                        var options = allBindingsAccessor().datepickerOptions || {};
                        $(element).datepicker(options);

                        //when a user changes the date, update the view model
                        ko.utils.registerEventHandler(element, "changeDate", function(event) {
                            var value = valueAccessor();
                            if (ko.isObservable(value)) {
                                value(event.date);
                            }
                        });
                    },
                    update: function(element, valueAccessor) {
                        var widget = $(element).data("datepicker");

                        if (widget != null) {
                            var vmValue = ko.utils.unwrapObservable(valueAccessor());

                            //if we have a string value - convert it first
                            if (kotools.isString(vmValue)) {
                                vmValue = new Date(vmValue);
                            }

                            //if the date is not valid - don't visualize it, or we would have a "NaN/NaN/NaN"
                            if (!kotools.isValidDate(vmValue))
                                return;

                            widget.setDates(vmValue);
                        }
                    }
                };

                ko.bindingHandlers.linechart = {
                    update: function(element, valueAccessor, allBindingsAccessor) {
                        var options = allBindingsAccessor().chartOptions;
                        var data = allBindingsAccessor().linechart();
                        drawLineChart(data, element, options, charting);
                    }
                };


                ko.bindingHandlers.piechart = {
                    update: function(element, valueAccessor, allBindingsAccessor) {
                        var data = allBindingsAccessor().piechart();
                        var options = allBindingsAccessor().chartOptions;
                        drawPieChart(data, element, options, charting);
                    }
                };

                ko.bindingHandlers.barchart = {
                    update: function(element, valueAccessor, allBindingsAccessor) {
                        var data = ko.unwrap(valueAccessor());
                        var options = ko.unwrap(allBindingsAccessor().chartOptions);

                        var line = null;
                        if (allBindingsAccessor().line != null)
                            line = allBindingsAccessor().line();

                        drawBarChart(data, element, options, line, charting);
                    }
                };

                ko.bindingHandlers.eventDrops = {
                    update: function(element, valueAccessor, allBindingsAccessor) {

                        var chartData = {
                            data: ko.unwrap(allBindingsAccessor().eventDrops),
                            options: ko.unwrap(allBindingsAccessor().chartOptions)
                        };

                        //if the eventColor was specified, need to get all possible colors to create a scale
                        var allItemsColorValues = chartData.data.map(function(f) {
                            return f.dates.map(chartData.options.eventColor);
                        });

                        //flattening the data since it is grouped in 2 dimensional array
                        var flatColorsArray = d3.set([].concat.apply([], allItemsColorValues)).values();

                        var color = d3.scale.category20().domain(flatColorsArray);

                        element._chartData = chartData;

                        var eventDropsChart = d3.chart.eventDrops()
                            .start(chartData.options.start)
                            .end(chartData.options.end)
                            .width(chartData.options.width)
                            .eventColor(function(d) {
                                return color(chartData.options.eventColor(d));
                            })
                            //.eventSize(chartData.options.eventSize)
                            .eventDate(chartData.options.eventDate)
                            .eventHover(chartData.options.eventHover)
                            .minPercentile(chartData.options.minPercentile)
                            .maxPercentile(chartData.options.maxPercentile)
                            .scale(chartData.options.scale);

                        d3.select(element)
                            .datum(chartData.data)
                            .call(eventDropsChart);

                    }
                };

                ko.bindingHandlers.histogram = {
                    update: function(element, valueAccessor, allBindingsAccessor) {
                        var data = ko.unwrap(valueAccessor());
                        var options = ko.unwrap(allBindingsAccessor().chartOptions);
                        drawHistogram(data, element, options, charting);
                    }
                };

                ko.bindingHandlers.scatterplot = {
                    update: function(element, valueAccessor, allBindingsAccessor) {
                        var data = ko.unwrap(valueAccessor());
                        var options = ko.unwrap(allBindingsAccessor().chartOptions);
                        drawScatterPlot(data, element, options, charting);
                    }
                };

                ko.bindingHandlers.bubblechart = {
                    update: function(element, valueAccessor, allBindingsAccessor) {
                        var data = ko.unwrap(valueAccessor());
                        var options = ko.unwrap(allBindingsAccessor().chartOptions);
                        drawBubbleChart(data, element, options, charting);
                    }
                };
            };

            function applyFormattedValue(fValue, element) {
                //TODO: test if val is function  => observable then evaluate, test if it is a number before calling toCurrencyString
                if (fValue.val != null) {
                    if (fValue.transf != null)
                        fValue.val = fValue.transf(fValue.val);
                    if (kotools.isNumber(fValue.val)) {
                        element.innerHTML = fValue.val.toCurrencyString(fValue.currency, fValue.rounding);
                    } else {
                        element.innerHTML = fValue.val;
                    }
                }
            };

            function getFormattedValueFromAccessor(accessor) {
                var fValue = {
                    currency: getValue(accessor.currency),
                    val: getValue(accessor.formattedValue),
                    transf: accessor.transformation,
                    rounding: getValue(accessor.rounding)
                };
                return fValue;
            }

            ko.bindingHandlers.formattedValue = {
                update: function(element, valueAccessor, allBindingsAccessor) {
                    var fValue = getFormattedValueFromAccessor(allBindingsAccessor());
                    applyFormattedValue(fValue, element);
                }
            }

            ko.bindingHandlers.progress = {
                init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
                    var value = valueAccessor()();
                    if (value == null)
                        value = 0;
                    element.style.width = value + "%";
                    element.style.display = 'none';
                    element.style.display = 'block';
                },
                update: function(element, valueAccessor, allBindingsAccessor) {
                    var value = valueAccessor()();
                    if (value == null)
                        value = 0;
                    element.style.width = value + "%";
                }
            };

            function getValue(val) {
                if (val != null && typeof (val) == 'function')
                    val = val();
                return val;
            };
        };

        return new koextensions();
    });


   //The modules for your project will be inlined above
    //this snippet. Ask almond to synchronously require the
    //module value for 'main' here and return it as the
    //value to use for the public API for the built file.
    var extensions = require('KoExtensions/koextensions');
	extensions.registerExtensions();
}));