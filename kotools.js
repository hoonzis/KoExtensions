markers = [];

ko.bindingHandlers.map = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel) {

        //try {
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
        //}
        //catch (err) { }
    },
    update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
        //try{
            var latlng = new google.maps.LatLng(allBindingsAccessor().latitude(), allBindingsAccessor().longitude());
            viewModel._mapMarker.setPosition(latlng);
        //} catch (err) { }
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
			if(!isValidDate(vmValue))
				return;
				
			widget.setValue(vmValue);
        }
    }
};


var defaultPieChartOptions = { legend: true, width: 200, height: 200 }
function setDefaultOptions(options) {
    if (options == null)
        options = defaultPieChartOptions;

    if (options.height == null)
        options.height = 200;

    if (options.width == null)
        options.width = 200;

    return options;
}

ko.bindingHandlers.piechart = {
    init: function(element, valueAccessor, allBindingsAccessor) {
      //initialize datepicker with some optional options
	  var transf = allBindingsAccessor().transformation;
	  var vmData = allBindingsAccessor().piechart();

	  var options  = setDefaultOptions(allBindingsAccessor().chartOptions);
	  var data = vmData.map(transf);
	  vmData._originalData = data;
	  vmData._options = options;
	  
	  d3pieChart(options.width,options.height,data, element.id, options.legend);
    },
    update: function(element, valueAccessor,allBindingsAccessor) {
      var transf = allBindingsAccessor().transformation;
      var vmData = allBindingsAccessor().piechart();

      var options = setDefaultOptions(vmData._options);
      
	  var data = vmData.map(transf);
	  
	  if(!arraysAreEqual(data, vmData._originalData)){
	      element.innerHTML = "";
		d3pieChart(options.width,options.height,data, element.id, options.legend);
		vmData._originalData = data;
	  }
    }
};


function clearArr(arr) {
    if (arr) {
        for (i in arr) {
            arr[i].setMap(null);
        }
        arr.length = 0;
    }
}