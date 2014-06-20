var koTools = (function () {
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

        self.getQuarter = function(item) {
            if (item.Year != null && item.Quarter != null) {
                return "Q" + item.Quarter + item.Year;
            }
            return null;
        };

        self.monthsComparer = function(item1, item2) {
            var year1 = parseInt(item1.substring(0, 4));
            var month1 = parseInt(item1.substring(4, item1.length));

            var year2 = parseInt(item2.substring(0, 4));
            var month2 = parseInt(item2.substring(4, item2.length));

            if (year1 == year2) {
                return d3.ascending(month1, month2);
            } else
                return d3.ascending(year1, year2);
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

        var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        self.getYearAndMonthLabel = function(i) {
            if (!isString(i))
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
            if (!isDate(d))
                return false;
            return !isNaN(d.getTime());
        }

        //not efficient comparison of arrays
        self.arraysAreEqual = function(ary1, ary2) {
            if (ary1 == null && ary2 == null)
                return true;
            if (ary1 == null || ary2 != null)
                return false;
            if (ary1 != null && ary2 == null)
                return false;
            if (ary1.length != ary2.length)
                return false;

            if (typeof (ary1[0]) == 'object') {
                for (obj1 in ary1) {
                    var obj2 = ary[2];
                    if (compare(obj1, obj2) == false)
                        return false;
                }
                return true;
            } else {
                return (ary1.join('') == ary2.join(''));
            }
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
            return val * 100;
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
    }

    return new KoTools();
}());