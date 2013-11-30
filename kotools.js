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
ko.bindingHandlers.piechart = {
    init: function(element, valueAccessor, allBindingsAccessor) {
      var transf = allBindingsAccessor().transformation;
      var vmData = allBindingsAccessor().piechart();

      var options  = setDefaultOptions(allBindingsAccessor().chartOptions, "pie");
      var data = vmData.map(transf);
      vmData._originalData = data;
      vmData._options = options;
      
      d3pieChart(options.width,options.height,data, element.id, options.legend);
    },
    update: function(element, valueAccessor,allBindingsAccessor) {
      var transf = allBindingsAccessor().transformation;
      var vmData = allBindingsAccessor().piechart();

      var options = setDefaultOptions(vmData._options,"pie");
      
      var data = vmData.map(transf);
      
      if(!arraysAreEqual(vmData, vmData._originalData)){
          element.innerHTML = "";
        d3pieChart(options.width,options.height,data, element.id, options.legend);
        vmData._originalData = data;
      }
    }
};


ko.bindingHandlers.stackedbarchart = {
    init: function (element, valueAccessor, allBindingsAccessor) {
        var data = allBindingsAccessor().stackedbarchart();
        var options = setDefaultOptions(allBindingsAccessor().chartOptions,"bar");
		var xcoord = allBindingsAccessor().xcoord;
        if(originalData[element.id] != null)
			throw "Element: " + element.id + "already used for other chart";
		originalData[element.id] = data;
		
        d3barChart(options.width, options.height, data, element.id, options.legend, xcoord);
    },
    update: function (element, valueAccessor, allBindingsAccessor) {
        var data = allBindingsAccessor().stackedbarchart();
        var options = setDefaultOptions(allBindingsAccessor().chartOptions,"bar");
        var xcoord = allBindingsAccessor().xcoord;
        
        
        if (!arraysAreEqual(data, originalData[element.id])) {
            element.innerHTML = "";
            d3barChart(options.width, options.height, data, element.id, options.legend, xcoord);
            originalData[element.id] = data;
        }
    }
};

ko.bindingHandlers.formattedValue = {
    init: function (element, valueAccessor, allBindingsAccessor) {
        var currency = getValue(allBindingsAccessor().currency);
        var val = getValue(allBindingsAccessor().formattedValue);
        var transf = allBindingsAccessor().transformation;

        //TODO: test if val is function  => observable then evaluate, test if it is a number before calling toCurrencyString
        if (val != null) {
            if (transf != null)
                val = transf(val);

            element.innerHTML = val.toCurrencyString(currency);
        }
    },
    update: function (element, valueAccessor, allBindingsAccessor) {
        var currency = getValue(allBindingsAccessor().currency);
        var val = getValue(allBindingsAccessor().formattedValue);
        var transf = allBindingsAccessor().transformation;

        if (val != null) {
            if (transf != null)
                val = transf(val);
            element.innerHTML = val.toCurrencyString(currency);
        }
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