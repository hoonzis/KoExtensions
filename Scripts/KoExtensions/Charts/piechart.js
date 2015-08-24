"use strict";
define(['./../charting','./../kotools'], function (charting,koTools) {
    //Takes as input collection of items [data]. Each item has two values [x] and [y].
    //x is the label and y the value which determines the size of the slice of the pie chart.
    charting.pieChart = function(data, element,options) {
        var el = charting.getElementAndCheckData(element, data);
        if (el == null)
            return;

        var defaultOptions = {
            legend: true,
            width: 200,
            height: 200
        };

        options = koTools.setDefaultOptions(defaultOptions, options);

        var color;

        //for a piechart only positive values make sense
        data = data.filter(function (i) {
            return i.y > 0;
        });

        if (data.length == 0)
            return;

        //TODO: why is the color scale passed as paramter
        if (options.colors != null) {
            color = options.colors;
        } else {
            color = d3.scale.category20();
            var keys = data.map(function (item) {
                return item.x;
            });
            color.domain(keys);
        }
   
        var xKeys = data.map(function (i) { return i.x; });
        var dims = charting.getDimensions(options, el, xKeys);

        var outerRadius = Math.min(dims.width, dims.height) / 2 - 3;
        var innerRadius = outerRadius * .3;
        var donut = d3.layout.pie();
        var arc = d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius);
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
            d3.select(this).style("stroke", 'black');
            d3.select(this).style("opacity", 1);
            var info = {};
            var value = d.formatted + " (" + koTools.toPercent(d.percentage) + ")";
            info[d.data.x] = value;
            charting.showTooltip(info);
        }

        var arcMouseOut = function() {
            d3.select(this).style("stroke", 'none');
            d3.select(this).style("opacity", 0.7);
            charting.hideTooltip();
        }

        arcs.append("path")
            .attr("d", arc)
            .style("fill", function(d) { return color(d.data.x); })
            .style("stroke-width", 2)
            .style("stroke", "none")
            .on("mouseover", arcMouseOver)
            .on("mouseout", arcMouseOut)
            .style("cursor", "pointer")
            .style("opacity",0.7)
            .each(function(d) { 
                d.percentage = d.data.y / sum;
                d.formatted = options.unitTransform ? options.unitTransform(d.data.y) : d.data.y;
        });
    }
});


