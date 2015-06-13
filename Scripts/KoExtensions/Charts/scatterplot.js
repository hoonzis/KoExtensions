//Takes as input collection of items [data]. Each item has two values [x] and [y].
//[{x:1, receivedEtf:123, tradedEtf:100},{x:2, receivedEtf:200, tradedEtf:100}]
//[{linename:receivedEtf, values:[x:q1, y:200]}]
function drawScatterPlot(data, element, options, charting) {
    var el = charting.getElementAndCheckData(element, data);
    if (el == null)
        return;

    var dims = charting.getDimensions(options, el);

    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width], .1);

    var y = d3.scale.linear()
      .range([height, 0]);

    var color = d3.scale.category20();
	
	var xKeys = data.map(function (i) { return i.x;});
    x.domain(xKeys);
	
	var yKeys = data.map(function(i) {return i.y;});
    y.domain(yKeys);
	
    var yAxis = d3.svg.axis()
      .scale(y)
      .tickSize(width)
      .orient("right");

    var svg = el.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	charting.showStandardLegend(el,keys, function(i) { return i; },color,options.legend,height);

    charting.createXAxis(svg, options, x, dims);

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




