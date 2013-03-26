KoExtensions
============

Additional binding and tools for KnockouJS.

[Sample application](http://hoonzis.blogspot.fr/2013/03/sample-application-ravendb-knockoutjs.html)

###The pie-chart binding###
Based on [D3JS](http://d3js.org/), this binding enables visualization of any collection as a piechart if the developer submits a function to convert each item into title - value pair.

![alt text][piechart]
[piechart]: http://hoonzis.github.com/KoExtensions/img/piechart.PNG

```html
<div id="carsChart" data-bind="piechart: cars, transformation:transformToChart, chartOptions:testOptions">
</div>
```
```javascript
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
```

###The map binding###
The map binding uses [google maps](https://developers.google.com/maps/documentation/javascript/) to viualize on or more ViewModel on the map. The developer has to specify which observables of the ViewModel hold the latitude and longitude properties.

![alt text][maps]
[maps]: http://hoonzis.github.com/KoExtensions/img/maps.PNG

```html
<div id="map">
</div>
<div data-bind="foreach: stations">
	<div data-bind="latitude: lat, longitude:lng, map:map, selected:selected">
	</div>
</div>
```

```javascript
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
```

###The datepicker binding###
This binding makes use of [bootstrap-datepicker](www.eyecon.ro/bootstrap-datepicker/) plugin to render boostrap style date picker and conncect it directly to Knockout observable.

![alt text][datepicker]
[datepicker]: http://hoonzis.github.com/KoExtensions/img/datepicker.PNG

```html
<div class="control-group">
	<label class="control-label">Start</label>
	<div class="controls">
		<input type="text" data-bind="datepicker:start">
	</div>
</div>
```

```javascript
function VoyageViewModel(data){
	self = this;
	self.start = ko.observable();
	self.end = ko.observable();
	self.destination = ko.observable();
	
	self.duration = ko.computed(function(x) { return daysBetween(self.start(), self.end());},self);
	
	if(data!=null){
		self.start(data.start);
		self.end(data.end);
		self.destination(data.destination);
	}
}
```
