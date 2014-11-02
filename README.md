KoExtensions
============

Additional binding and tools for KnockoutJS, the package includes:

Simple charts ([example page](https://github.com/hoonzis/KoExtensions/blob/master/testpages/GraphTests.html)):

* Piechart
* Barchart (stacked or grouped)
* Multi-line chart

More advanced ready-to-use charts:

* Histogram chart with data probability distribution ([example](https://github.com/hoonzis/KoExtensions/blob/master/testpages/HistogramExample.html))
* Cashflow chart ([example](https://github.com/hoonzis/KoExtensions/blob/master/testpages/CashFlowExample.html))
* Bubble chart
* Events visualization based on [EventDrops](https://github.com/marmelab/EventDrops) project [example](https://github.com/hoonzis/KoExtensions/blob/master/testpages/EventDrops.html)

Other bindings usefull for Knockout:

* Google maps binding
* Bootstrap DateTime picker binding
* FormattedValue binding - simply format the values as you need.

All charts are created with [D3JS](http://d3js.org/) and based on multiple examples provided in the documentation. Following are few examples of the available bindings. See the [wiki](https://github.com/hoonzis/KoExtensions/wiki) for full examples and documentation.

#### Multiple binded charts ####
![alt text][foreachpiechart]
[foreachpiechart]: http://hoonzis.github.com/KoExtensions/img/multiple_pie.PNG

```html
<!-- ko foreach: cars -->
 	<div style="float:left;margin-right:10px">
	 	<h3 data-bind="text:name"></h3>
		<div data-bind="piechart: sales,transformation:transform2">

		</div>
 	</div> 
 <!-- /ko -->

function transform2(car){
	return {x:car.model, y:car.amount };
}
```

#### Cashflow chart ####
![alt text][cashflowchart]
[cashflowchart]: http://hoonzis.github.com/KoExtensions/img/cashflowchart.png

```html
<div id="cashFlow" data-bind="barchart: lifeExpenses, xcoord:'month',line:expensesPerMonth,chartOptions:{legend:true, width:800,height:300,style:'stack',sameScaleLinesAndBars:true}">
```
```javascript
function TestViewModels (expenses){
	self = this;
	self.lifeExpenses = ko.observableArray([]);
	self.expensesPerMonth = ko.observableArray([]);
	var totalPerMonth = expenses.map(function(item){
		var keys = Object.keys(item).filter(function(key){return key != 'month';});
		var monthTotal =  {	x : item['month'], y : d3.sum(keys, function(key) { return item[key];}) };
		return monthTotal;
	});
	self.lifeExpenses(expenses);
	self.expensesPerMonth(totalPerMonth);
}
var vm = new TestViewModels(lifeExpenses);
ko.applyBindings(vm);
initializeCharts();
```

#### Histogram ####
![alt text][histogram]
[histogram]: http://hoonzis.github.com/KoExtensions/img/histogram.PNG

```html
<div id="histogram" data-bind="histogram: data, chartOptions : {
        tolerance : 10,
        showProbabilityDistribution: true,min : -20,
        expected: 'median',
        useMAD: true,
        showOutliers: true}"></div>
```
```javascript
var exData = [3.9,3.8,3.9,2.7,2.8,1.9,2.7,3.5, 4.4, 2.8, 3.4, 8.6, 4.5, 3.5, 3.6, 3.8, 4.3, 4.5, 3.5,30,33,31]; 
function TestViewModel() {
    var self = this;
    self.data = ko.observableArray(exData);
}
var vm = new TestViewModel();
ko.applyBindings(vm);
initializeCharts();
```

#### Google maps binding ####
![alt text][maps]
[maps]: http://hoonzis.github.com/KoExtensions/img/maps.PNG

```html
<div id="map">
</div>
<div data-bind="foreach: stations">
	<div data-bind="latitude: lat, longitude:lng, map:map, selected:selected"></div>
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
