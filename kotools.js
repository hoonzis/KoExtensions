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
                viewModel.select()
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
         //when the view model is updated, update the widget
        if (widget) {
            var vmValue = ko.utils.unwrapObservable(valueAccessor());

            //if we have a string value - convert it first
            if (isString(vmValue)) {
                vmValue = new Date(vmValue);
            }

            //if the date is not valid - don't visualize it, or we would have a "NaN/NaN/NaN"
            if (!isValidDate(vmValue))
                return;

            widget.setValue(vmValue);
        }
    }
};


var defaultPieChartOptions = { legend: true, width: 200, height: 200 }
var defaultBarChartOptions = { legend: true, width: 600, height: 200 }

function setDefaultOptions(options, type) {
    var typeOptions;

    if (type == "bar")
        typeOptions = defaultBarChartOptions;
    else
        typeOptions = defaultPieChartOptions;

    if (options == null)
        options = typeOptions;

    if (options.height == null)
        options.height = typeOptions.height;

    if (options.width == null)
        options.width = type.width;

    return options;
}

//TODO: storing the original data on the object won't work for computed observables
ko.bindingHandlers.linechart = {
    init: function(element, valueAccessor, allBindingsAccessor) {
      var transf = allBindingsAccessor().transformation;
      var vmData = allBindingsAccessor().linechart();

      var options  = setDefaultOptions(allBindingsAccessor().chartOptions, "line");
      var data = vmData.map(transf);
      vmData._originalData = data;
      vmData._options = options;
      
      lineChart(options.width,options.height,data, element, options.legend);
    },
    update: function(element, valueAccessor,allBindingsAccessor) {
      var transf = allBindingsAccessor().transformation;
      var vmData = allBindingsAccessor().linechart();

      var options = setDefaultOptions(vmData._options,"line");
      
      var data = vmData.map(transf);
      
      if(!arraysAreEqual(vmData, vmData._originalData)){
          element.innerHTML = "";
        lineChart(options.width,options.height,data, element, options.legend);
        vmData._originalData = data;
      }
    }
};

ko.bindingHandlers.piechart = {
    init: function(element, valueAccessor, allBindingsAccessor) {
      var transf = allBindingsAccessor().transformation;
      var vmData = allBindingsAccessor().piechart();
      var options  = setDefaultOptions(allBindingsAccessor().chartOptions, "pie");
      var data = vmData.map(transf);
      element._originalData = data;
      element._options = options;
      
      d3pieChart(options.width,options.height,data, element, options.legend);
    },
    update: function(element, valueAccessor,allBindingsAccessor) {
      var transf = allBindingsAccessor().transformation;
      var vmData = allBindingsAccessor().piechart();

      var options = setDefaultOptions(element._options,"pie");
      var data = vmData.map(transf);
      
      if(!arraysAreEqual(vmData, element._originalData)){
        element.innerHTML = "";
        d3pieChart(options.width,options.height,data, element, options.legend);
        element._originalData = data;
      }
    }
};

ko.bindingHandlers.stackedbarchart = {
    init: function (element, valueAccessor, allBindingsAccessor) {
        var data = allBindingsAccessor().stackedbarchart();
        var options = setDefaultOptions(allBindingsAccessor().chartOptions,"bar");
		var xcoord = allBindingsAccessor().xcoord;
        element._originalData = data;
		
        d3barChart(options.width, options.height, data, element, options.legend, xcoord);
    },
    update: function (element, valueAccessor, allBindingsAccessor) {
        var data = allBindingsAccessor().stackedbarchart();
        var options = setDefaultOptions(allBindingsAccessor().chartOptions,"bar");
        var xcoord = allBindingsAccessor().xcoord;
        
        if (!arraysAreEqual(data, element._originalData)) {
            element.innerHTML = "";
            d3barChart(options.width, options.height, data, element, options.legend, xcoord);
            element._originalData = data;
        }
    }
};

function applyFormattedValue(fValue, element){
  //TODO: test if val is function  => observable then evaluate, test if it is a number before calling toCurrencyString
  if (fValue.val != null) {
      if (fValue.transf != null)
        fValue.val = fValue.transf(fValue.val);
      if(fValue.rounding!=null && isNumber(fValue.val)){
        fValue.val = Math.round(fValue.val*1*fValue.val,fValue.rounding) / 1* fValue.val,fValue.rounding;
        element.innerHTML = fValue.val.toCurrencyString(fValue.currency);
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