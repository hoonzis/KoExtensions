"use strict";
define(['d3','./../charting','./../kotools'], function (d3,charting,koTools) {
    //Takes as input collection of items [data]. Each item has two values [x] and [y].
    //x is the label and y the value which determines the size of the slice of the pie chart.
    charting.pieChart = function(data, element,options) {
        var el = charting.getElementAndCheckData(element, data);
        if (!el) {
            return;
        }

        var defaultOptions = {
            legend: true,
            width: 200,
            height: 150,
            left: 3,
            right:3
        };

        options = koTools.setDefaultOptions(defaultOptions, options);

        //for a piechart only positive values make sense
        data = data.filter(function (i) {
            return i.y > 0;
        });

        if (data.length === 0){
            return;
        }

        var color = options.colors || charting.colors;
        var xKeys = data.map(function (i) { return i.x; });

        //the color scale can be passed from outside...
        if(!options.colors){
            color.domain(xKeys);
        }
        var dims = charting.getDimensions(options, el);

        var outerRadius = Math.min(dims.width, dims.height) / 2 - 3;
        var donut = d3.layout.pie();
        var arc = d3.svg.arc().outerRadius(outerRadius);
        var labelRadius = outerRadius-30;
        var labelArc = d3.svg.arc().outerRadius(labelRadius).innerRadius(labelRadius);

        donut.value(function (d) { return d.y; });
        var sum = d3.sum(data, function (item) { return item.y; });

        //piechart shows the values in the legend as well
        //that's why it passes the whole data collection and both, description and value function provider
        charting.showStandardLegend(el, xKeys, color, options.legend, dims.height);
        var svg = charting.appendContainer(el, dims);
        svg.data([data]);

        var arcs = svg.selectAll("g.arc")
            .data(donut)
          .enter().append("g")
            .attr("class", "arc")
            .attr("transform", "translate(" + outerRadius + "," + outerRadius + ")");

        var arcMouseOver = function(d) {
            d3.select(this).style("stroke", 'white');
            d3.select(this).style("opacity", 1);
            var info = {};
            var value = d.formatted + " (" + koTools.toPercent(d.percentage) + ")";
            info[d.data.x] = value;
            charting.showTooltip(info);
        };

        var arcMouseOut = function() {
            d3.select(this).style("opacity", 0.9);
            charting.hideTooltip();
        };

        arcs.append("path")
            .attr("d", arc)
            .style("fill", function(d) { return color(d.data.x); })
            .style("stroke-width", 2)
            .style("stroke", "white")
            .on("mouseover", arcMouseOver)
            .on("mouseout", arcMouseOut)
            .style("cursor", "pointer")
            .style("opacity",0.9)
            .each(function(d) {
                d.percentage = d.data.y / sum;
                d.formatted = options.yFormat ? options.yFormat(d.data.y) : d.data.y;
            });

        arcs.append("text")
            .attr("transform", function(d) {
                return "translate(" + labelArc.centroid(d) + ")";
            })
            .style("font-family", "sans-serif")
            .style("font-size", 12)
            .style("fill", "#FFFFFF")
            .style("font-weight", "bold")
            .style("text-anchor", "middle")
            //.attr("dy", ".35em")
            .text(function(d) {
                return (d.percentage*100).toCurrencyString("%",1);
            });
    };
});
