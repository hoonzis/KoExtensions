(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        //Allow using this built library as an AMD module
        //in another project. That other project will only
        //see this AMD call, not the internal modules in
        //the closure below.
        define([], factory);
    } else {
        root.koExtensions = factory();
    }
}(this, function () {
/**
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

define("../src/almond", function(){});


define('KoExtensions/kotools',['d3'],function (d3) {
    function KoTools() {

        var self = this;
        var today = new Date();

        self.currentYear = today.getFullYear();
        self.currentMonth = today.getMonth();
        self.isEmpty = function(str) {
            return (!str || 0 === str.length);
        };

        Date.prototype.toFormattedString = function() {
            var cDate = this.getDate();
            var cMonth = this.getMonth() + 1; //Months are zero based
            var cYear = this.getFullYear();
            return cDate + "/" + cMonth + "/" + cYear;
        };

        Array.prototype.setOrAdd = function (x, y, value) {
            if (this[x] === null || this[x] === undefined){
                this[x] = [];
            }
            if (this[x][y] === null || isNaN(this[x][y])){
                this[x][y] = value;
            }
            else{
                this[x][y] += value;
            }
        };

        Array.prototype.set = function (x, y, value) {
            if (!this[x]){
                this[x] = [];
            }
            this[x][y] = value;
        };

        Date.prototype.addDays = function (days) {
            var dat = new Date(this.valueOf());
            dat.setDate(dat.getDate() + days);
            return dat;
        };

        self.getQuarter = function(item) {
            if (item.Year !== null && item.Quarter !== null) {
                return "Q" + item.Quarter + item.Year;
            }
            return null;
        };

        self.paddy = function (n, p, c) {
            var pad_char = typeof c !== 'undefined' ? c : '0';
            var pad = new Array(1 + p).join(pad_char);
            return (pad + n).slice(-pad.length);
        };

        self.getMonth = function(item) {
            if (item.Year !== null && item.Month !== null) {
                return item.Year + '' + self.paddy(item.Month, 2);
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
        };

        self.getWidth = function(el)
        {
            if (el.clientWidth){
                return el.clientWidth;
            }

            if (Array.isArray(el) && el.length > 0) {
                return self.getWidth(el[0]);
            }
            return null;
        };


        self.getHeight = function(el)
        {
            if (el.clientHeight){
                return el.clientWidth;
            }

            if (Array.isArray(el) && el.length > 0) {
                return self.getWidth(el[0]);
            }
            return null;
        };

        self.find = function(data, predicate) {
            for (var i = 0; i < data.length; i++)
                if (predicate(data[i]))
                    return data[i];
            return null;
        };

        self.isString = function(x) {
            return typeof (x) == 'string';
        };

        self.isNumber = function(n) {
            return !isNaN(parseFloat(n)) && isFinite(n);
        };

        self.isValidNumber = function(n) {
            return n !== null && !isNaN(n);
        };

        self.isDate = function(d) {
            return Object.prototype.toString.call(d) == "[object Date]";

        };
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
        };

        self.compare = function(x, y) {
            for (var propertyName in x) {
                if (x[propertyName] !== y[propertyName]) {
                    return false;
                }
            }
            return true;
        };

        self.toLength = function(val, length) {
            if (val.length >= length) {
                return val.substring(0, length);
            }

            var returnVal = "";
            for (var i = 0; i < length; i++) {
                returnVal += val[i % val.length];
            }
            return returnVal;
        };

        Number.prototype.toCurrencyString = function(cur, decSpaces) {
            var formatted = this.toFixed(decSpaces).replace(/(\d)(?=(\d{3})+\b)/g, '$1 ');
            if (cur != null)
                formatted += ' ' + cur;
            return formatted;
        };

        self.toPercent = function(val) {
            if (val === null)
                return 0;
            return (val * 100).toFixed(1) + " %";
        };

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
        };

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
        };

        self.transpose = function(a, xcoord) {
            if (a === null)
                return null;

            if (a.length === 0)
                return [];

            var keys = d3.keys(a[0]).filter(function(k) { return k != xcoord; });

            var horizontalKeys = d3.keys(a);
            var result = [];

            for (var k in keys) {
                var key = keys[k];
                var newItem = {
                    name: key
                };
                horizontalKeys.map(function(hKey) {
                    newItem[a[hKey][xcoord]] = a[hKey][key];
                });
                result.push(newItem);
            }
            return result;
        };

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
        };

        self.distinct = function(data, mapper) {
            var mapped = data.map(mapper);
            return mapped.filter(function(v, i) { return mapped.indexOf(v) == i; });
        };

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
                                y: (data[i].values[j] / baseValue) * 100
                            };
                        }
                    } else if (minCommonKey != null) {
                        //try to find the min. common item in this series
                        var commonItem = self.find(data[i].values, function (item) {
                            return item.x == minCommonKey;
                        });
                        //if the min common item was found, than we can get the y, which will be the base value
                        //used to normalize all values
                        if (commonItem !== undefined && commonItem!==null) {
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
        };

        self.convertSeriesToXYPairs = function(data) {
            var converted = [];
            for (var i = 0; i < data.length; i++) {
                converted.push({ x: i, y: data[i] });
            }
            return converted;
        };

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
        };

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
        };

        self.setDefaultOptions = function (defaultConfig, config) {
            config = config || {};
            for (var key in defaultConfig) {
                config[key] = config[key] != null ? config[key] : defaultConfig[key];
            }
            return config;
        };

        self.getIdealDateFormat = function(range) {
            var min = range[0];
            var max = range[1];
            var oneDay = 24*60*60*1000;
            var diffDays = Math.round(Math.abs((max.getTime() - min.getTime())/(oneDay)));

            if(diffDays > 5){
                return function(d){
                    var val = d.toFormattedString();
                    return val;
                };
            }else {
                var diffHours = Math.abs(max - min) / 36e5;
                if(diffHours > 2){
                    return function(d){
                        return d.getHours() + ":" + d.getMinutes();
                    };
                }else{
                    return function(d) { return d.getMinutes() + ":" + d.getSeconds();};
                }
            }
        }

        self.throttle = function(delay, callback) {
            var previousCall = new Date().getTime();
            return function () {
                var time = new Date().getTime();

                //
                // if "delay" milliseconds have expired since
                // the previous call then propagate this call to
                // "callback"
                //
                if ((time - previousCall) >= delay) {
                    previousCall = time;
                    callback.apply(null, arguments);
                }
            };
          };
        }
    return new KoTools();
});


define('KoExtensions/charting',['d3','./kotools'], function (d3,koTools) {
    var charting = {};

    charting.colors = d3.scale.ordinal().range(["#1f77b4", "#2ca02c", "#d62728", "#393b79", "#3182bd", "#636363", "#ff8c00"]);

    charting.getElementAndCheckData = function (element, data) {
        var el = d3.select(element);
        if (data === null || data === undefined || data.length === 0) {
            element.innerHTML = "No data available";
            return null;
        }
        element.innerHTML = "";
        return el;
    };

    charting.getLegendWidth = function (data) {
        //when there is no legend, just return 0 pixels
        if (data === null || data.length === 0) {
            return 0;
        }
        var maxWidth = d3.max(data, function (el) {
            return el.length;
        });
        //asuming 7px per character
        return maxWidth * 7;
    };

    charting.showStandardLegend = function (parent, data, color, showLegend, height) {
        if (showLegend) {
            var maxWidth = charting.getLegendWidth(data);

            //assuming 25 pixels for the small rectangle and 7 pixels per character, rough estimation which more or less works
            var legendWidth = 25 + maxWidth;

    		var size = legendWidth > 70 ? 15 : 18,
                fontSize = legendWidth > 70 ? "13px" : "16px";

            var legend = parent
                .append("svg")
                .attr("width", legendWidth)
                .attr("height", height)
                .selectAll("g")
                .data(data)
                .enter().append("g")
                .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

            legend.append("rect")
                  .attr("width", size)
                  .attr("height", size)
                  .style("fill", function(i) { return color(i); });
            legend.append("text")
                  .attr("x", 24)
                  .attr("y", 9)
  		            .attr("font-size", fontSize)
                  .attr("dy", ".35em")
                  .text(function (t) { return t; });
        }
    };

    charting.headerStyle = function (el) {
        el
             .style("text-align", "left")
             .style("font-size", "12px")
             .style("font-family", "sans-serif")
             .style("margin-bottom", "4px")
             .style("margin-right", "4px")
             .style("margin-left", "10px")
             .style("color", "#FFFFFF")
             .style("font-weight", "bold")
             .style("clear", "both")
             .style("float", "left");
    };

    charting.valueStyle = function (el) {
        el
            .style("text-align", "left")
            .style("font-size", "12px")
            .style("font-family", "sans-serif")
            .style("margin-bottom", "6px")
            .style("margin-left", "15px")
            .style("color", "#FFFFFF");
    };

    charting.showTooltip = function (info) {
        if(d3.select("#toolTipBorder")[0]){
            charting.createTooltip();
        }

        var tooltip = d3.select("#toolTipBorder");
        var tooltipContent = d3.select("#toolTip");
        var key;
        var value;

        tooltipContent.html("");
        for (key in info) {
             if (info.hasOwnProperty(key)) {
                value = info[key];
                charting.headerStyle(tooltipContent.append("div").text(key));

                if (value) {
                    if (koTools.isDate(value)) {
                        charting.valueStyle(tooltipContent.append("div").text(value.toFormattedString()));
                    } else {
                        charting.valueStyle(tooltipContent.append("div").text(value));
                    }
                }
            }
        }

          tooltip.transition()
              .duration(200)
              .style("opacity", ".9");

          tooltip.style("left", (d3.event.pageX + 15) + "px")
              .style("top", (d3.event.pageY - 75) + "px");
    };

    charting.hideTooltip = function () {
        var toolTip = d3.select("#toolTipBorder");
        toolTip.transition()
            .duration(300)
            .style("opacity", "0");
    };

    charting.createTooltip = function () {
        var tooltip = d3.select("body")
            .append("div");

        tooltip
            .attr("id", "toolTipBorder")
            .style("width", "150px")
            .style("position", "absolute")
            .style("opacity", 0)
            .style("background-color", "#111111")
            .style("border-radius", "6px")
            .append("div")
            .attr("id", "toolTip")
            .style("margin", "10px")
            .style("z-index", 100000);
    };

    charting.getDimensions = function (options, el, legenKeys) {
        if (options.fillParentController) {
            options.width = koTools.getWidth(el);
            options.height = d3.max([koTools.getHeight(el), options.height]);
        }
        var dims = {};
        dims.margin = { top: 20, right: options.right || 60, bottom: 30 , left: options.left || 50 };
        dims.width = options.width || 200;
        dims.height = options.height || 100;
        if(options.xAxisTextAngle){
            dims.margin.bottom = options.xAxisTextAngle*40/90 + dims.margin.bottom;
        }
        dims.containerHeight = dims.height + dims.margin.top + dims.margin.bottom;
        dims.containerWidth = dims.width + dims.margin.left + dims.margin.right;
        if (options.legend) {
            dims.containerWidth += charting.getLegendWidth(legenKeys);
        }

        if(options.horizontalSlider){
           var sliderSpace = 25;
            dims.sliderHeight = 20;
            dims.containerHeight = dims.height + dims.sliderHeight + sliderSpace + 25;
            dims.sliderOffset = dims.height + sliderSpace;
        }
        return dims;
    };

    charting.appendContainer = function (el, dims) {
        var svg = el.append("svg")
        .attr("width", dims.containerWidth)
        .attr("height", dims.containerHeight)
      .append("g")
        .attr("transform", "translate(" + dims.margin.left + "," + dims.margin.top + ")");
        return svg;
    };

    charting.createXAxis = function (svg,options,x,dims) {
        var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

        if (options.xUnitFormat){
            xAxis.tickFormat(options.xUnitFormat);
        }

        if (options.tickValues){
            xAxis.tickValues(options.tickValues);
        }

        var axis = svg.append("g")
            .attr("transform", "translate(0," + dims.height + ")")
            .call(xAxis);

        charting.xAxisStyle(axis);

        if (options.xAxisTextAngle) {
            axis.selectAll("text")
                .attr("y", 0)
                .attr("x", 9)
                .attr("dy", ".35em")
                .attr("transform", "rotate(" + options.xAxisTextAngle + ")")
                .style("text-anchor", "start");
        }

        if (options.xAxisLabel) {
            svg.append("text")
                .style("font-size", "15px")
                .attr("class", "x label")
                .attr("text-anchor", "end")
                .attr("x", dims.width)
                .attr("y", dims.height + 40)
                .text(options.xAxisLabel);
        }
        return xAxis;
    };

    charting.yAxisStyle = function(el){
        el.select("path").style("display","none");
        el.selectAll(".major").style("shape-rendering","crispEdges").style("stroke","#000");
        el.selectAll(".minor").style("stroke","#777").style("stroke-dasharray","2.2");
    };

    charting.xAxisStyle = function(el){
        el.select("path").style("display","none");
        el.select("line").style("shape-rendering","crispEdges").style("stroke","#000");
        el.selectAll("line").style("stroke","#000");
        return el;
    };

    charting.createYAxis = function (svg, options, yScale, dims) {
        var yAxis = d3.svg.axis().scale(yScale).tickSize(dims.width).orient("right");

        var axis = svg.append("g").call(yAxis);

        axis.selectAll("g").filter(function(d) {
            return d;
        }).classed("minor", true);

        axis.selectAll("g").filter(function(d) {
            return d === 0 || d === yScale.domain()[0];
        }).classed("major", true);

        charting.yAxisStyle(axis);

        if (options.yAxisLabel) {
            svg.append("text")
                .attr("class", "y label")
                .attr("text-anchor", "end")
                .attr("y", 6)
                .attr("dy", ".75em")
                .style("font-size", "15px")
                .text(options.yAxisLabel)
                .attr("transform", "translate(" + dims.width + "," + 40 + ")rotate(-90)");
        }
        return yAxis;
    };

    charting.determineXScale = function (data, def,options) {
        if (!def) {
            def = {
                allNumbers: true,
                allDates: true,
                min: Number.MAX_VALUE,
                max: Number.MIN_VALUE,
                xKeys:[]
            };
        }

        var newKeys = data.map(function (v) {
            if (!koTools.isNumber(v)){
                def.allNumbers = false;
            }
            if (!koTools.isDate(v)){
                def.allDates = false;
            }
            if (v < def.min){
                def.min = v;
            }
            if (v > def.max){
                def.max = v;
            }
            return v;
        });

        def.xKeys = def.xKeys.concat(newKeys);
        def.scaleType = def.allNumbers ? 'linear' : def.allDates ? 'date' : 'ordinal';
        def.xUnitFormat = def.allDates ? koTools.getIdealDateFormat([def.min,def.max]) : null;
        if(!options.xUnitFormat){
            options.xUnitFormat = def.xUnitFormat;
        }

        return def;
    };

    charting.getXScaleForMultiLines = function (data,options) {
        var def = null;
        data.forEach(function(i) {
            def = charting.determineXScale(i.values.map(function(v) {
                return v.x;
            }), def,options);
        });
        return def;
    };

    charting.getYScaleDefForMultiline = function (data,options,filteredDomain){
        var def = null;
        data.forEach(function(i) {
            def = charting.determineYScale(i.values.map(function(v) {
                return v.y;
            }), def,options);
        });
        return def;
    };

    charting.determineYScale = function (data, def,options) {
        if (!def) {
            def = {
                min: Number.MAX_VALUE,
                max: Number.MIN_VALUE
            };
        }

        data.forEach(function(v) {
            if (v < def.min){
                def.min = v;
            }
            if (v > def.max){
                def.max = v;
            }
        });

        //setting up margings. how much more on the bottom and on the top of the chart should be shown
        //bellow or above the max and minimum value - carefull to handle negative max values
        if(options.marginCoef){
            var reversedCoef = - options.marginCoef;
            def.max = def.max > 0 ? def.max * options.marginCoef : def.max * reversedCoef;
            def.min = def.min < 0 ? def.min * options.marginCoef : def.min * reversedCoef;
        }

        //the min and max can also be specified in the options directly
        def.min = options.yMin || def.min;
        def.max = options.yMax || def.max;
        return def;
    };

    //takes the result of determineXScale and creates D3 scale
    charting.getXScaleFromConfig = function (def,dims) {
        var x;

        if (def.scaleType === 'linear') {
            x = d3.scale.linear().range([0, dims.width], 0.1);
            x.domain([def.min, def.max]);
        } else if (def.scaleType === 'ordinal') {
            x = d3.scale.ordinal()
                .rangeRoundBands([0, dims.width], 0.1);
            x.domain(def.xKeys);
        } else if (def.scaleType === 'date') {
            x = d3.time.scale().range([0, dims.width], 0.1);
            x.domain([def.min, def.max]);
            x.ticks(10);
        } else {
            throw "invalid scale type";
        }
        return x;
    };

    charting.xGetter = function (scaleDef, x) {
        return function(d) {
            if (scaleDef.scaleType === 'ordinal'){
                return x(d) + x.rangeBand() / 2;
            }
            if (scaleDef.scaleType === 'date' || scaleDef.scaleType === 'linear'){
                return x(d);
            }
            throw "invalid Scale Type";
        };
    };

    charting.createVerticalLine = function (svg,x,y){
      return svg.append("line")
          .attr("x1",x)
          .attr("y1", 0)
          .attr("x2", x)
          .attr("y2", y)
          .attr("stroke-width", 2)
          .attr("stroke", "black");
    };

    charting.mouseCoordinates = function (context,x,y){
      var coordinates = d3.mouse(context);
      return {
          x : coordinates[0],
          y : coordinates[1],
          rY: y.invert(coordinates[1]),
          rX: x.invert(coordinates[0])
      };
    };

    charting.moveLine = function(line, x){
      var current = line.attr("x1");
      var trans = x - current;
      line.attr("transform", "translate(" + trans + ",0)");
    };

    charting.createMouseMoveListener = function(svg,dims,callback){
      svg.append("rect")
        .attr("class", "overlay")
        .attr("width", dims.width)
        .attr("height", dims.height)
        .style("fill","none")
        .style("pointer-events","all")
        .on("mousemove", callback);
    };

    charting.createOrMoveVerticalLine = function(line,svg,dims,x){
      if (!line) {
          return charting.createVerticalLine(svg,x,dims.height);
      }

      charting.moveLine(line,x);
      return line;
    };

    return charting;
});


define('KoExtensions/Charts/barchart',['d3','./../charting','./../kotools'], function (d3,charting,koTools) {
    //accepts and array of objects. one property of each object is used as the x-coordinate
    //(determined by the xcoord option, which by default is set to 'x')
    //the rest of the properties is stacked to the chart
    charting.barChart = function (data, element, options, lineData) {
        var el = charting.getElementAndCheckData(element, data);
        if (!el){
            return;
        }

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

        // not all the items do have the same set of properties, therefor scan them all and concatenate the result
        var keys = [];
        data.map(function (i) {
            var itemKeys = d3.keys(i).filter(function (key) { return key !== xcoord && keys.indexOf(key) < 0; });
            keys = keys.concat(itemKeys);
        });

        //we need color for each possible variable
        var color = charting.colors.domain(keys);

        var dims = charting.getDimensions(options, el,keys);

        var xKeys = data.map(function(d){return d[xcoord];});
        var scaleDef = charting.determineXScale(xKeys,null,options);

        var x = d3.scale.ordinal()
            .rangeRoundBands([0, dims.width], 0.3);

        var y = d3.scale.linear()
            .rangeRound([dims.height, 0]);

        //runs overs all the data. copies the result to a new array.
        //for each item we need y0 and y1 - are the y coordinates of the rectangle
        //it is bit tricky to have a something that works for stacked and grouped chart
        var arranged = [];
        var arrangedByX = {};
        data.forEach(function (d) {
            var newD = { x: d[xcoord] };
            var y0Neg = 0;
            var y0Pos = 0;


            var values = [];
            color.domain().forEach(function (m) {
                if (!koTools.isNumber(d[m]) || d[m] === 0 || d[m] === null){
                    return;
                }
                var xLabel = newD.x;
                if (options.xUnitFormat){
                    xLabel = options.xUnitFormat(newD.x);
                }
                var formattedValue = d[m];
                if (options.unitTransform){
                    formattedValue = options.unitTransform(d[m]);
                }

                var value = {
                    name:m,
                    val: d[m],
                    x: newD.x,
                    xLabel: xLabel,
                    xUnitName: options.xUnitName,
                    formattedValue: formattedValue
                };

                if (d[m] > 0 && options.style === "stack") {
                    value.y0 = y0Pos;
                    value.y1 = y0Pos += +d[m];
                } else if (d[m] < 0 && options.style === "stack"){
                    var y1 = y0Neg;
                    value.y0 = y0Neg += d[m];
                    value.y1 =  y1;
                } else if (d[m] > 0 && options.style !== "stack"){
                    value.y0 = 0;
                    value.y1 = d[m];
                } else if(d[m] < 0 && options.style !== "stack"){
                    value.y0 = d[m];
                    value.y1 = 0;
                }
                values.push(value);
            });

            newD.values = values;
            newD.totalPositive = d3.max(newD.values, function (v) { return v.y1; });
            newD.totalNegative = d3.min(newD.values, function (v) { return v.y0; });
            arranged.push(newD);
            arrangedByX[newD.x] = newD;
        });

        charting.showStandardLegend(el, keys,color, options.legend, dims.height);

        var svg = charting.appendContainer(el, dims);

        x.domain(xKeys);
        if (options.style === "stack") {
            y.domain([
                d3.min(arranged, function (d) {
                  return d.totalNegative;
                }), d3.max(arranged, function (d) {
                    if (!d){
                        return 0;
                    }
                    return d.totalPositive;
                })
            ]);
        } else {
            y.domain(
            [
                d3.min(arranged, function (d) {
                    return d3.min(d.values,
                        function (i) {
                            if (i.val < 0){
                                return i.val;
                            }
                            return 0;
                        });
                }),
                d3.max(arranged, function (d) {
                    return d3.max(d.values,
                        function (i) { return i.val; });
                })
            ]);
        }

        //for the groupped chart
        var x1 = d3.scale.ordinal();
        x1.domain(keys).rangeRoundBands([0, x.rangeBand()]);

        charting.createXAxis(svg, options, x, dims);
        charting.createYAxis(svg, options, y, dims);


        var onBarOver = function (d) {
            var column = arrangedByX[d.x];
            d3.select(this).style("opacity", 1);
            var info = {};
            info[options.xUnitName] = d.xLabel;
            info[d.name] = d.formattedValue;
            if (column.totalNegative === 0){
                info[d.name] += " (" + koTools.toPercent(d.val / column.totalPositive) + ")";
            }
            charting.showTooltip(info);
        };

        var onPointOver = function (d) {
            d3.select(this).style("fill", "blue");
            var info = {};
            var xName = koTools.isDate(d.x) ? d.x.toFormattedString() : d.x;
            info[xName] = d.y;
            charting.showTooltip(info);
        };

        var onPointOut = function () {
            d3.select(this).style("fill", "white");
            charting.hideTooltip();
        };

        var onBarOut = function () {
            d3.select(this).style("stroke", 'none');
            d3.select(this).style("opacity", 0.9);
            charting.hideTooltip();
        };

        var group = svg.selectAll(".xVal")
            .data(arranged)
            .enter().append("g")
            .attr("class", "g")
            .attr("transform", function (d) { return "translate(" + x(d.x) + ",0)"; });

        var rectangles = group.selectAll("rect")
            .data(function (d) { return d.values; })
            .enter().append("rect");

        if (options.style === "stack") {
            rectangles.attr("width", x.rangeBand());
        } else {
            rectangles.attr("width", x1.rangeBand())
              .attr("x", function (d) {
                  return x1(d.name);
              });
        }

        rectangles.attr("y", function (d) {
          return y(d.y1);
        })
        .attr("height", function (d) {
          var height = Math.abs(y(d.y0) - y(d.y1));
          return height;
        })
        .on("mouseover", onBarOver)
        .on("mouseout", onBarOut)
        .style("opacity", 0.9)
        .style("cursor", "pointer")
        .style("fill", function (d) {
            return color(d.name);
        });

        //Add the single line
        if (!lineData || lineData.length === 0){
            return;
        }

        var lineY = d3.scale.linear()
            .range([dims.height, 0]);

        var line = d3.svg.line()
            .interpolate("linear")
            .x(function (d) {
                return x(d.x) + x.rangeBand() / 2;
            })
            .y(function (d) {
                return lineY(d.y);
            });

        //in some cases it makes sense to use the same scale for both
        //typically the cash-flow chart
        //for other cases (line  volumne / units correlations a separate scale should be used for each)
        if (!options.sameScaleLinesAndBars) {
            lineY.domain([
                0,
                d3.max(lineData, function (v) { return v.y; })
            ]);
        } else {
            lineY.domain(y.domain());
        }

        var yAxisLeft = d3.svg.axis()
           .scale(lineY)
           .orient("left");

        var leftAxis = svg.append("g")
           .call(yAxisLeft);

        charting.yAxisStyle(leftAxis);

        svg.append("path")
            .attr("d", line(lineData))
            .style("stroke", "blue")
            .style("stroke-width", 2)
            .style("fill", "none");

        var circles = svg.selectAll("circle")
            .data(lineData)
            .enter()
            .append("circle");

        circles.attr("cx", function (d) { return x(d.x) + x.rangeBand() / 2; })
            .attr("cy", function (d) { return lineY(d.y); })
            .attr("r", function () { return 4; })
            .style("fill", "white")
            .style("stroke-width", 2)
            .style("stroke", "blue")
            .style("cursor", "pointer")
            .on("mouseover", onPointOver)
            .on("mouseout", onPointOut);
    };
});


define('KoExtensions/Charts/piechart',['d3','./../charting','./../kotools'], function (d3,charting,koTools) {
    //Takes as input collection of items [data]. Each item has two values [x] and [y].
    //x is the label and y the value which determines the size of the slice of the pie chart.
    charting.pieChart = function(data, element,options) {
        var el = charting.getElementAndCheckData(element, data);
        if (!el) {
            return;
        }

        var defaultOptions = {
            legend: true,
            width: 200,
            height: 150,
            left: 3,
            right:3
        };

        options = koTools.setDefaultOptions(defaultOptions, options);

        //for a piechart only positive values make sense
        data = data.filter(function (i) {
            return i.y > 0;
        });

        if (data.length === 0){
            return;
        }

        var color = options.colors || charting.colors;
        var xKeys = data.map(function (i) { return i.x; });

        //the color scale can be passed from outside...
        if(!options.colors){
            color.domain(xKeys);
        }
        var dims = charting.getDimensions(options, el, xKeys);

        var outerRadius = Math.min(dims.width, dims.height) / 2 - 3;
        var donut = d3.layout.pie();
        var arc = d3.svg.arc().outerRadius(outerRadius);
        var labelRadius = outerRadius-30;
        var labelArc = d3.svg.arc().outerRadius(labelRadius).innerRadius(labelRadius);

        donut.value(function (d) { return d.y; });
        var sum = d3.sum(data, function (item) { return item.y; });

        //piechart shows the values in the legend as well
        //that's why it passes the whole data collection and both, description and value function provider
        charting.showStandardLegend(el, xKeys, color, options.legend, dims.height);
        var svg = charting.appendContainer(el, dims);
        svg.data([data]);

        var arcs = svg.selectAll("g.arc")
            .data(donut)
          .enter().append("g")
            .attr("class", "arc")
            .attr("transform", "translate(" + outerRadius + "," + outerRadius + ")");

        var arcMouseOver = function(d) {
            d3.select(this).style("stroke", 'white');
            d3.select(this).style("opacity", 1);
            var info = {};
            var value = d.formatted + " (" + koTools.toPercent(d.percentage) + ")";
            info[d.data.x] = value;
            charting.showTooltip(info);
        };

        var arcMouseOut = function() {
            d3.select(this).style("opacity", 0.9);
            charting.hideTooltip();
        };

        arcs.append("path")
            .attr("d", arc)
            .style("fill", function(d) { return color(d.data.x); })
            .style("stroke-width", 2)
            .style("stroke", "white")
            .on("mouseover", arcMouseOver)
            .on("mouseout", arcMouseOut)
            .style("cursor", "pointer")
            .style("opacity",0.9)
            .each(function(d) {
                d.percentage = d.data.y / sum;
                d.formatted = options.unitTransform ? options.unitTransform(d.data.y) : d.data.y;
            });

        arcs.append("text")
            .attr("transform", function(d) {
                return "translate(" + labelArc.centroid(d) + ")";
            })
            .style("font-family", "sans-serif")
            .style("font-size", 12)
            .style("fill", "#FFFFFF")
            .style("font-weight", "bold")
            .style("text-anchor", "middle")
            //.attr("dy", ".35em")
            .text(function(d) {
                return (d.percentage*100).toCurrencyString("%",1);
            });
    };
});


define('KoExtensions/Charts/linechart',['d3','./../charting','./../kotools'], function (d3,charting,koTools) {

    //Takes as input collection of items [data]. Each item has two values [x] and [y].
    //[{x:1, receivedEtf:123, tradedEtf:100},{x:2, receivedEtf:200, tradedEtf:100}]
    //[{linename:receivedEtf, values:[x:q1, y:200]}]
    charting.lineChart = function (data, element, options) {
        var el = charting.getElementAndCheckData(element, data);
        if (!el)
            return;

        var defaultOptions = {
            legend: true,
            width: 200,
            height: 200,
            horizontalLabel: 'x',
            verticalLabel: 'y',
            showDataPoints: true,
            verticalCursorLine: false,
            xAxisLabel: false,
            yAxisLabel: false,
            xAxisTextAngle: null
        };

        options = koTools.setDefaultOptions(defaultOptions, options);

        if (options.normalizeSeries) {
            data = koTools.normalizeSeries(data);
        }

        data.forEach(function (singleLine) {
            if (!singleLine.values)
                throw "Each line needs to have values property containing tuples of x and y values";
            //sort each line using the x coordinate
            singleLine.values.sort(function (a, b) {
                if (a.x > b.x) return 1;
                if (a.x < b.x) return -1;
                return 0;
            });

            singleLine.values.forEach(function(d){
              d.linename = singleLine.linename;
            });
        });

        //define all the linenames to compute thed legen width approximation
        var linenames = data.map(function (item) { return item.linename; });

        //we need also one color per linename
        var color = d3.scale.category20();
        color.domain(linenames);

        //and helper function to get the color
        var getColor = function (l) {
            return l.color ? l.color : color(l.linename);
        };

        var dims = charting.getDimensions(options, el, linenames);

        var y = d3.scale.linear()
          .range([dims.height, 0]);

        var scaleDef = charting.getXScaleForMultiLines(data,options);
        var x = charting.getXScaleFromConfig(scaleDef, dims);
        var getX = function(d) {
            return charting.xGetter(scaleDef, x)(d.x);
        };

        var yScaleDef = charting.getYScaleDefForMultiline(data,options);

        y.domain([yScaleDef.min, yScaleDef.max]);

        var line = d3.svg.line()
          .interpolate("linear")
          .x(getX)
          .y(function (d) { return y(d.y); });

        var svg = charting.appendContainer(el, dims);

        charting.showStandardLegend(el, linenames, color, options.legend, dims.height);

        if (options.xTick) {
            var xValues = scaleDef.xKeys.filter(function (k) {
                return k % options.xTick === 0;
            });
            options.tickValues = xValues;
        }
        var xAxis = charting.createXAxis(svg, options, x, dims);
        var yAxis = charting.createYAxis(svg, options, y, dims);

        //howering over a line will just show a tooltip with line name
        var lineMouseOver = function(d) {
            var info = {};
            info.line = d.linename;
            charting.showTooltip(info);
        };

        var lines = svg.selectAll(".lines")
            .data(data)
            .enter()
            .append("path")
            .attr("class", "line")
            .attr("d", function(d) {
                return line(d.values);
            })
            .style("stroke-width", function(d) {
                return d.width ? d.width : 2;
            })
            .style("stroke", function(d) {
                return getColor(d);
            })
            .style("fill", "none")
            .on("mouseover", lineMouseOver)
            .on("mouseout", charting.hideTooltip);

        if (options.showDataPoints) {
            var spMouseOut = function () {
                d3.select(this).style("fill", "white");
                charting.hideTooltip();
            };

            var spMouseOver = function (d) {
                var xLabel = d.xLabel ? d.xLabel : d.x;
                var info = {};
                info[options.horizontalLabel] = xLabel;
                info[d.linename] = d.y;
                charting.showTooltip(info);
                d3.select(this).style("fill", "black");
            };

            var allPoints = data.length == 1 ? data[0].values : data.reduce(function(a,b){return a.values.concat(b.values);});

            var points = svg.selectAll(".point")
                .data(allPoints)
                .enter()
                .append("circle")
                .attr("cx", getX)
                .attr("cy", function (d) { return y(d.y); })
                .attr("r", function () { return 4; })
                .style("fill", "white")
                .style("stroke-width", "2")
                .style("stroke", function (d) { return "black"; })
                .style("cursor", "pointer")
                .on("mouseover", spMouseOver)
                .on("click", spMouseOver)
                .on("mouseout", spMouseOut);
            }

            if (options.verticalCursorLine) {
                var vLine = null;
                var lastMove = new Date();

                var cursorLineMove = function () {
                    var now = new Date();
                    if (now - lastMove < 100)
                        return;
                    lastMove = now;
                    var coord = charting.mouseCoordinates(this,x,y);
                    vLine = charting.createOrMoveVerticalLine(vLine,svg,dims,coord.x);
                    var info = {
                      x:coord.rX,
                      y:coord.rY
                    };
                    charting.showTooltip(info);
                };
                charting.createMouseMoveListener(svg,dims,cursorLineMove);
            }

            if(options.horizontalSlider){
                var context = svg.append("g")
                  .attr("transform", "translate(" + 0 + "," + dims.sliderOffset + ")")
                  .attr("class", "context");

                var slidderScale = charting.getXScaleFromConfig(scaleDef,dims);

                var allTicks = x.ticks();
                var startMin = allTicks[2];
                var startMax = allTicks[7];

                var brush = d3.svg.brush()//for slider bar at the bottom
                   .x(slidderScale)
                   .extent([startMin,startMax])
                   .on("brush", brushed);

                var sliderAxis = d3.svg.axis() // xAxis for brush slider
                   .scale(slidderScale)
                   .orient("bottom");


                context.append("g") // Create brushing xAxis
                   .attr("class", "x axis")
                   .attr("transform", "translate(0," + dims.sliderHeight + ")")
                   .call(sliderAxis);

                var contextArea = d3.svg.area() // Set attributes for area chart in brushing context graph
                 .interpolate("monotone")
                 .x(function(d) { return slidderScale(d.x); }) // x is scaled to xScale2
                 .y0(dims.sliderHeight) // Bottom line begins at height2 (area chart not inverted)
                 .y1(0); // Top line of area, 0 (area chart not inverted)

               //plot the rect as the bar at the bottom
               context.append("path") // Path is created using svg.area details
                 .attr("class", "area")
                 .attr("d", contextArea(data[0].values)) // pass first categories data .values to area path generator
                 .attr("fill", "#F1F1F2");

               //append the brush for the selection of subsection
               context.append("g")
                 .attr("class", "x brush")
                 .call(brush)
                 .selectAll("rect")
                 .attr("height", dims.sliderHeight) // Make brush rects same height
                 .attr("fill", "#1f77b4")
                 .attr("rx", "5");


                   //for brusher of the slider bar at the bottom
                  function brushed() {

                    var filteredDomain = brush.empty() ? x.domain() : brush.extent();
                    x.domain(filteredDomain); // If brush is empty then reset the Xscale domain to default, if not then make it the brush extent

                    svg.select(".x.axis") // replot xAxis with transition when brush used
                          .transition()
                          .call(xAxis);

                    var yScaleDef = charting.getYScaleDefForMultiline(data,options,filteredDomain);
                    y.domain([yScaleDef.min,yScaleDef.max]); // Redefine yAxis domain based on highest y value of categories data with "visible"; true

                    svg.select(".y.axis") // Redraw yAxis
                      .transition()
                      .call(yAxis);

                    lines.transition()
                      .attr("d", function(d){
                          return line(d.values);
                      });

                      if(points){
                        points.transition()
                          .attr("cx", getX)
                          .attr("cy", function (d) { return y(d.y); });
                      }
                  }
            }

    };
});


define('KoExtensions/Charts/histogramchart',['d3','./../charting', './../kotools'], function (d3,charting, koTools) {
    charting.histogram = function(data, element, options) {
        var defaultOptions = {
            bins: 80,
            width: 500,
            fillParentController:false,
            histogramType: 'frequency',
            rangeRounding: 2
        };

        var el = charting.getElementAndCheckData(element,data);
        if (el == null)
            return;

        options = koTools.setDefaultOptions(defaultOptions, options);
        var dims = charting.getDimensions(options,el);

        var histogramData = d3.layout.histogram()
            .frequency(options.histogramType === 'frequency')
            .bins(options.bins)(data);

        var minX = koTools.isValidNumber(options.min) ? options.min : d3.min(histogramData, function (d) { return d.x; });

        var x = d3.scale.linear()
            .domain([
                minX,
                d3.max(histogramData, function(d) { return d.x; })
            ])
            .range([0, dims.width-10]);
        var columnWidth = x(minX + histogramData[0].dx) - 1;

        var y = d3.scale.linear()
            .domain([0, d3.max(histogramData, function(d) { return d.y; })])
            .range([dims.height, 0]);

        var svg = charting.appendContainer(el, dims);

        var bar = svg.selectAll(".bar")
            .data(histogramData)
          .enter().append("g")
            .attr("class", "bar")
            .attr("transform", function (d) {
                return "translate(" + x(d.x) + "," + y(d.y) + ")";
            });


        var onBarOver = function (d) {
            d3.select(this).style("opacity", 1);
            var header = options.histogramType == "frequency" ? "count": "probability";
            var info = {};
            info[header] = d.y;
            info["range"] = d.x.toFixed(options.rangeRounding) + " - " + (d.x+d.dx).toFixed(options.rangeRounding);
            charting.showTooltip(info);
        };

        var onBarOut = function () {
            charting.hideTooltip();
            d3.select(this).style("opacity", 0.8);
        };

        bar.append("rect")
            .attr("x", 1)
            .attr("width",columnWidth)
            .attr("height", function(d) {
                return dims.height - y(d.y);
            })
            .attr("fill","#1f77b4")
            .attr("opacity",0.8)
            .style("cursor", "pointer")
            .on("mouseover",onBarOver)
            .on("mouseout",onBarOut);

        charting.createXAxis(svg,options,x,dims);
        charting.createYAxis(svg, options, y, dims);

        var line = d3.svg.line()
            .interpolate("linear")
            .x(function (d) { return x(d.x) + x.rangeBand() / 2; })
            .y(function (d) { return y(d.y); });

        if(options.showProbabilityDistribution){

            var min = koTools.isValidNumber(options.min) ? options.min : d3.min(data);
            var max = koTools.isValidNumber(options.max) ? options.max : d3.max(data);
            var total = d3.sum(data);

            var step = (max - min)/500;
            var expected = total / data.length;
            if(options.expected == 'median'){
                expected = d3.median(data);
            }

            var variance = 0;
            var distances = [];
            data.forEach(function(val){
                var dist = val - expected;
                distances.push(Math.abs(dist));
                variance+= dist*dist;
            });


            if(options.useMAD){
                variance = d3.median(distances);
            }else{
                variance= variance / data.length-1;
            }

            var i = 0;
            var probData = [];
            for (i = min;i<max;i+=step) {
                var powE = -(i-expected)*(i-expected)/(2*variance);
                var prob = (1 / Math.sqrt(2*Math.PI*variance)) * Math.pow(Math.E,powE);
                probData.push({x:i, y:prob});
            }

            var y = d3.scale.linear()
              .range([dims.height, 0]);

            y.domain([
                d3.min(probData,function(d){return d.y;}),
                d3.max(probData, function(d) { return d.y; })
            ]);

            var minX =d3.min(probData,function(i){return i.x;});
            var maxX =d3.max(probData, function(i) { return i.x; });

            x.domain([
                minX,
                maxX
            ]);

            var lineFunction = d3.svg.line()
              .interpolate("linear")
              .x(function(d) {
                  return x(d.x);
              })
              .y(function(d) {
                  return y(d.y);
              });

            svg.append("path")
              .attr("class", "line")
              .attr("d", lineFunction(probData))
              .style("stroke-width", 2)
              .style("stroke", "red")
              .style("fill", "none");

            if(options.showOutliers){
                data.forEach(function(el){
                    var elDist = Math.abs(el - expected);

                    if (elDist > variance * options.tolerance) {
                        svg.append("circle")
                            .attr("cx", x(el) + 2)
                            .attr("cy", dims.height)
                            .attr("r", 4)
                            .attr("fill", "green")
                            .attr("opacity", 0.8);
                    }
                });
            }
        }
    }
});


define('KoExtensions/Charts/scatterplot',['d3','./../charting','./../kotools'], function (d3,charting,koTools) {
    charting.scatterPlot = function (data, element, options) {
        var defaultOptions = {
            width: 500
        };

        var el = charting.getElementAndCheckData(element, data);
        if (el == null)
            return;

        options = koTools.setDefaultOptions(defaultOptions, options);
        var dims = charting.getDimensions(options, el);

        var color = d3.scale.category20();

        var xKeys = data.map(function (i) { return i.x; });
        var yKeys = data.map(function (i) { return i.y; });

        var xScaleDef = charting.determineXScale(xKeys, null, options);
        var xScale = charting.getXScaleFromConfig(xScaleDef,dims);
        var yScaleDef = charting.determineYScale(yKeys, null, options);
        var yScale = d3.scale.linear().domain([yScaleDef.min, yScaleDef.max]).range([dims.height, 0]);


        var svg = charting.appendContainer(el, dims);
        charting.showStandardLegend(el, xKeys, color, options.legend, dims.height);
        charting.createXAxis(svg, options, xScale, dims);
        charting.createYAxis(svg, options, yScale, dims);

        var point = svg.selectAll(".point")
            .data(data)
            .enter().append("g");

        point.append("circle")
             .attr("cx", function (d) {
                 return xScale(d.x);
             })
            .attr("cy", function (d) { return yScale(d.y); })
            .attr("r", function () { return 4; })
            .style("fill", "white")
            .style("stroke-width", "2")
            .style("stroke", "black")
            .style("cursor", "pointer");
    }
});


define('KoExtensions/Charts/chordchart',['d3','./../charting', './../kotools'], function(d3,charting, koTools) {
    charting.chordChart = function(data, element, options) {

        var el = charting.getElementAndCheckData(element, data);
        if (!el){
            return;
        }

        var defaultOptions = {
            width: 800,
            height: 800,
            fillParentController:false,
        };

        options = koTools.setDefaultOptions(defaultOptions, options);
        var dims = charting.getDimensions(options, el, null);
        var outerRadius = Math.min(dims.width, dims.height) / 2 - 100;
        var innerRadius = outerRadius - 24;

        //get the name of the item by id
        var descGetter = function (item) {
            if(options.hideNames){
                return item.index + 1;
            }
            return data.names[item.index];
        };

        var color = charting.colors;

        var arc = d3.svg.arc()
            .innerRadius(innerRadius)
            .outerRadius(outerRadius);

        var layout = d3.layout.chord()
            .padding(0.04);

        var path = d3.svg.chord()
            .radius(innerRadius);

        var svg = el.append("svg")
            .attr("width", dims.width)
            .attr("height", dims.height)
            .append("g")
            .attr("id", "circle")
            .attr("transform", "translate(" + dims.width / 2 + "," + dims.height / 2 + ")");

        var chord_mouse_over = function (g, i) {
            var a1 = data.names[g.source.index];
            var a2 = data.names[g.source.subindex];
            var title = a1 + " - " + a2;
            var info = {};
            info[title] = g.source.value;

            //get all except this chord and put it in background
            svg.selectAll(".chord")
                .filter(function (d, index) {
                    return i !== index;
                })
                .transition()
                .style("opacity", 0.1);

            charting.showTooltip(info);
        };

        var chord_mouse_out = function (g, i) {
            svg.selectAll(".chord")
                .transition()
                .style("opacity", 1);

            charting.hideTooltip();
        };

        var fade = function(opacity) {
            return function (g, i) {
                svg.selectAll(".chord")
                    .filter(function (d) {
                        return d.target.index !== i && d.source.index !== i;
                    })
                    .transition()
                    .style("opacity", opacity);

                var info = {};
                info[descGetter(g)] = g.value;
                charting.showTooltip(info);
            };
        };

        layout.matrix(data.matrix);
        var group = svg.selectAll(".group")
            .data(layout.groups)
            .enter().append("g")
            .attr("class", "group");


        group.append("path")
            .attr("id", function(d, i) { return "group" + i; })
            .attr("d", arc)
            .style("fill", function(d, i) { return color(i); })
            .on("mouseover", fade(0.1))
            .on("mouseout", fade(1));

        group.append("text")
            .each(function(d) { d.angle = (d.startAngle + d.endAngle) / 2; })
            .attr("dy", ".35em")
            .attr("transform", function(d) {
                return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")" +
                "translate(" + (innerRadius + 26) + ")" +
                (d.angle > Math.PI ? "rotate(180)" : "");
            })
            .style("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
            .attr("font-family", "Open Sans, sans-serif")
            .style("font-size", "13px")
            .text(descGetter);

        // Add the chords.
        svg.selectAll(".chord")
            .data(layout.chords)
            .enter().append("path")
            .attr("class", "chord")
            .style("fill", function(d) { return color(d.source.index); })
            .attr("d", path)
            .on("mouseover", chord_mouse_over)
            .on("mouseout", chord_mouse_out);
    };
});


define('KoExtensions/Charts/bubblechart',['d3','./../charting','./../kotools'], function (d3,charting,koTools) {
    charting.bubbleChart = function (data, element, options) {
        var el = charting.getElementAndCheckData(element, data);
        if (!el)
            return;

        var defaultOptions = {
            legend: true,
            width: 500,
            height: 200,
            maxBubbleSize: 50,
            bubbleHorizontal: function(d) { return d.x; },
            bubbleVertical: function(d) { return d.y; },
            bubbleSize: function(d) { return d.size; },
            bubbleColor: function(d) { return d.color; },
            horizontalLabel: 'x',
            verticalLabel: 'y',
            sizeLabel: 'size',
            typeLabel: 'type',
            xAxisLabel: false,
            yAxisLabel: false,
            xAxisTextAngle: null
        };

        options = koTools.setDefaultOptions(defaultOptions, options);

        // get all the names for the legend (that will be represented by the color of each bull)
        var keys = data.map(options.bubbleColor);

        var dims = charting.getDimensions(options, el, keys);
        var horizontalValues = data.map(options.bubbleHorizontal);
        var verticalValues = data.map(options.bubbleVertical);

        var bubbleSizes = data.map(options.bubbleSize);
        bubbleSizes.sort(d3.ascending);

        var maxBubbleSize = d3.max(bubbleSizes);
        var minBubbleSize = d3.min(bubbleSizes);

        var xScaleDef = charting.determineXScale(horizontalValues, null, options);
        var xScale = charting.getXScaleFromConfig(xScaleDef,dims);
        var yScaleDef = charting.determineYScale(verticalValues, null, options);
        var yScale = d3.scale.linear().domain([yScaleDef.min, yScaleDef.max]).range([dims.height, 0]);
        var radiusScale = d3.scale.pow().exponent(0.4).domain([minBubbleSize, maxBubbleSize]).range([1, options.maxBubbleSize]).clamp(true);

        var colors = koTools.distinct(data, options.bubbleColor);
        var colorScale = charting.colors.domain(colors);

        charting.showStandardLegend(el, colors, colorScale, options.legend, dims.height);
        var svg = charting.appendContainer(el, dims);

        charting.createXAxis(svg, options, xScale, dims);
        charting.createYAxis(svg, options, yScale, dims);

        var bubblenodeMouseout = function () {
            d3.select(this).style("opacity", 0.8);
            charting.hideTooltip();
        };

        var bubblenodeMouseover = function (d) {
            d3.select(this).style("opacity", 1);
            var info = {};
            info[options.typeLabel] = options.bubbleColor(d);
            info[options.sizeLabel] = options.bubbleSize(d);
            info[options.verticalLabel] = options.bubbleVertical(d);
            info[options.horizontalLabel] = options.bubbleHorizontal(d);

            charting.showTooltip(info);
        };

        var xGetter = charting.xGetter(xScaleDef, xScale);

        svg.append("g")
            .attr("class", "dots")
        .selectAll(".dot")
            .data(data)
        .enter().append("circle")
            .attr("class", "dot")
            .style("fill", function (d) { return colorScale(options.bubbleColor(d)); })
            .style("opacity", 0.8)
            .attr("cx", function (d) { return xGetter(options.bubbleHorizontal(d)); })
            .attr("cy", function (d) { return yScale(options.bubbleVertical(d)); })
            .attr("r", function (d) { return radiusScale(options.bubbleSize(d)); })
            .style("cursor", "pointer")
            .on("mouseover", bubblenodeMouseover)
            .on("click", bubblenodeMouseover)
            .on("mouseout", bubblenodeMouseout);
    };
});

define('KoExtensions/koextensions',['./charting', './kotools', './Charts/barchart', './Charts/piechart', './Charts/linechart', './Charts/histogramchart', './Charts/scatterplot', './Charts/chordchart', './Charts/bubblechart'],
    function (charting, kotools) {
        function koextensions() {
            var self = this;

            //let tools and charting be accesible globaly
            self.tools = kotools;
            self.charting = charting;

            self.registerExtensions = function () {
                if (typeof(ko) === 'undefined') {
                    throw "If you want to use KoExtensions with Knockout, please reference Knockout before calling registerExtensions";
                }

                ko.bindingHandlers.mapbox = {
                    init: function (element,valueAccessor, allBindings) {
                        if (typeof(L) !== 'undefined') {
                            var options = allBindings().mapOptions;
                            var mapBox = L.mapbox.map(element, 'mapbox.streets',options);
                            element._mapBox = mapBox;
                        }
                    },
                    update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
                        if (element._mapBoxLayer) {
                            element._mapBox.removeLayer(element._mapBoxLayer);
                        }

                        var bindings = allBindingsAccessor();
                        var points = bindings.mapbox();

                        if (points && points.length > 0) {
                            var geojson = {
                                type: 'FeatureCollection',
                                features: points.map(function(point) {
                                    var lat = point.lat();
                                    var lng = point.lng();

                                    return {
                                        type: 'Feature',
                                        properties: {
                                            'marker-color': '#f86767',
                                            'marker-size': 'large',
                                            'marker-symbol': 'star'
                                        },
                                        geometry: {
                                            type: 'Point',
                                            coordinates: [lng, lat]
                                        }
                                    };
                                })
                            };

                            element._mapBoxLayer = L.mapbox.featureLayer(geojson);
                            element._mapBoxLayer.addTo(element._mapBox);
                            element._mapBox.fitBounds(element._mapBoxLayer.getBounds());
                        }
                    }
                };

                ko.bindingHandlers.gmap = {
                    init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
                         var gmap = new google.maps.Map(element, {
                            center: {lat: -34.397, lng: 150.644},
                            zoom: 8
                          });

                        element._gmap = gmap;
                    },
                    update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
                        var bindings = allBindingsAccessor();
                        var points = bindings.gmap();
                        var latlngbounds = new google.maps.LatLngBounds(),i = 0;
                        var point;
                        for(i = 0;i<points.length;i++) {
                            point = points[i];
                            var position = new google.maps.LatLng(point.lat(),point.lng());
                            latlngbounds.extend(position);
                            var marker = point._gmarker;
                            if(!marker){
                                marker = new google.maps.Marker({
                                    map:element._gmap,
                                    position: position,
                                    title: name
                                });


                                var listenerFactory = function(point){
                                    return function(){
                                        bindings.markerSelected(point);
                                    };
                                };

                                google.maps.event.addListener(marker, 'click', listenerFactory(point));
                                point._mapMarker = marker;
                            }
                            marker.setPosition(position);
                        }
                        element._gmap.fitBounds(latlngbounds);
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
                        charting.lineChart(data, element, options);
                    }
                };

                ko.bindingHandlers.piechart = {
                    update: function(element, valueAccessor, allBindingsAccessor) {
                        var data = allBindingsAccessor().piechart();
                        var options = allBindingsAccessor().chartOptions;
                        charting.pieChart(data, element, options);
                    }
                };

                ko.bindingHandlers.barchart = {
                    update: function(element, valueAccessor, allBindingsAccessor) {
                        var data = ko.unwrap(valueAccessor());
                        var options = ko.unwrap(allBindingsAccessor().chartOptions);

                        var line = null;
                        if (allBindingsAccessor().line != null)
                            line = allBindingsAccessor().line();
                        charting.barChart(data, element, options, line);
                    }
                };

                ko.bindingHandlers.chordChart = {
                    update: function (element, valueAccessor, allBindingsAccessor) {
                        var data = allBindingsAccessor().chordChart();
                        var options = allBindingsAccessor().chartOptions;
                        charting.chordChart(data, element, options);
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
                        charting.histogram(data, element, options);
                    }
                };

                ko.bindingHandlers.scatterplot = {
                    update: function(element, valueAccessor, allBindingsAccessor) {
                        var data = ko.unwrap(valueAccessor());
                        var options = ko.unwrap(allBindingsAccessor().chartOptions);
                        charting.scatterPlot(data, element, options);
                    }
                };

                ko.bindingHandlers.bubblechart = {
                    update: function(element, valueAccessor, allBindingsAccessor) {
                        var data = ko.unwrap(valueAccessor());
                        var options = ko.unwrap(allBindingsAccessor().chartOptions);
                        charting.bubbleChart(data, element, options);
                    }
                };

                ko.bindingHandlers.formattedValue = {
                    update: function (element, valueAccessor, allBindingsAccessor) {
                        var fValue = getFormattedValueFromAccessor(allBindingsAccessor());
                        applyFormattedValue(fValue, element);
                    }
                }

                ko.bindingHandlers.progress = {
                    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
                        var value = valueAccessor()();
                        if (value == null)
                            value = 0;
                        element.style.width = value + "%";
                        element.style.display = 'none';
                        element.style.display = 'block';
                    },
                    update: function (element, valueAccessor, allBindingsAccessor) {
                        var value = valueAccessor()();
                        if (value == null)
                            value = 0;
                        element.style.width = value + "%";
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
                    } else if (kotools.isDate(fValue.val)) {
                        element.innerHTML = fValue.val.toFormattedString();
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



            function getValue(val) {
                if (val != null && typeof (val) == 'function')
                    val = val();
                return val;
            };
        };

        return new koextensions();
    });


  define("d3",function(){
    return d3;
  })
  var extensions = require('KoExtensions/koextensions');

  //this part is the only one using Knockout and probably shall be left out
	//so that the charting and tools can be used in project without knockout
	extensions.registerExtensions();
	return extensions;
}));
