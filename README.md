KoExtensions
============
[![Build Status](https://travis-ci.org/hoonzis/KoExtensions.svg?branch=master)](https://travis-ci.org/hoonzis/KoExtensions)

KoExtensions can be used as standalone JavaScript charting library or plug-in for KnockoutJS. Besides charting, when used with Knockout, KoExtensions provide few useful bindings.

[piechart]: http://hoonzis.github.com/KoExtensions/img/small/piechart.PNG
[cashflow]: http://hoonzis.github.com/KoExtensions/img/small/cashflow.PNG
[linechart]: http://hoonzis.github.com/KoExtensions/img/small/linechart.PNG
[chordchart]: http://hoonzis.github.com/KoExtensions/img/small/chordchart.PNG
[bubblechart]: http://hoonzis.github.com/KoExtensions/img/small/bubblechart.PNG
[histochart]: http://hoonzis.github.com/KoExtensions/img/small/histogram.PNG
[simpleEx]: https://github.com/hoonzis/KoExtensions/blob/master/testpages/GraphTests.html
[cashFlowEx]: https://github.com/hoonzis/KoExtensions/blob/master/testpages/CashFlowExample.html
[normalizedLineEx]: https://github.com/hoonzis/KoExtensions/blob/master/testpages/NormalizedLineChart.html.html
[chordEx]: https://github.com/hoonzis/KoExtensions/blob/master/testpages/ChordChart.html
[bubbleEx]: https://github.com/hoonzis/KoExtensions/blob/master/testpages/BubbleChart.html
[histoEx]: https://github.com/hoonzis/KoExtensions/blob/master/testpages/HistogramExample.html

|  Chord chart            | Bubble Chart             | Histogram               |
| ------------------------|:------------------------:| ---------------------- :|
| ![alt text][chordchart] | ![alt text][bubblechart] | ![alt text][histochart] |


|         Pie Chart       | Bar Chart             | Line Chart             |
| ------------------------|:---------------------:| ----------------------:|
| ![alt text][piechart]   | ![alt text][cashflow] | ![alt text][linechart] |
| [Example][simpleEx]     | [Example1][simpleEx] [Example2][cashFlowEx]  | [Example1][simpleEx] [Example2][normalizedLineEx] |
 
 


Other bindings useful for Knockout:

* Google maps binding
* Bootstrap DateTime picker binding
* FormattedValue binding - simply format the values as you need.

All charts are created with [D3JS](http://d3js.org/) and based on multiple examples provided in the documentation. Following are few examples of the available bindings. See the [wiki](https://github.com/hoonzis/KoExtensions/wiki) for full examples and documentation.

####Referencing and using KoExtensions:
There are two ways to reference KoExtensions:
* Reference single [KoExtensions.js](https://github.com/hoonzis/KoExtensions/blob/master/src/KoExtensions.js) file. See the [example.html](https://github.com/hoonzis/KoExtensions/blob/master/src/example.html) file. If used in such way, global variable **koExtensions** is defined which exposes all the functionality.
* Use RequireJS. All files in the *testpages* folder use this approach. KoExtension expects D3 to be defined globally before being loaded.

Both approaches can be used whether KoExtensions is used as standalone charting library or with KnockoutJS. In order for the automatic bindings to work with knockout, **registerExtensions** method has to be called.

```javascript
<script src="d3.js"></script>
<script src="KoExtensions.js"></script>
//if you want to use knockout binding, just call:
koExtensions.registerExtensions
//otherwise, use charting with all the charts
koext.charting.lineChart(testData, el, chartOptions);
```

####Contributing and building
RequireJS is used to handle dependencies as well as to bundle single referencable JS file, which can be built with NodeJS and RequireJS optimizer:

```
cd src
node r.js -o app.build.js
```

Tests can be run with QUnit:

```
phantomjs run-qunit.js Tests/Tests.html
```

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
