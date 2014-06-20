//Takes as input collection of items [data]. Each item has two values [x] and [y].
//[{x:1, receivedEtf:123, tradedEtf:100},{x:2, receivedEtf:200, tradedEtf:100}]
//[{linename:receivedEtf, values:[x:q1, y:200]}]
function scatterPlot(data, element, options) {
    var el = getElementAndCheckData(element, data);
    if (el == null)
        return;

    var margin = {top: 20, right: 80, bottom: 30, left: 50};
    var width = 960 - margin.left - margin.right;
    var height = 500 - margin.top - margin.bottom;

    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width], .1);

    var y = d3.scale.linear()
      .range([height, 0]);

    var color = d3.scale.category20();
	
	var xKeys = data.map(function (i) { return i.x;});
    x.domain(xKeys);
	
	var yKeys = data.map(function(i) {return i.y;});
    y.domain(yKeys);
	
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");
    
    if (options.xUnitFormat != null)
        xAxis.tickFormat(options.xUnitFormat);
    
    var yAxis = d3.svg.axis()
      .scale(y)
      .tickSize(width)
      .orient("right");
	
    var svg = el.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .call(zoom);

	showStandardLegend(el,keys, function(i) { return i; },color,options.legend,height);
  
    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

    var gy = svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);
    
    gy.selectAll("g").
        filter(function (d) { return d; })
        .classed("minor", true);

    gy.selectAll("text")
    .attr("x", 4)
    .attr("dy", -4);

    var point = svg.selectAll(".point")
        .data(data)
        .enter().append("g");
  
  point.append("circle")
       .attr("cx", function (d) {
           return x(d.x) + x.rangeBand() / 2;
       })
      .attr("cy", function (d) { return y(d.y); })
      .attr("r", function () { return 4; })
      .style("fill","white")
      .style("stroke-width", "2")
      .style("stroke", function (d) { return d.color; })
      .style("cursor", "pointer");
}




