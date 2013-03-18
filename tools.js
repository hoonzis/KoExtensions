var today = new Date();
var day = today.getUTCDate();
var year = today.getFullYear();
var month = today.getMonth();
        
function isEmpty(str) {
    return (!str || 0 === str.length);
}

function sum(kArray, func) {
    var total = 0;
    for (var p = 0; p < kArray.length; p++) {
		if(func!=null)
			total += parseFloat(func(kArray[p]));
		else
    	    total += parseFloat(kArray[p]);
    }
    return total;
}

function find(data, predicate) {
    var i = 0;
    for (i = 0; i < data.length; i++)
        if(predicate(data[i]))
            return data[i];
}

function max(kArray, predicate) {
    var max = 0;
    for (var p = 0; p < kArray.length; p++) {
        var v = predicate(kArray[p]);
        if (v >= max)
            max = v;
    }

    return max;
}

function positiveRounded(d) {
    if (d > 0)
        return Math.round(d);
    return 0;
}

function isString(x){
    return typeof(x) == 'string';
}

function toFixed(v,n){
    if (isString(v))
        return v;
    return v.toFixed(n);
}

function isValidDate(d) {
  if ( Object.prototype.toString.call(d) !== "[object Date]" )
    return false;
  return !isNaN(d.getTime());
}

function arraysAreEqual(ary1, ary2) {
    if (ary1 != null && ary2 != null)
        return (ary1.join('') == ary2.join(''));

    if (ary1 == null && ary2 == null)
        return true;

    return false;
}