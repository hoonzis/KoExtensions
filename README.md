KoExtensions
============

Additional binding and tools for KnockouJS.

[Sample application](http://hoonzis.blogspot.fr/2013/03/sample-application-ravendb-knockoutjs.html)

###The pie-chart binding###
Based on D3JS, this binding enables visualization of any collection as a piechart if the developer submits a function to convert each item into title - value pair.

![alt text][piechart]
[piechart]: http://hoonzis.github.com/KoExtensions/img/piechart.PNG

'''
<div id="carsChart" data-bind="piechart: cars, transformation:transformToChart, chartOptions:testOptions">
</div>

function CarViewModel(data) {
	self = this;
	self.sales = ko.observableArray([]);
	self.name = ko.observable();
	
	self.totalSales = ko.computed(function(x) {
		return sum(self.sales());
	},self);
	
	if(data!=null){
		self.sales(data.sales);
		self.name(data.name);
	}
}

function CarSalesViewModel (data){
	self.cars = ko.observableArray([]);
	
	if(data!=null){
		self.cars(data.cars.map(function(x) { return new CarViewModel(x);}));
	}
}

function transformToChart(car){
	return { x: car.name(), y: car.totalSales()};
}
'''

###The map binding###
The map binding uses google maps to viualize on or more ViewModel on the map. The developer has to specify which observables of the ViewModel hold the latitude and longitude properties.

![alt text][maps]
[maps]: http://hoonzis.github.com/KoExtensions/img/maps.PNG

'''
<div id="map">
</div>
<div data-bind="foreach: stations">
	<div data-bind="latitude: lat, longitude:lng, map:map, selected:selected">
	</div>
</div>

function StationViewModel(data){
	var self = this;
	self.lat = ko.observable();
	self.lng = ko.observable();
	self.name = ko.observable();
	self.selected = ko.observable();
	
	if(data!=null){
		self.lat(data.lat);
		self.lng(data.lng);
		self.name(data.name);
	}
}
'''

###The datepicker binding###