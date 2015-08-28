"use strict";
define(function () {
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

        Date.prototype.addDays = function (days) {
            var dat = new Date(this.valueOf());
            dat.setDate(dat.getDate() + days);
            return dat;
        }

        self.getQuarter = function(item) {
            if (item.Year != null && item.Quarter != null) {
                return "Q" + item.Quarter + item.Year;
            }
            return null;
        };

        self.getMonth = function(item) {
            if (item.Year != null && item.Month != null) {
                return item.Year + ' ' + item.Month;
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
                config[key] = config[key] != null ? config[key] : defaultConfig[key];
            }
            return config;
        }

    };

    return new KoTools();
});