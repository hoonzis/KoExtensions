"use strict";
define(['./../charting','./../kotools'], function (charting,koTools) {
    //accepts and array of objects. one property of each object is used as the x-coordinate 
    //(determined by the xcoord option, which by default is set to 'x')
    //the rest of the properties is stacked to the chart
    charting.barChart = function (data, element, options, lineData) {
        var el = charting.getElementAndCheckData(element, data);
        if (el == null)
            return;

        var defaultOptions = {
            legend: true,
            width: 600,
            height: 200,
            xUnitName: 'x',
            itemName: 'Item',
            xcoord: 'x'
        };

        options = koTools.setDefaultOptions(defaultOptions, options);
        var xcoord = options.xcoord;
        var dims = charting.getDimensions(options, el);

        var x = d3.scale.ordinal()
            .rangeRoundBands([0, dims.width], .3);

        var y = d3.scale.linear()
            .rangeRound([dims.height, 0]);

        var color = d3.scale.category20();


        var yAxis = d3.svg.axis()
            .scale(y)
            .tickSize(dims.width)
            .orient("right");

        // not all the items do have the same set of properties, therefor scan them all and concatenate the result
        var keys = [];
        data.map(function (i) {
            var itemKeys = d3.keys(i).filter(function (key) { return key != xcoord && keys.indexOf(key) < 0; });
            keys = keys.concat(itemKeys);
        });
        color.domain(keys);

        //runs overs all the data. copies the result to a new array
        var arranged = [];
        var arrangedByX = {};
        data.forEach(function (d) {
            var newD = { x: d[xcoord] };
            var y0Neg = 0;
            var y0Pos = 0;


            var values = [];
            color.domain().forEach(function (m) {

                if (d[m] == 0 || d[m] == null)
                    return;
                var xLabel = newD.x;
                if (options.xUnitFormat != null)
                    xLabel = options.xUnitFormat(newD.x);
                var formattedValue = d[m];
                if (options.unitTransform != null)
                    formattedValue = options.unitTransform(d[m]);

                if (d[m] > 0) {
                    values.push({ name: m, y0: y0Pos, y1: y0Pos += +d[m], val: d[m], x: newD.x, xLabel: xLabel, xUnitName: options.xUnitName, formattedValue: formattedValue });
                } else {
                    var y1 = y0Neg;
                    values.push({ name: m, y0: y0Neg += d[m], y1: y1, val: d[m], x: newD.x, xLabel: xLabel, xUnitName: options.xUnitName, formattedValue: formattedValue });
                }
            });

            newD.values = values;
            newD.totalPositive = d3.max(newD.values, function (v) { return v.y1; });
            newD.totalNegative = d3.min(newD.values, function (v) { return v.y0; });
            arranged.push(newD);
            arrangedByX[newD.x] = newD;
        });

        charting.showStandardLegend(el, keys, function (item) { return item; }, color, options.legend, dims.height);

        var svg = charting.appendContainer(el, dims);

        var xKeys = arranged.map(function (d) { return d.x; });
        x.domain(xKeys);
        if (options.style == "stack") {
            y.domain([
                d3.min(arranged, function (d) { return d.totalNegative; }), d3.max(arranged, function (d) {
                    if (d == null)
                        return 0;
                    return d.totalPositive;
                })
            ]);
        } else {
            y.domain(
            [
                d3.min(arranged, function (d) {
                    return d3.min(d.values,
                        function (i) {
                            if (i.val < 0)
                                return i.val;
                            return 0;
                        });
                }),
                d3.max(arranged, function (d) {
                    return d3.max(d.values,
                        function (i) { return i.val; });
                })
            ]);
        }

        //for the groupped chart
        var x1 = d3.scale.ordinal();
        x1.domain(keys).rangeRoundBands([0, x.rangeBand()]);

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

        var onBarOver = function (d) {
            var column = arrangedByX[d.x];

            d3.select(this).style("stroke", 'black');
            d3.select(this).style("opacity", 1);
            var info = {};
            info[options.xUnitName] = d.xLabel;
            info[d.name] = d.formattedValue;
            if (column.totalNegative == 0)
                info[d.name] += " (" + koTools.toPercent(d.val / column.totalPositive) + ")";
            charting.showTooltip(info);
        }

        var onPointOver = function (d) {
            d3.select(this).style("fill", "blue");
            var info = {};
            var unitName = d.xUnitName;
            if (unitName == null)
                unitName = 'x';
            info[unitName] = d.xLabel;
            if (options.lineFormatter != null)
                info[d.name] = options.lineFormatter(d.y);
            else
                info[d.name] = d.y;
            charting.showTooltip(info);
        }

        var onPointOut = function () {
            d3.select(this).style("fill", "white");
            charting.hideTooltip();
        }

        var onBarOut = function () {
            d3.select(this).style("stroke", 'none');
            d3.select(this).style("opacity", 0.8);
            charting.hideTooltip();
        }

        var group = svg.selectAll(".xVal")
            .data(arranged)
            .enter().append("g")
            .attr("class", "g")
            .attr("transform", function (d) { return "translate(" + x(d.x) + ",0)"; });

        if (options.style == "stack") {
            group.selectAll("rect")
                .data(function (d) { return d.values; })
                .enter().append("rect")
                .attr("width", x.rangeBand())
                .attr("y", function (d) { return y(d.y1); })
                .attr("height", function (d) { return y(d.y0) - y(d.y1); })
                .on("mouseover", onBarOver)
                .on("mouseout", onBarOut)
                .style("opacity", 0.8)
                .style("cursor", "pointer")
                .style("fill", function (d) {
                    return color(d.name);
                });

        } else {
            group.selectAll("rect")
                .data(function (d) {
                    return d.values;
                })
                .enter().append("rect")
                .attr("width", x1.rangeBand())
                .attr("x", function (d) {
                    return x1(d.name);
                })
                .attr("y", function (d) {
                    return y(d.val);
                })
                .attr("height", function (d) {
                    return dims.height - y(d.val);
                })
                .style("cursor", "pointer")
                .on("mouseover", onBarOver)
                .on("mouseout", onBarOut)
                .style("fill", function (d) { return color(d.name); });
        }

        //Add the single line
        if (lineData == null || lineData.length == 0)
            return;

        var lineY = d3.scale.linear()
            .range([dims.height, 0]);

        var line = d3.svg.line()
            .interpolate("linear")
            .x(function (d) {
                return x(d.x) + x.rangeBand() / 2;
            })
            .y(function (d) {
                return lineY(d.y);
            });

        //in some cases it makes sense to use the same scale for both
        //typically the cash-flow chart
        //for other cases (line  volumne / units correlations a separate scale should be used for each)
        if (!options.sameScaleLinesAndBars) {
            lineY.domain([
                0,
                d3.max(lineData, function (v) { return v.y; })
            ]);
        } else {
            lineY.domain(y.domain());
        }


        var yAxisRight = d3.svg.axis()
            .scale(lineY)
            .orient("right");

        svg.append("g")
            .call(yAxisRight)
            .attr("transform", "translate(" + dims.width + " ,0)");


        svg.append("path")
            .attr("d", line(lineData))
            .style("stroke", "blue")
            .style("stroke-width", 2)
            .style("fill", "none");

        var circles = svg.selectAll("circle")
            .data(lineData)
            .enter()
            .append("circle");

        circles.attr("cx", function (d) { return x(d.x) + x.rangeBand() / 2; })
            .attr("cy", function (d) { return lineY(d.y); })
            .attr("r", function () { return 4; })
            .style("fill", "white")
            .style("stroke-width", 2)
            .style("stroke", "blue")
            .style("cursor", "pointer")
            .on("mouseover", onPointOver)
            .on("mouseout", onPointOut);
    }
});