//draw a scatterplot, expects an array of objects {x:10,y:50}
//x axis is ordinary, y axis is linear
function scatterplot(data, element, options) {
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
    y.domain([d3.min(yKeys),d3.max(yKeys)]);
	
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
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  
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
      .style("fill","black")
      .style("stroke-width", "2")
      .style("stroke", function (d) { return d.color; })
      .style("cursor", "pointer");
}




