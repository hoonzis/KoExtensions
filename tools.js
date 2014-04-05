var today = new Date();
var day = today.getUTCDate();
var year = today.getFullYear();
var month = today.getMonth();
        
function isEmpty(str) {
    return (!str || 0 === str.length);
}

Date.prototype.toFormattedString = function (){
    
    var cDate = this.getDate();
    var cMonth = this.getMonth() + 1; //Months are zero based
    var cYear = this.getFullYear();
    return cDate + "/" + cMonth + "/" + cYear;
}

/* Sums all elements in the array. The map function is applied on each element to obtain it's value. The predicate is a condition to be added to the sum*/
function sum(kArray, mapfunc,predicate) {
    var total = 0;
    for (var p = 0; p < kArray.length; p++) {
        var el = kArray[p];
        if(predicate==null || predicate(el)){
            if (mapfunc != null)
                total += parseFloat(mapfunc(el));
            else
                total += parseFloat(el);
        }
    }
    return total;
}

function find(data, predicate) {
    for (var i = 0; i < data.length; i++)
        if(predicate(data[i]))
            return data[i];
}

function positiveRounded(d) {
    if (d > 0)
        return Math.round(d);
    return 0;
}

function isString(x){
    return typeof(x) == 'string';
}

function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function isDate(d) {
    return Object.prototype.toString.call(d) == "[object Date]";
}


function parseDate(input) {
    if (input instanceof Date)
        return input;

    var firstSpace = input.indexOf(" ");
    if (firstSpace != -1) {
        input = input.substring(0, firstSpace);
        var parts = input.split('-');
        if (parts.length == 3)
            return new Date(parts[0], parts[1] - 1, parts[2]); // Note: months are 0-based
    } else {
        return new Date(Date.parse(input));
    }
};

//verify that the date is valid => object is date-time and there is a meaningful value
function isValidDate(d) {
  if (!isDate(d))
    return false;
  return !isNaN(d.getTime());
}

//not efficient comparison of arrays
function arraysAreEqual(ary1, ary2) {
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

function compare(x, y) {
    for (var propertyName in x) {
        if (x[propertyName] !== y[propertyName]) {
            return false;
        }
    }
    return true;
}

function toLength(val, length) {
    if(val.length>=length){
        return val.substring(0, length);
    }

    returnVal = "";
    for(var i=0;i<length;i++){
        returnVal += val[i % val.length];
    }
    return returnVal;
}

Number.prototype.toCurrencyString = function (cur, decSpaces) {
    var formatted = this.toFixed(decSpaces).replace(/(\d)(?=(\d{3})+\b)/g, '$1 ');
    if(cur!=null)
        formatted += ' ' + cur;
    return formatted;
}

function toPercent(val) {
    if (val == null)
        return;
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

function setOrAdd(arr, x,y, value){
    if(arr[x] == null)
        arr[x] = [];
    if(arr[x][y] == null || isNaN(arr[x][y]))
        arr[x][y] = value;
    else
        arr[x][y] += value;
}

function set(arr, x,y, value){
    if(arr[x] == null)
        arr[x] = [];
    arr[x][y] = value;
}

function setOrAddSingle(arr, x,value){
    if(arr[x] == null)
        arr[x] = value;
    else
        arr[x] += value;
}

var objToString = Object.prototype.toString;

function isString(obj) {
    return objToString.call(obj) == '[object String]';
}


//returns a dense version of sparse two dimensional matrix
function toDenseMatrix(arr) {
    var deskNames = [];
    var deskIndexes = [];
    var index1 = 0;
    var arrLength = Object.size(arr);

    var resultArr =  Array.apply(null, new Array(arrLength)).map(Number.prototype.valueOf,0);
    for(var id1 in arr){
        var arr2 = arr[id1];
        if(deskIndexes[id1] == null){
            deskNames[index1] = id1;
            deskIndexes[id1] = index1;
            index1++;
        }
        resultArr[deskIndexes[id1]] =  Array.apply(null, new Array(arrLength)).map(Number.prototype.valueOf,0);
        for(id2 in arr2){
            if(deskIndexes[id2] == null){
                deskNames[index1] = id2;
                deskIndexes[id2] = index1;
                index1++;
            }           
            resultArr[deskIndexes[id1]][deskIndexes[id2]] = arr2[id2];
        }
    }
    return { names: deskNames, matrix: resultArr};
}

String.prototype.endsWith = function (suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

function diff(a1,a2) {
    return a1.filter(function (i) { return a2.indexOf(i) < 0; });
};

function tryConvertToNumber(orgValue) {
    var intValue = parseInt(orgValue);
    var decimalValue = parseFloat(orgValue);
    var value = intValue != null ? intValue : (decimalValue != null ? decimalValue : orgValue);
    return value;
};


function convertAllProperties(obj) {
    for (var key in obj) {
        var orgValue = obj[key];
        var intValue = parseInt(orgValue);
        var decimalValue = parseFloat(orgValue);
        var value = intValue != null ? intValue : (decimalValue != null ? decimalValue : orgValue);
        obj[key] = value;
    }
    return obj;
};