"use strict";
define(['./../charting','./../kotools'], function (charting,koTools) {
    charting.bubbleChart = function (data, element, options) {
        var el = charting.getElementAndCheckData(element, data);
        if (el == null)
            return;

        var dims = charting.getDimensions(options, el);

        var maxY = d3.max(data, options.bubbleVertical);
        var horizontalValues = data.map(options.bubbleHorizontal);

        var bubbleSizes = data.map(options.bubbleSize);
        bubbleSizes.sort(d3.ascending);
        var maxBubbleSize = d3.quantile(bubbleSizes, 0.95);

        var xScaleDef = charting.determineXScale(horizontalValues, null);
        var xScale = charting.getXScaleFromConfig(xScaleDef,dims);
        var yScale = d3.scale.linear().domain([0, maxY]).range([dims.height, 0]);
        var radiusScale = d3.scale.pow().exponent(.4).domain([0, maxBubbleSize]).range([0, 60]).clamp(true);

        var colors = koTools.distinct(data, options.bubbleColor);
        var colorScale = d3.scale.category20().domain(colors);


        charting.showStandardLegend(el, colors, colorScale, true, dims.height);
        var svg = charting.appendContainer(el, dims);

        charting.createXAxis(svg, options, xScale, dims);
        charting.createYAxis(svg, options, yScale, dims);
        
        var bubblenodeMouseout = function () {
            charting.hideTooltip();
        };

        var bubblenodeMouseover = function (d) {
            var info = {
                "Type:": options.bubbleColor(d),
                "Value": options.bubbleSize(d)
            };
            charting.showTooltip(info);
        }

        var xGetter = charting.xGetter(xScaleDef, xScale);

        svg.append("g")
            .attr("class", "dots")
        .selectAll(".dot")
            .data(data)
        .enter().append("circle")
            .attr("class", "dot")
            .style("fill", function (d) { return colorScale(options.bubbleColor(d)); })
            .style("opacity", 0.8)
            .attr("cx", function (d) { return xGetter(options.bubbleHorizontal(d)); })
            .attr("cy", function (d) { return yScale(options.bubbleVertical(d)); })
            .attr("r", function (d) { return radiusScale(options.bubbleSize(d)); })
            .on("mouseover", bubblenodeMouseover)
            .on("click", bubblenodeMouseover)
            .on("mouseout", bubblenodeMouseout);
    }
});
