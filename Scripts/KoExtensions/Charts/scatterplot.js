"use strict";
define(['d3','./../charting','./../kotools'], function (d3,charting,koTools) {
    charting.scatterPlot = function (data, element, options) {
        var defaultOptions = {
            width: 500
        };

        var el = charting.getElementAndCheckData(element, data);
        if (el == null)
            return;

        options = koTools.setDefaultOptions(defaultOptions, options);
        var dims = charting.getDimensions(options, el);

        var color = d3.scale.category20();

        var xKeys = data.map(function (i) { return i.x; });
        var yKeys = data.map(function (i) { return i.y; });

        var xScaleDef = charting.determineXScale(xKeys, null, options);
        var xScale = charting.getXScaleFromConfig(xScaleDef,dims);
        var yScaleDef = charting.determineYScale(yKeys, null, options);
        var yScale = d3.scale.linear().domain([yScaleDef.min, yScaleDef.max]).range([dims.height, 0]);


        var svg = charting.appendContainer(el, dims);
        charting.showStandardLegend(el, xKeys, color, options.legend, dims.height);
        charting.createXAxis(svg, options, xScale, dims);
        charting.createYAxis(svg, options, yScale, dims);

        var point = svg.selectAll(".point")
            .data(data)
            .enter().append("g");

        point.append("circle")
             .attr("cx", function (d) {
                 return xScale(d.x);
             })
            .attr("cy", function (d) { return yScale(d.y); })
            .attr("r", function () { return 4; })
            .style("fill", "white")
            .style("stroke-width", "2")
            .style("stroke", "black")
            .style("cursor", "pointer");
    }
});
