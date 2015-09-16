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
            horizontalLabel: 'x',
            verticalLabel: 'y',
            showDataPoints: true,
            marginCoef: 1.1,
            verticalCursorLine: false,
            xAxisLabel: false,
            yAxisLabel: false,
            xAxisTextAngle: null
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

        var scaleDef = charting.determineXScaleForMultipleLines(data);
        var x = charting.getXScaleFromConfig(scaleDef, dims);
        var getX = function(d) {
            return charting.xGetter(scaleDef, x)(d.x);
        }

        //TODO: calculating y min and max can probably go to the same method that calculates x scale def
        //thus making in on loop only
        var yMin = options.yMin != null ? options.yMin : d3.min(data, function (c) {
            return d3.min(c.values, function (v) { return v.y;});
        });

        var yMax = options.yMax != null ? options.yMax : d3.max(data, function (c) {
            return d3.max(c.values, function (v) { return v.y; });
        });


        //setting up margings. how much more on the bottom and on the top of the chart should be shown
        //bellow or above the max and minimum value - carefull to handle negative max values
        var reversedCoef = 2.0 - options.marginCoef;
        yMax = yMax > 0 ? yMax * options.marginCoef : yMax * reversedCoef;
        yMin = yMin < 0 ? yMin * options.marginCoef : yMin * reversedCoef;

        y.domain([yMin, yMax]);

        var line = d3.svg.line()
          .interpolate("linear")
          .x(getX)
          .y(function (d) { return y(d.y); });

        var svg = charting.appendContainer(el, dims);

        charting.showStandardLegend(el, linenames, color, options.legend, dims.height);

        if (options.xTick) {
            var xValues = scaleDef.xKeys.filter(function (k) {
                return k % options.xTick === 0;
            });
            options.tickValues = xValues;
        }
        charting.createXAxis(svg, options, x, dims);
        charting.createYAxis(svg, options, y, dims);

        var point = svg.selectAll(".point")
            .data(data)
            .enter().append("g")
            .each(function (d) {
                d.values.forEach(
                    function (item) {
                        item.color = getColor(d);
                        item.linename = d.linename;
                    });
            });

        var lines = point.selectAll("circle")
            .data(function (d) {
                return d.values;
            });

        var verticalLine = null;
        var lastMove = new Date();
        var cursorLineMove = function () {
            var now = new Date();
            if (now - lastMove < 50)
                return;

            var coordinates = [0, 0];
            coordinates = d3.mouse(this);
            var x1 = coordinates[0];
            var y1 = coordinates[1];
            
            if (verticalLine == null) {
                verticalLine = svg.append("line")
                    .attr("x1",x1)
                    .attr("y1", 0)
                    .attr("x2", x1)
                    .attr("y2", dims.height)
                    .attr("stroke-width", 2)
                    .attr("stroke", "black");
            } else {
                var current = verticalLine.attr("x1");
                var trans = x1 - current;
                verticalLine.attr("transform", "translate(" + trans + ",0)");
                
                var realY = y.invert(y1);
                var info = { y: realY };
                if (x.invert != null) {
                    var realX = x.invert(x1);
                    info["x"] = realX;
                }
                charting.showTooltip(info);
            }
            lastMove = new Date();
        };

        if (options.verticalCursorLine) {

            svg.append("rect")
              .attr("class", "overlay")
              .attr("width", dims.width)
              .attr("height", dims.height)
              .on("mousemove", cursorLineMove);
        }

        var spMouseOut = function () {
            d3.select(this).style("fill", "white");
            point.style("opacity", 1);
            charting.hideTooltip();
        }

        var lineMouseOver = function(d) {
            var info = {};
            info['line'] = d.linename;
            charting.showTooltip(info);
        }

        var spMouseOver = function (d) {
            var xLabel = d.xLabel != null ? d.xLabel : d.x;
            var info = {};
            info[options.horizontalLabel] = xLabel;
            info[d.linename] = d.y;
            charting.showTooltip(info);

            d3.select(this).style("fill", d.color);
            point.style("opacity", function (item) {
                if (item.x !== d.linename)
                    return 0.4;
                return 1;
            });
        }

        point.append("path")
            .attr("class", "line")
            .attr("d", function(d) {
                return line(d.values);
            })
            .style("stroke-width", function(d) {
                return d.width ? d.width : 2;
            })
            .style("stroke", function(d) {
                return getColor(d);
            })
            .style("fill", "none")
            .on("mouseover", lineMouseOver)
            .on("mouseout", charting.hideTooltip);

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




