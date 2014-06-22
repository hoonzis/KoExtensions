markers = [];

ko.bindingHandlers.map = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel) {

        try {
            var position = new google.maps.LatLng(allBindingsAccessor().latitude(), allBindingsAccessor().longitude());

            var marker = new google.maps.Marker({
                map: allBindingsAccessor().map,
                position: position,
                title: name
            });

            google.maps.event.addListener(marker, 'click', function () {
                viewModel.select();
            });

            markers.push(marker);
            viewModel._mapMarker = marker;

            allBindingsAccessor().map.setCenter(position);
        }
        catch (err) { }
    },
    update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
        try{
            var latlng = new google.maps.LatLng(allBindingsAccessor().latitude(), allBindingsAccessor().longitude());
            viewModel._mapMarker.setPosition(latlng);
        } catch (err) { }
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
    update: function(element, valueAccessor)   {
        var widget = $(element).data("datepicker");

        if (widget != null) {
            var vmValue = ko.utils.unwrapObservable(valueAccessor());

            //if we have a string value - convert it first
            if (isString(vmValue)) {
                vmValue = new Date(vmValue);
            }

            //if the date is not valid - don't visualize it, or we would have a "NaN/NaN/NaN"
            if (!isValidDate(vmValue))
                return;

            widget.setDates(vmValue);
        }
    }
};


var defaultPieChartOptions = { legend: true, width: 200, height: 200 };
var defaultBarChartOptions = { legend: true, width: 600, height: 200, xUnitName : 'x', itemName: 'Item' };

function setDefaultOptions(options, type) {
    var typeOptions;

    if (type == "bar")
        typeOptions = defaultBarChartOptions;
    else
        typeOptions = defaultPieChartOptions;

    var keys = Object.keys(typeOptions);

    if (options == null)
        return typeOptions;

    for(var k in keys){
        var key = keys[k];
        if(options[key] == null)
            options[key] = typeOptions[key];
    }

    return options;
}

function transformData(chartData){
    if(chartData.transf!=null)
        chartData.data = chartData.data.map(chartData.transf);
}

function getLineDataFromAccessor(accesor) {
    var options = setDefaultOptions(accesor.chartOptions, "line");
    var chartData = {
        transf: accesor.transformation,
        data: accesor.linechart(),
        options:options
    };
    chartData.options.unitTransform = accesor.unitTransform;
    transformData(chartData);
    return chartData;
}

ko.bindingHandlers.linechart = {
    init: function(element, valueAccessor, allBindingsAccessor) {
        var chartData = getLineDataFromAccessor(allBindingsAccessor());
        element._chartData = chartData;
        lineChart(chartData.data, element, chartData.options);
    },
    update: function(element, valueAccessor,allBindingsAccessor) {
        var chartData = getLineDataFromAccessor(allBindingsAccessor());
        if(!koTools.arraysAreEqual(chartData.data, element._chartData.data)){
            element.innerHTML = "";
            lineChart(chartData.data, element, chartData.options);
            element._chartData = chartData;
        }
    }
};

function getPieDataFromAccessor(accesor) {
    var chartData = {
        transf: accesor.transformation,
        data: accesor.piechart(),
        options: setDefaultOptions(accesor.chartOptions, "pie")
    };
    chartData.options.unitTransform = accesor.unitTransform;
    transformData(chartData);
    return chartData;
}

ko.bindingHandlers.piechart = {
    init: function (element, valueAccessor, allBindingsAccessor) {
        var chartData = getPieDataFromAccessor(allBindingsAccessor());
        element._chartData = chartData;
        d3pieChart(chartData.data, element, chartData.options);
    },
    update: function (element, valueAccessor, allBindingsAccessor) {
        var chartData = getPieDataFromAccessor(allBindingsAccessor());
      
        if (!koTools.arraysAreEqual(chartData.data, element._chartData.data)) {
            element.innerHTML = "";
            d3pieChart(chartData.data, element, chartData.options);
            element._chartData = chartData;
        }
    }
};

function getBarChartDataFromAccessor(accessor) {
    var chartData = {
        data:accessor.barchart(),
        options:setDefaultOptions(accessor.chartOptions, "bar"),
        xcoord: accessor.xcoord
    };
    if(accessor.line != null)
        chartData.line = accessor.line();
    chartData.options.unitTransform = accessor.unitTransform;
    return chartData;
}

ko.bindingHandlers.barchart = {
    init: function (element, valueAccessor, allBindingsAccessor) {
        var chartData = getBarChartDataFromAccessor(allBindingsAccessor());
        element._chartData = chartData;
        d3barChart(chartData.data, element, chartData.options, chartData.xcoord, chartData.line);
    },
    update: function (element, valueAccessor, allBindingsAccessor) {
        var chartData = getBarChartDataFromAccessor(allBindingsAccessor());
        if (!koTools.arraysAreEqual(chartData.data, element._chartData.data)) {
            element.innerHTML = "";
            element._chartData = chartData;
            d3barChart(chartData.data, element, chartData.options, chartData.xcoord, chartData.line);
        }
    }
};
 
function getScatterplotDataFromAccessor(accesor) {
    var options = setDefaultOptions(accesor.chartOptions, "line");
    var chartData = {
        //transf: accesor.transformation,
        data: accesor.scatterplot(),
        options: options
    };
    chartData.options.unitTransform = accesor.unitTransform;
    transformData(chartData);
    return chartData;
}

ko.bindingHandlers.scatterplot = {
    init: function (element, valueAccessor, allBindingsAccessor) {
        //var chartData = getLineDataFromAccessor(allBindingsAccessor());
        //element._chartData = chartData;
        //lineChart(chartData.data, element, chartData.options);
    },
    update: function (element, valueAccessor, allBindingsAccessor) {
        var chartData = getScatterplotDataFromAccessor(allBindingsAccessor());
        if (element._chartData == null || !koTools.arraysAreEqual(chartData.data, element._chartData.data)) {
            element.innerHTML = "";
            scatterplot(chartData.data, element, chartData.options);
            element._chartData = chartData;
        }
    }
};

function applyFormattedValue(fValue, element){
  //TODO: test if val is function  => observable then evaluate, test if it is a number before calling toCurrencyString
  if (fValue.val != null) {
      if (fValue.transf != null)
        fValue.val = fValue.transf(fValue.val);
      if(koTools.isNumber(fValue.val)){
        element.innerHTML = fValue.val.toCurrencyString(fValue.currency, fValue.rounding);
      }else{
        element.innerHTML = fValue.val;
      }
  }
}

function getFormattedValueFromAccessor(accessor){
  var fValue = {
    currency: getValue(accessor.currency),
    val : getValue(accessor.formattedValue),
    transf : accessor.transformation,
    rounding : getValue(accessor.rounding)
  };
  return fValue;
}

ko.bindingHandlers.formattedValue = {
    init: function (element, valueAccessor, allBindingsAccessor) {
        var fValue = getFormattedValueFromAccessor(allBindingsAccessor());
        applyFormattedValue(fValue,element);
    },
    update: function (element, valueAccessor, allBindingsAccessor) {
      var fValue = getFormattedValueFromAccessor(allBindingsAccessor());
      applyFormattedValue(fValue,element);
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
        element.style.display = 'none';
        element.style.display = 'block';
    }
};

function getValue(val) {
    if (val != null && typeof (val) == 'function')
        val = val();
    return val;
};


function clearArr(arr) {
    if (arr) {
        for (i in arr) {
            arr[i].setMap(null);
        }
        arr.length = 0;
    }
}

var originalData = [];