KoExtensions
============

Additional binding and tools for KnockoutJS the package includes:

1. Piechart binding (based on [D3JS](http://d3js.org/))
2. Stacked-barchart binding (based on [D3JS](http://d3js.org/))
3. Google maps binding
4. Bootstrap DateTime picker binding
5. FormattedValue binding - simply format the values as you need.

[Sample application](http://hoonzis.blogspot.fr/2013/03/sample-application-ravendb-knockoutjs.html)

###The pie-chart binding###
This binding enables visualization of any collection as a piechart if the developer submits a function to convert each item into title - value pair.

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

###Charts in the foreach binding###
The chart binding can be extremly usefull when there is a need to generate multiple charts - for instance chart per viewmodel.

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

###The bar chart binding###
Enables visualization of one dimensional collection as a stacked-barchart. The binding assumes that the collection passed in contains the values to be shown in each column. It is obligatory to specify the name of the field which holds the "x" coordinate (the stacked column name).

![alt text][stackedbarchart]
[stackedbarchart]: http://hoonzis.github.com/KoExtensions/img/stackedbarchart.PNG

```html
<div id="lifeExpenses" data-bind="stackedbarchart: lifeExpenses, xcoord:'month'">
</div>
```
```javascript
var lifeExpenses = [
	{
		month: 'january',
		rent: -500,
		salary : 2200,
		parties : -300
	},
	{
		month: 'february',
		rent: -1000,
		salary : 1500,
		parties : -400
	}
]
```
###Line chart###
Line chart binding uses a transformation function which is applied on the list of viewmodels. The resulting object should be an array of objects for each line in the following form: {x:line1, values:[{x:0,y:100},{x:1,y:200}]}.
![alt text][linechart]
[linechart]: http://hoonzis.github.com/KoExtensions/img/linechart.PNG

```html
<div id="lineChart" data-bind="linechart: expensesPerMonth, transformation:transformToLineChart"></div>
function transformToLineChart(i){
    return { 
    	x: i.linename, 
    	values: i.data.map(function(item){
    		return {x:item.month,y:item[i.linename]};
    	})
    };
}
```
This binding can be usefull when the collection of lines changes due to user selections.

###Chart options###
All the charts have several common properties such as the dimensions and whether the legend should be shown.These as well as other can be passed in the chart binding in passing a 'chartOptions' object. Here is how the chartOptions object might look like:
chartOptions: {
	legend:true, 
	style:'group', 
	width:800, 
	height: 300, 
	xLabel:$root.getTimeUnitLabel, 
	xUnitName: 'Quarters'
	itemName: 'Company'
}

1. legend - true of false
2. width & height - in pixels
3. style - the style of the chart. For barchart: 'stack' or 'group'
5. xUnitName - name of the x Axes such as 'Months', 'Quarters'
6. xUnitFormat - function to format X-axis description values. You might want to pass in functions that format the months or quarters to their textual representation (eg. 1 -> Jan, 2 -> Feb, or 20121 -> Q1 2012)
7. itemName - in case of multiple items, what does each item represent. For instance each each line in multiple line represents a company this could be "Company".

###Cash-flow chart###
This chart might be usefull very often when depicting two different variables using bars and line in the same time. In this example the line is just a sum of all the bars, but these could be non-related variables.

![alt text][cashflowchart]
[cashflowchart]: http://hoonzis.github.com/KoExtensions/img/cashflowchart.PNG

'''html
<div id="cashFlow" data-bind="barchart: lifeExpenses, xcoord:'month',line:expensesPerMonth,chartOptions:{legend:true, width:800,height:300,style:'stack',sameScaleLinesAndBars:true}">
function TestViewModels (expenses){
	self = this;
	self.lifeExpenses = ko.observableArray([]);
	self.expensesPerMonth = ko.observableArray([]);

	var totalPerMonth = expenses.map(function(item){
		var keys = Object.keys(item).filter(function(key){return key != 'month';});

		var monthTotal =  
		{		
			x : item['month'],
			y : d3.sum(keys, function(key) { return item[key];})
		};

		return monthTotal;
	});


	self.lifeExpenses(expenses);
	self.expensesPerMonth(totalPerMonth);
}

var vm = new TestViewModels(lifeExpenses);

ko.applyBindings(vm);
initializeCharts();
'''

###The map binding###
The map binding uses [google maps](https://developers.google.com/maps/documentation/javascript/) to viualize on or more ViewModel on the map. The developer has to specify which observables of the ViewModel hold the latitude and longitude properties.

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

###The formattedValue binding###
Very simple binding which formats the numeric values for the GUI. Spaces and decimal separators are inserted, currency symbol can be added and additional calculation may be performed when displaying the values.

![alt text][formattedValue]
[formattedValue]: http://hoonzis.github.com/KoExtensions/img/formattedValue.PNG

```html
	<b>Price:</b>
    <span data-bind="formattedValue:price, currency:priceCurrency"></span>
	<br/><b>Power:</b>
	<span data-bind="formattedValue:power, currency:'kW'"></span>
	<br/><b>Efficiency:</b>
	<span data-bind="formattedValue:efficiency, currency:'%', transformation:toPercent"></span>
	<br/><b>Consumption:</b>
	<span data-bind="formattedValue:consumption100, currency:'l/100km'"></span>
	<br/><b>Distance:</b>
	<input data-bind="value: distance"/>
	<br/><b>Total consumption:</b>
	<span data-bind="formattedValue: totalConsumption, currency:'l'"><span>
```

```javascript
function toPercent(n) { return n*100}
function CarViewModel() {
	self = this;
	self.efficiency = ko.observable(0.95);
	self.price = ko.observable(1000000);
	self.priceCurrency = ko.observable('EUR');
	self.power = ko.observable(120);
	self.consumption100 = ko.observable(7);
	self.distance = ko.observable();
	self.totalConsumption= ko.computed(function() {
		return self.distance()*self.consumption100();
	});
}
```
