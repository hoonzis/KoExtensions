"use strict";
define(['d3', './../charting', './../kotools'], function (d3, charting, koTools) {

    //Takes as input collection of items [data]. Each item has two values [x] and [y].
    //[{x:1, receivedEtf:123, tradedEtf:100},{x:2, receivedEtf:200, tradedEtf:100}]
    //[{linename:receivedEtf, values:[x:q1, y:200]}]
    charting.lineChart = function (data, element, options) {
        var el = charting.getElementAndCheckData(element, data);
        if (!el) {
            return;
        }

        var defaultOptions = {
            legend: true,
            width: 200,
            height: 200,
            horizontalLabel: 'x',
            verticalLabel: 'y',
            showDataPoints: true,
            verticalCursorLine: false,
            xAxisLabel: false,
            yAxisLabel: false,
            xAxisTextAngle: null
        };

        options = koTools.setDefaultOptions(defaultOptions, options);

        if (options.normalizeSeries) {
            data = koTools.normalizeSeries(data);
        }

        data.forEach(function (singleLine) {
            if (!singleLine.values) {
                throw "Each line needs to have values property containing tuples of x and y values";
            }

            //sort each line using the x coordinate
            singleLine.values.sort(function (a, b) {
                return d3.ascending(a.x, b.x);
            });

            singleLine.values.forEach(function (d) {
                d.linename = singleLine.linename;
            });
        });

        // define all the linenames to compute thed legen width approximation
        var linenames = data.map(function (item) { return item.linename; });

        // points collection will be initilized only if the users wants to see the line points
        var points = null;

        //we need also one color per linename
        var color = d3.scale.category20();
        color.domain(linenames);

        //and helper function to get the color
        var getColor = function (l) {
            return l.color || color(l.linename);
        };

        var dims = charting.getDimensions(options, el, linenames);

        var y = d3.scale.linear()
            .range([dims.height, 0]);

        var scaleDef = charting.getXScaleForMultiLines(data, options);
        var x = charting.getXScaleFromConfig(scaleDef, dims);
        var getX = function (d) {
            return charting.xGetter(scaleDef, x)(d.x);
        };

        var yScaleDef = charting.getYScaleDefForMultiline(data, options);

        y.domain([yScaleDef.min, yScaleDef.max]);

        var line = d3.svg.line()
            .interpolate("linear")
            .x(getX)
            .y(function (d) { return y(d.y); });

        var svg = charting.appendContainer(el, dims);

        charting.showStandardLegend(el, linenames, color, options, dims);

        if (options.xTick) {
            var xValues = scaleDef.xKeys.filter(function (k) {
                return k % options.xTick === 0;
            });
            options.tickValues = xValues;
        }
        var xAxis = charting.createXAxis(svg, options, x, dims);
        var yAxis = charting.createYAxis(svg, options, y, dims);

        //howering over a line will just show a tooltip with line name
        var lineMouseOver = function (d) {
            var info = {};
            // TODO: would be good to have the y value here
            info[d.linename] = "";
            charting.showTooltip(info);
        };

        var lines = svg.selectAll(".lines")
            .data(data)
            .enter()
            .append("path")
            .attr("class", "line")
            .attr("d", function (d) {
                return line(d.values);
            })
            .style("stroke-width", function (d) {
                return d.width || 2;
            })
            .style("stroke", function (d) {
                return getColor(d);
            })
            .style("fill", "none")
            .on("mouseover", lineMouseOver)
            .on("mouseout", charting.hideTooltip)
            .attr("clip-path", "url(#clip)");

        if (options.showDataPoints) {

            var allPoints = data.length === 1 ? data[0].values : data.reduce(function(a, b) {
                if (a.values) {
                    return a.values.concat(b.values);
                }
                return a.concat(b.values);
            });

            points = svg.selectAll(".point")
                .data(allPoints)
                .enter()
                .append("circle")
                .attr("cx", getX)
                .attr("cy", function (d) { return y(d.y); })
                .attr("r", function () { return 3; })
                .style("fill", "white")
                .style("stroke-width", "1")
                .style("stroke", "black")
                .style("cursor", "pointer")
                .on("mouseover", function(d) { charting.singlePointOver(this, options, d);})
                .on("click", function(d) { charting.singlePointOver(this, options, d);})
                .on("mouseout", function() { charting.singlePointOut(this);})
                .attr("clip-path", "url(#clip)");
        }

        if (options.horizontalSlider) {
            var context = svg.append("g")
                .attr("transform", "translate(" + "0" + "," + dims.sliderOffset + ")")
                .attr("class", "context");

            var slidderScale = charting.getXScaleFromConfig(scaleDef, dims);

            var allTicks = x.ticks();
            var startMin = allTicks[2];
            var startMax = allTicks[7];

            var brush = d3.svg.brush()
                .x(slidderScale)
                .extent([startMin, startMax]);

            var brushed = function () {
                var filteredDomain = brush.empty() ? slidderScale.domain() : brush.extent();
                x.domain(filteredDomain);

                var axis = svg.select(".x.axis");
                axis.transition().call(xAxis);
                charting.rotateAxisText(axis, options);
                charting.xAxisStyle(axis);

                yScaleDef = charting.getYScaleDefForMultiline(data, options, filteredDomain);
                y.domain([yScaleDef.min, yScaleDef.max]);

                axis = svg.select(".y.axis");
                axis.transition().call(yAxis);
                charting.yAxisStyle(axis);

                lines.transition()
                    .attr("d", function (d) {
                        return line(d.values);
                    });

                if (points) {
                    points.transition()
                        .attr("cx", getX)
                        .attr("cy", function (d) { return y(d.y); });
                }
            };

            brush.on("brush", brushed);

            var sliderAxis = d3.svg.axis()
                .scale(slidderScale)
                .tickFormat(options.xFormat)
                .orient("bottom");

            var sliderAxisElement = context.append("g")
                .attr("class", "x sliderAxis")
                .attr("transform", "translate(0," + dims.sliderHeight + ")")
                .call(sliderAxis);
            charting.xAxisStyle(sliderAxisElement);
            charting.rotateAxisText(sliderAxisElement, options);

            svg.append("defs")
                .append("clipPath")
                .attr("id", "clip")
                .append("rect")
                .attr("width", dims.width)
                .attr("height", dims.height);

            var contextArea = d3.svg.area()
                .interpolate("monotone")
                .x(function (d) { return slidderScale(d.x); })
                .y0(dims.sliderHeight)
                .y1(0);

            context.append("path")
                .attr("class", "area")
                .attr("d", contextArea(data[0].values))
                .attr("fill", "#F1F1F2");

            context.append("g")
                .attr("class", "x brush")
                .call(brush)
                .selectAll("rect")
                .attr("height", dims.sliderHeight)
                .attr("fill", "#1f77b4")
                .attr("rx", "5");
        }
    };
});
