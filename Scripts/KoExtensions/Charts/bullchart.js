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

        var xScale = d3.scale.ordinal().domain(horizontalValues).rangeRoundBands([0, width], .1);
        var yScale = d3.scale.sqrt().domain([0, maxY]).range([height, 0]);
        var radiusScale = d3.scale.pow().exponent(.4).domain([0, maxBubbleSize]).range([0, 60]).clamp(true);

        var colors = koTools.distinct(data, options.bubbleColor);
        var colorScale = d3.scale.category20().domain(colors);


        var yAxis = d3.svg.axis().scale(yScale).tickSize(width).orient("right");

        charting.showStandardLegend(el, colors, colorScale, true, height);

        var svg = el.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
        .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

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

        svg.append("text")
            .style("font-size", "15px")
            .attr("class", "x label")
            .attr("text-anchor", "end")
            .attr("x", width)
            .attr("y", height + 40)
            .text("Quarter");

        svg.append("text")
            .attr("class", "y label")
            .attr("text-anchor", "end")
            .attr("y", 6)
            .attr("dy", ".75em")
            .style("font-size", "15px")
            .text("# of deals")
            .attr("transform", "translate(" + width + "," + 40 + ")rotate(-90)");


        var bubblenodeMouseout = function () {
            charting.hideTooltip();
        };

        //todo: remove these references
        var bubblenodeMouseover = function (d) {
            var avgDealSize = statsVM.values.formatters["Traded Notional"](d.avgDealSize);
            var totalNotional = statsVM.values.formatters["Traded Notional"](d.notional);
            var info = {
                "Strategy:": d.strategyType,
                "Avg deal size": avgDealSize,
                "# Deals": d.deals,
                "Total Notional:": totalNotional
            };
            charting.showTooltip(info);
        }

        svg.append("g")
            .attr("class", "dots")
        .selectAll(".dot")
            .data(data)
        .enter().append("circle")
            .attr("class", "dot")
            .style("fill", function (d) { return colorScale(options.bubbleColor(d)); })
            .style("opacity", 0.8)
            .attr("cx", function (d) { return xScale(options.bubbleHorizontal(d)) + xScale.rangeBand() / 2; })
            .attr("cy", function (d) { return yScale(options.bubbleVertical(d)); })
            .attr("r", function (d) { return radiusScale(options.bubbleSize(d)); })
            .on("mouseover", bubblenodeMouseover)
            .on("click", bubblenodeMouseover)
            .on("mouseout", bubblenodeMouseout);
    }
});
