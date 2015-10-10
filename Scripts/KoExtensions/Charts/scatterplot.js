"use strict";
define(['d3','./../charting','./../kotools'], function (d3,charting,koTools) {
    charting.scatterPlot = function (data, element, options) {
        var defaultOptions = {
            bins: 80,
            width: 500
        };

        var el = charting.getElementAndCheckData(element, data);
        if (el == null)
            return;

        options = koTools.setDefaultOptions(defaultOptions, options);
        var dims = charting.getDimensions(options, el);

        var x = d3.scale.ordinal()
            .rangeRoundBands([0, dims.width], 0.1);

        var y = d3.scale.linear()
          .range([dims.height, 0]);

        var color = d3.scale.category20();

        var xKeys = data.map(function (i) { return i.x; });
        x.domain(xKeys);

        var yKeys = data.map(function (i) { return i.y; });
        y.domain(yKeys);

        var yAxis = d3.svg.axis()
          .scale(y)
          .tickSize(dims.width)
          .orient("right");

        var svg = charting.appendContainer(el, dims);

        charting.showStandardLegend(el, xKeys, color, options.legend, dims.height);

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
            .style("fill", "white")
            .style("stroke-width", "2")
            .style("stroke", function (d) { return d.color; })
            .style("cursor", "pointer");
    }
});
