KoExtensions
============
[![Build Status](https://travis-ci.org/hoonzis/KoExtensions.svg?branch=master)](https://travis-ci.org/hoonzis/KoExtensions)

KoExtensions can be used as standalone JavaScript charting library based on D3JS or plug-in for KnockoutJS. Besides charting, when used with Knockout it provides other useful bindings. Available charts:

[piechart]: http://hoonzis.github.com/KoExtensions/img/small/piechart.PNG
[cashflow]: http://hoonzis.github.com/KoExtensions/img/small/cashflow.PNG
[linechart]: http://hoonzis.github.com/KoExtensions/img/small/linechart.PNG
[chordchart]: http://hoonzis.github.com/KoExtensions/img/small/chordchart.PNG
[bubblechart]: http://hoonzis.github.com/KoExtensions/img/small/bubblechart.PNG
[histochart]: http://hoonzis.github.com/KoExtensions/img/small/histogram.PNG
[mapbinding]: http://hoonzis.github.com/KoExtensions/img/mapbinding.PNG

[piechartex]: https://github.com/hoonzis/KoExtensions/blob/master/testpages/piecharts.html
[cashFlowEx]: https://github.com/hoonzis/KoExtensions/blob/master/testpages/CashFlowExample.html
[normalizedLineEx]: https://github.com/hoonzis/KoExtensions/blob/master/testpages/NormalizedLineChart.html
[lineSlidder]: https://github.com/hoonzis/KoExtensions/blob/master/testpages/LineChartSlidder.html
[chordEx]: https://github.com/hoonzis/KoExtensions/blob/master/testpages/ChordChart.html
[bubbleEx]: https://github.com/hoonzis/KoExtensions/blob/master/testpages/BubbleChart.html
[histoEx]: https://github.com/hoonzis/KoExtensions/blob/master/testpages/HistogramExample.html
[googleMapsEx]: https://github.com/hoonzis/KoExtensions/blob/master/testpages/MapTests.html
[datepickerEx]: https://github.com/hoonzis/KoExtensions/blob/master/testpages/DateBindingTests.html
[formattingEx]: https://github.com/hoonzis/KoExtensions/blob/master/testpages/UtilsTests.html
[linechartex]: https://github.com/hoonzis/KoExtensions/blob/master/testpages/linetests.html
[barchartex]: https://github.com/hoonzis/KoExtensions/blob/master/testpages/barcharttests.html


|         Pie Chart       | Bar Chart             | Line Chart             |
| ------------------------|:---------------------:| ----------------------:|
| ![alt text][piechart]   | ![alt text][cashflow] | ![alt text][linechart] |
| [Example][piechartex]     | [Example1][barchartex] [Example2][cashFlowEx]  | [Example1][linechartex] [Example2][normalizedLineEx] [With Slidder][lineSlidder]|

|         Chord Chart       | Bubble Chart             | Histogram             |
| ------------------------|:---------------------:| ----------------------:|
| ![alt text][chordchart]   | ![alt text][bubblechart] | ![alt text][histochart] |
| [Example][chordEx]    | [Example][bubbleEx] | [Example][histoEx] |


**Other bindings useful for Knockout:**

* Google maps and Mapbox binding [Example] [googleMapsEx]
* Bootstrap DateTime picker binding [Example] [datepickerEx]
* FormattedValue binding - showing data values in the UI with applied formatting (currencies, rounding). [Example][formattingEx]

All charts are created with [D3JS](http://d3js.org/) and based on multiple examples provided in the documentation.

#### Referencing and using KoExtensions
There are two ways to reference KoExtensions:
* Reference single [KoExtensions.js](https://github.com/hoonzis/KoExtensions/blob/master/src/KoExtensions.js) file. See the [example.html](https://github.com/hoonzis/KoExtensions/blob/master/src/example.html) file. If used in such way, global variable **koExtensions** is defined which exposes all the functionality.
* Use RequireJS. All files in the *testpages* folder use this approach. KoExtension expects D3 to be defined globally before being loaded.

Both approaches can be used whether KoExtensions is used as standalone charting library or with KnockoutJS.

```javascript
<script src="d3.js"></script>
<script src="KoExtensions.js"></script>
koext.charting.lineChart(testData, el, {width:"100px"});
```

```javascript
<script src="d3.js"></script>
<script src="knockout.js"></script>
<script src="KoExtensions.js"></script>
<div data-bind="linechart:testData, chartOptions:{width:100px}"
```

####Contributing and building
RequireJS is used to handle dependencies as well as to bundle single JS file, which can be built with NodeJS and RequireJS optimizer:

```
cd src
node r.js -o app.build.js
```

Tests can be run with QUnit:

```
phantomjs run-qunit.js Tests/Tests.html
```

#### Some useful tips ####
- Showing multiple charts in knockout foreach loop can be achieved as follows:

[foreachpiechart]: http://hoonzis.github.com/KoExtensions/img/multiple_pie.PNG
![alt text][foreachpiechart]

```html
<!-- ko foreach: cars -->
 	<div style="float:left;margin-right:10px">
	 	<h3 data-bind="text:name"></h3>
		<div data-bind="piechart: data"></div>
 	</div>
 <!-- /ko -->
```

- Interesting usage of barchart can be "cashflow chart" which shows a single line, going through the bars being the addition of the bars values. This can be achieved as follows:

[cashflowchart]: http://hoonzis.github.com/KoExtensions/img/cashflowchart.png
![alt text][cashflowchart]

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
```
- Histogram chart has some additional properties which can be used to visualize the statistical distribution, using either Mean or Median and standard variance or MAD (Median absolute deviation)

[histogram]: http://hoonzis.github.com/KoExtensions/img/histogram.PNG
![alt text][histogram]

```html
<div id="histogram" data-bind="histogram: data, chartOptions : {
        tolerance : 10,
        showProbabilityDistribution: true,min : -20,
        expected: 'median',
        useMAD: true,
        showOutliers: true}"></div>
```

#### Maps binding for Knockout
Google maps and Mapbox bindings are available to visualize set of points in geographic map.
Google maps binding currently accepts function which is invoked when the marker is clicked on the map.

![maps binding][mapbinding]

```html
<div id="map" style="width:300px;height:300px" data-bind="gmap:points, markerSelected:pointSelected">
</div>
<div id="mapbox" style="width:300px;height:300px" data-bind="mapbox:points">
</div>
```
