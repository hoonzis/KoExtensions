//Takes as input collection of items [data]. Each item has two values [x] and [y].
//[{x:1, receivedEtf:123, tradedEtf:100},{x:2, receivedEtf:200, tradedEtf:100}]
//[{linename:receivedEtf, values:[x:q1, y:200]}]
function lineChart(data, element, options) {

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

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");
    
    if (options.xLabel != null)
        xAxis.tickFormat(options.xLabel);
    
    var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");

    var line = d3.svg.line()
      .interpolate("linear")
      .x(function(d) { return x(d.x) + x.rangeBand() / 2; })
      .y(function(d) { return y(d.y); });

    var svg = el.append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var xKeys = [];
    data.map(function (i) {
        var itemKeys = i.values.map(function(v) {
            return v.x;
        }).filter(function(v) {
            return xKeys.indexOf(v) < 0;
        });

        xKeys = xKeys.concat(itemKeys);
    });
    x.domain(xKeys);

    y.domain([
        d3.min(data, function (c) {
            return d3.min(c.values, function (v) {
                if(v.y < 0)
                    return v.y;
                return 0;
            });
        }),
        d3.max(data, function (c) {
            return d3.max(c.values,
                function (v) { return v.y; });
        })
    ]);

    var keys = data.map(function(item) { return item.x; });
    color.domain(keys);
    showStandardLegend(el,keys, function(i) { return i; },color,options.legend,height);
  
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
        .attr("class", "point")
        .each(function (d) {d.values.forEach(
            function (item) {
                item.color = color(d.x);
                if(item.formattedValue!= null)
                    return;
                if(item.name == null)
                  item.name = d.x;
                var formattedValue = item.y;
                if (options.unitTransform != null)
                    formattedValue = options.unitTransform(item.y);
                item.formattedValue = formattedValue;
            });
        });

        var lines = point.selectAll("circle")
    //need to add a color for each point 
    .data(function (d) { return d.values; });

  lines.enter().append("circle")
     .attr("cx", function (d) {
         return x(d.x) + x.rangeBand() / 2;
     })
    .attr("cy", function (d) { return y(d.y); })
    .attr("r", function (d) { return 6; })
    .style("fill", function(d) { return d.color;})
    .style("stroke-width", "5")
    .style("stroke", function (d) { return d.color; })
    .style("cursor", "pointer")
    .on("mouseover", singlepoint_mouseover)
    .on("click", singlepoint_mouseover)
    .on("mouseout", singlepoint_mouseout);
    
  point.append("path")
      .attr("class", "line")
      .attr("d", function(d) { return line(d.values); })
      .style("stroke-width", 2)
      .style("stroke", function(d) { return color(d.x); })
      .style("fill","none");

    /*
  point.append("text")
      .datum(function(d) { return {name: d.x, value: d.values[d.values.length - 1]}; })
      .attr("transform", function(d) { return "translate(" + x(d.value.x) + "," + y(d.value.y) + ")"; })
      .attr("x", 3)
      .attr("dy", ".35em")
      .text(function(d) { return d.x; });*/
}


function singlepoint_mouseout(d) {
    d3.select(this).style("stroke", d.color);
    hideTooltip();
}

function singlepoint_mouseover(d) {
    var xLabel = d.xLabel != null ? d.xLabel : d.x;
    var info = {
        "Quarter": xLabel
    };
    info[d.name] = d.formattedValue;
    showTooltip(info);
    d3.select(this).style("stroke", 'black');
}