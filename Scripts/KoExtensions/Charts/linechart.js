"use strict";
define(['./../charting','./../kotools'], function (charting,koTools) {

    //Takes as input collection of items [data]. Each item has two values [x] and [y].
    //[{x:1, receivedEtf:123, tradedEtf:100},{x:2, receivedEtf:200, tradedEtf:100}]
    //[{linename:receivedEtf, values:[x:q1, y:200]}]
    charting.lineChart = function (data, element, options) {
        var el = charting.getElementAndCheckData(element, data);
        if (el == null)
            return;

        var defaultOptions = {
            legend: true,
            width: 200,
            height: 200,
            xUnitName: 'x',
            showDataPoints: true
        }

        options = koTools.setDefaultOptions(defaultOptions, options);

        if (options.normalizeSeries) {
            data = koTools.normalizeSeries(data);
        }


        data.forEach(function (singleLine) {
            if (singleLine.values == null)
                throw "Each line needs to have values property containing tuples of x and y values";
            //sort each line using the x coordinate
            singleLine.values.sort(function (a, b) {
                if (a.x > b.x) return 1;
                if (a.x < b.x) return -1;
                return 0;
            });
        });

        //define all the linenames to compute the legen width approximation
        var linenames = data.map(function (item) { return item.linename; });
        //we need also one color per linename
        var color = d3.scale.category20();
        color.domain(linenames);
        //and helper function to get the color
        var getColor = function (l) {
            if (l.color == null) return color(l.linename);
            return l.color;
        }

        var dims = charting.getDimensions(options, el, linenames);

        var y = d3.scale.linear()
          .range([dims.height, 0]);

        //xKeys - not all the lines have neceseraly the same x values -> concat & filter
        var xKeys = [];

        var allNumbers = true;
        var allDates = true;
        var min = 100000000000000000000;
        var max = -10000000000000000000;

        data.map(function (i) {
            var itemKeys = i.values.map(function (v) {
                if (!koTools.isNumber(v.x))
                    allNumbers = false;
                if (!koTools.isDate(v.x))
                    allDates = false;
                if (v.x < min)
                    min = v.x;
                if (v.x > max)
                    max = v.x;
                return v.x;
            }).filter(function (v) {
                return xKeys.indexOf(v) < 0;
            });

            xKeys = xKeys.concat(itemKeys);
            xKeys.sort();
        });
        var x;

        var scaleType = allNumbers ? 'linear' : allDates ? 'date' : 'ordinal';

        if (scaleType == 'linear') {
            x = d3.scale.linear().range([0, dims.width], .1);
            x.domain([min, max]);
        } else if (scaleType == 'ordinal') {
            x = d3.scale.ordinal()
                .rangeRoundBands([0, dims.width], .1);

            x.domain(xKeys);
        } else if (scaleType == 'date') {
            x = d3.time.scale().range([0, dims.width], .1);
            x.domain([min, max]);
            x.ticks(10);
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

        yMax = yMax > 0 ? yMax * 1.1 : yMax * 0.9;
        yMin = yMin < 0 ? yMin * 1.1 : yMin * 0.9;

        y.domain([yMin, yMax]);

        var yAxis = d3.svg.axis()
          .scale(y)
          .tickSize(dims.width)
          .orient("right");

        var getX = function (d) {
            if (scaleType == 'ordinal')
                return x(d.x) + x.rangeBand() / 2;
            else if (scaleType == 'date' || scaleType == 'linear')
                return x(d.x);
        };

        var line = d3.svg.line()
          .interpolate("linear")
          .x(getX)
          .y(function (d) { return y(d.y); });

        var svg = charting.appendContainer(el, dims);

        charting.showStandardLegend(el, linenames, color, options.legend, dims.height);

        if (options.xTick) {
            var xValues = xKeys.filter(function (k) {
                return k % options.xTick == 0;
            });
            options.tickValues = xValues;
        }
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


        var spMouseOut = function () {
            d3.select(this).style("fill", "white");
            point.style("opacity", 1);
            charting.hideTooltip();
        }

        //TODO: tooltip should show linename
        var spMouseOver = function (d) {
            var xLabel = d.xLabel != null ? d.xLabel : d.x;
            var info = {};
            info[options.xUnitName] = xLabel;
            info[d.name] = d.formattedValue;
            charting.showTooltip(info);
            d3.select(this).style("fill", d.color);

            point.style("opacity", function (item) {
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
            .style("stroke-width", function (d) {
                return d.width ? d.width : 2;
            })
            .style("stroke", function (d) {
                return getColor(d);
            })
            .style("fill", "none");

        if (options.showDataPoints) {

            lines.enter().append("circle")
                .attr("cx", getX)
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
});




