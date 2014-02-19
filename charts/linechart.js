//Takes as input collection of items [data]. Each item has two values [x] and [y].
//[{x:1, receivedEtf:123, tradedEtf:100},{x:2, receivedEtf:200, tradedEtf:100}]
//[{linename:receivedEtf, values:[x:q1, y:200]}]
function lineChart(width, height, data, element, showLegend) {

  var el = getElementAndCheckData(element,data);
    if (el == null)
        return;

  //TODO: paramteres to width, height
  var margin = {top: 20, right: 80, bottom: 30, left: 50},
      width = 600 - margin.left - margin.right,
      height = 300 - margin.top - margin.bottom;

  //TODO: if X is linear we won't support names for months etc
  var x = d3.scale.linear()
      .range([0, width]);

  var y = d3.scale.linear()
      .range([height, 0]);

  var color = d3.scale.category20();

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");

  var line = d3.svg.line()
      .interpolate("linear")
      .x(function(d) { return x(d.x); })
      .y(function(d) { return y(d.y); });

  var svg = el.append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  x.domain([
    d3.min(data, function(c) { return d3.min(c.values, function(v) { return v.x; }); }),
    d3.max(data, function(c) { return d3.max(c.values, function(v) { return v.x; }); })
  ]);

  y.domain([
    d3.min(data, function(c) { return d3.min(c.values, function(v) { return v.y; }); }),
    d3.max(data, function(c) { return d3.max(c.values, function(v) { return v.y; }); })
  ]);

  var keys = data.map(function(item) { return item.x});
  color.domain(keys);
  showStandardLegend(el,keys, function(i) { return i},color,showLegend,height);
  
  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Y - value");

  var point = svg.selectAll(".point")
      .data(data)
    .enter().append("g")
      .attr("class", "point");

  point.append("path")
      .attr("class", "line")
      .attr("d", function(d) { 
        return line(d.values); 
      })
      .style("stroke-width", 2)
      .style("stroke", function(d) { return color(d.x); })
      .style("fill","none");

  //TODO: do something with the data

  point.append("text")
      .datum(function(d) { return {name: d.x, value: d.values[d.values.length - 1]}; })
      .attr("transform", function(d) { return "translate(" + x(d.value.x) + "," + y(d.value.y) + ")"; })
      .attr("x", 3)
      .attr("dy", ".35em")
      .text(function(d) { return d.x; });
} 