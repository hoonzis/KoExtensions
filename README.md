KoExtensions
============
[![Build Status](https://travis-ci.org/hoonzis/KoExtensions.svg?branch=master)](https://travis-ci.org/hoonzis/KoExtensions)

KoExtensions can be used as standalone JavaScript charting library based on D3JS or plug-in for KnockoutJS. Besides charting, when used with Knockout it provides other useful bindings. Available charts:

[piechart]: https://raw.githubusercontent.com/hoonzis/KoExtensions/gh-pages/img/small/piechart.PNG
[cashflow]: https://raw.githubusercontent.com/hoonzis/KoExtensions/gh-pages/img/small/cashflow.PNG
[linechart]: https://raw.githubusercontent.com/hoonzis/KoExtensions/gh-pages/img/small/linechart.PNG
[chordchart]: https://raw.githubusercontent.com/hoonzis/KoExtensions/gh-pages/img/small/chordchart.PNG
[bubblechart]: https://raw.githubusercontent.com/hoonzis/KoExtensions/gh-pages/img/small/bubblechart.PNG
[histochart]: https://raw.githubusercontent.com/hoonzis/KoExtensions/gh-pages/img/small/histogram.PNG
[mapbinding]: https://raw.githubusercontent.com/hoonzis/KoExtensions/gh-pages/img/mapbinding.PNG
[linechartslidder]: https://raw.githubusercontent.com/hoonzis/KoExtensions/gh-pages/img/small/horizontalslidder.PNG

[piechartex]: https://github.com/hoonzis/KoExtensions/blob/master/testpages/piecharts.html
[cashFlowEx]: https://github.com/hoonzis/KoExtensions/blob/master/testpages/CashFlowExample.html
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
| ![alt text][piechart]   | ![alt text][cashflow] | ![alt text][linechartslidder] |
| [Example][piechartex]     | [Example1][barchartex] [Example2][cashFlowEx]  | [Example1][linechartex][With Slidder][lineSlidder]|

|         Chord Chart     | Bubble Chart        | Histogram             |
| ------------------------|:-------------------:| ---------------------:|
| ![alt text][chordchart]   | ![alt text][bubblechart] | ![alt text][histochart] |
| [Example][chordEx]    | [Example][bubbleEx] | [Example][histoEx] |

Fiddle to play around:
https://jsfiddle.net/u4sL2x67/4/

**Other bindings useful for Knockout:**

* Google maps and Mapbox binding [Example] [googleMapsEx]
* Bootstrap DateTime picker binding [Example] [datepickerEx]
* FormattedValue binding - showing data values in the UI with applied formatting (currencies, rounding). [Example][formattingEx]

All charts are created with [D3JS](http://d3js.org/) and based on multiple examples provided in the documentation.

#### Using KoExtensions
KoExtensions can be used either together with Knockout or as a separate charting library.

```javascript
// As separate charting library
<script src="d3.js"></script>
<script src="koextensions.js"></script>
koext.charting.lineChart(testData, el, {width:"100px"});
```

```javascript
// Together with knockout
<script src="d3.js"></script>
<script src="knockout.js"></script>
<script src="koextensions.js"></script>
<div data-bind="linechart:testData, chartOptions:{width:100px}"
```

#### Contributing and building
Browserify is used to combine the files in **src** folder and create the bundle.

```
browserify src\koextensions.js  --external d3 --standalone koextensions -o build\koextensions.js
```

Tests can be run with QUnit:
```
phantomjs run-qunit.js Tests/Tests.html
```

#### Some useful tips ####
- Showing multiple charts in knockout foreach loop can be achieved as follows:

[foreachpiechart]: https://raw.githubusercontent.com/hoonzis/KoExtensions/gh-pages/img/multiple_pie.PNG
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

[cashflowchart]: https://raw.githubusercontent.com/hoonzis/KoExtensions/gh-pages/img/cashflowchart.png
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

[histogram]: https://raw.githubusercontent.com/hoonzis/KoExtensions/gh-pages/img/histogram.PNG
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
