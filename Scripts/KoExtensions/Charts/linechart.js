//Takes as input collection of items [data]. Each item has two values [x] and [y].
//[{x:1, receivedEtf:123, tradedEtf:100},{x:2, receivedEtf:200, tradedEtf:100}]
//[{linename:receivedEtf, values:[x:q1, y:200]}]
function drawLineChart(data, element, options,charting) {
    var el = charting.getElementAndCheckData(element, data);
    if (el == null)
        return;

    var defaultOptions = {
        legend: true,
        width: 200,
        height: 200,
        xUnitName: 'x',
        showDataPoints:true
    }

    options = koTools.setDefaultOptions(defaultOptions, options);

    if (options.normalizeSeries) {
        data = koTools.normalizeSeries(data);
    }
  
    var dims = charting.getDimensions(options,el);
    data.forEach(function (singleLine) {
        if (singleLine.values == null)
            throw "Each line needs to have values property containing tuples of x and y values";
    });

    var x = d3.scale.ordinal()
        .rangeRoundBands([0, dims.width], .1);

    var y = d3.scale.linear()
      .range([dims.height, 0]);

    var color = d3.scale.category20();

    var getColor = function(l) {
        if (l.color == null) return color(l.x);
        return l.color;
    }


    //xKeys - not all the lines have neceseraly the same x values -> concat & filter
    var xKeys = [];
    data.map(function (i) {
        var itemKeys = i.values.map(function (v) {
            return v.x;
        }).filter(function (v) {
            return xKeys.indexOf(v) < 0;
        });

        xKeys = xKeys.concat(itemKeys);
    });
    x.domain(xKeys);

    if (options.numberOfTicks) {
        var minX = d3.min(xKeys);
        var maxX = d3.max(xKeys);

        options.tickSize = (maxX - minX) / options.numberOfTicks;
    }

    var yMin = options.yMin != null ? options.yMin : d3.min(data, function (c) {
        return d3.min(c.values, function (v) {
            if (v.y < 0)
                return v.y;
            return 0;
        });
    });

    var yMax = options.yMax != null ? options.yMax : d3.max(data, function (c) {
        return d3.max(c.values,
            function (v) { return v.y; });
    });
    y.domain([yMin,yMax]);

    var yAxis = d3.svg.axis()
      .scale(y)
      .tickSize(dims.width)
      .orient("right");

    x.invert = function(xPos) {
        var leftEdges = x.range();
        var rangeWidth = x.rangeBand();
        var j;
        for (j = 0; xPos > (leftEdges[j] + rangeWidth) ; j++) {
        }
        return j;
    };

    var line = d3.svg.line()
      .interpolate("linear")
      .x(function(d) { return x(d.x) + x.rangeBand() / 2; })
      .y(function(d) { return y(d.y); });

    var svg = charting.appendContainer(el, dims);

    var keys = data.map(function(item) { return item.x; });
    color.domain(keys);
    charting.showStandardLegend(el,keys, function(i) { return i; },color,options.legend,dims.height);

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
        .enter().append("g")
        .each(function (d) {
            d.values.forEach(
                function (item) {
                    item.color = getColor(d);
                    if (item.formattedValue != null)
                        return;
                    if (item.name == null)
                        item.name = d.x;
                    var formattedValue = item.y;
                    if (options.unitTransform != null)
                        formattedValue = options.unitTransform(item.y);
                    item.formattedValue = formattedValue;
                });
        });
    
    var lines = point.selectAll("circle")
        .data(function (d) {
            return d.values;
        });

    
    var spMouseOut = function() {
        d3.select(this).style("fill", "white");
        point.style("opacity", 1);
        charting.hideTooltip();
    }

    var spMouseOver = function (d) {
        var xLabel = d.xLabel != null ? d.xLabel : d.x;
        var info = {};
        info[options.xUnitName] = xLabel;
        info[d.name] = d.formattedValue;
        charting.showTooltip(info);
        d3.select(this).style("fill", d.color);

        point.style("opacity", function(item) {
            if (item.x != d.linename)
                return 0.4;
            return 1;
        });
    }
  
  point.append("path")
      .attr("class", "line")
      .attr("d", function (d) {
          return line(d.values);
      })
      .style("stroke-width", 2)
      .style("stroke", function (d) {
          return getColor(d);
      })
      .style("fill", "none");

  if (options.showDataPoints) {

      lines.enter().append("circle")
           .attr("cx", function (d) {
               return x(d.x) + x.rangeBand() / 2;
           })
          .attr("cy", function (d) { return y(d.y); })
          .attr("r", function () { return 4; })
          .style("fill", "white")
          .style("stroke-width", "2")
          .style("stroke", function (d) { return d.color; })
          .style("cursor", "pointer")
          .on("mouseover", spMouseOver)
          .on("click", spMouseOver)
          .on("mouseout", spMouseOut);
  }
}




