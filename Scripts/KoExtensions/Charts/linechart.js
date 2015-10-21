"use strict";
define(['d3','./../charting','./../kotools'], function (d3,charting,koTools) {

    //Takes as input collection of items [data]. Each item has two values [x] and [y].
    //[{x:1, receivedEtf:123, tradedEtf:100},{x:2, receivedEtf:200, tradedEtf:100}]
    //[{linename:receivedEtf, values:[x:q1, y:200]}]
    charting.lineChart = function (data, element, options) {
        var el = charting.getElementAndCheckData(element, data);
        if (!el)
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
        };

        options = koTools.setDefaultOptions(defaultOptions, options);

        if (options.normalizeSeries) {
            data = koTools.normalizeSeries(data);
        }

        data.forEach(function (singleLine) {
            if (!singleLine.values)
                throw "Each line needs to have values property containing tuples of x and y values";
            //sort each line using the x coordinate
            singleLine.values.sort(function (a, b) {
                if (a.x > b.x) return 1;
                if (a.x < b.x) return -1;
                return 0;
            });
        });

        //define all the linenames to compute thed legen width approximation
        var linenames = data.map(function (item) { return item.linename; });

        //we need also one color per linename
        var color = d3.scale.category20();
        color.domain(linenames);

        //and helper function to get the color
        var getColor = function (l) {
            return l.color ? l.color : color(l.linename);
        };

        var dims = charting.getDimensions(options, el, linenames);

        var y = d3.scale.linear()
          .range([dims.height, 0]);

        var scaleDef = charting.getXScaleForMultiLines(data);
        var x = charting.getXScaleFromConfig(scaleDef, dims);
        var getX = function(d) {
            return charting.xGetter(scaleDef, x)(d.x);
        };

        var yScaleDef = charting.getYScaleDefForMultiline(data,options);

        y.domain([yScaleDef.min, yScaleDef.max]);

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
        var xAxis = charting.createXAxis(svg, options, x, dims);
        var yAxis = charting.createYAxis(svg, options, y, dims);

        //howering over a line will just show a tooltip with line name
        var lineMouseOver = function(d) {
            var info = {};
            info.line = d.linename;
            charting.showTooltip(info);
        };

        var lines = svg.selectAll(".lines")
            .data(data)
            .enter()
            .append("path")
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
            var spMouseOut = function () {
                d3.select(this).style("fill", "white");
                charting.hideTooltip();
            };

            var spMouseOver = function (d) {
                var xLabel = d.xLabel ? d.xLabel : d.x;
                var info = {};
                info[options.horizontalLabel] = xLabel;
                info[d.linename] = d.y;
                charting.showTooltip(info);
                d3.select(this).style("fill", "black");
            };

            var allPoints = data.length == 1 ? data[0].values : data.reduce(function(a,b){return a.values.concat(b.values);});

            var points = svg.selectAll(".point")
                .data(allPoints)
                .enter()
                .append("circle")
                .attr("cx", getX)
                .attr("cy", function (d) { return y(d.y); })
                .attr("r", function () { return 4; })
                .style("fill", "white")
                .style("stroke-width", "2")
                .style("stroke", function (d) { return "black"; })
                .style("cursor", "pointer")
                .on("mouseover", spMouseOver)
                .on("click", spMouseOver)
                .on("mouseout", spMouseOut);
            }

            if (options.verticalCursorLine) {
                var vLine = null;
                var lastMove = new Date();

                var cursorLineMove = function () {
                    var now = new Date();
                    if (now - lastMove < 100)
                        return;
                    lastMove = now;
                    var coord = charting.mouseCoordinates(this,x,y);
                    vLine = charting.createOrMoveVerticalLine(vLine,svg,dims,coord.x);
                    var info = {
                      x:coord.rX,
                      y:coord.rY
                    };
                    charting.showTooltip(info);
                };
                charting.createMouseMoveListener(svg,dims,cursorLineMove);
            }

            if(options.horizontalSlider){
                var context = svg.append("g")
                  .attr("transform", "translate(" + 0 + "," + dims.sliderOffset + ")")
                  .attr("class", "context");

                var slidderScale = charting.getXScaleFromConfig(scaleDef,dims);

                var allTicks = x.ticks();
                var startMin = allTicks[2];
                var startMax = allTicks[7];

                var brush = d3.svg.brush()//for slider bar at the bottom
                   .x(slidderScale)
                   .extent([startMin,startMax])
                   .on("brush", brushed);

                var sliderAxis = d3.svg.axis() // xAxis for brush slider
                   .scale(slidderScale)
                   .orient("bottom");


                context.append("g") // Create brushing xAxis
                   .attr("class", "x axis")
                   .attr("transform", "translate(0," + dims.sliderHeight + ")")
                   .call(sliderAxis);

                var contextArea = d3.svg.area() // Set attributes for area chart in brushing context graph
                 .interpolate("monotone")
                 .x(function(d) { return slidderScale(d.x); }) // x is scaled to xScale2
                 .y0(dims.sliderHeight) // Bottom line begins at height2 (area chart not inverted)
                 .y1(0); // Top line of area, 0 (area chart not inverted)

               //plot the rect as the bar at the bottom
               context.append("path") // Path is created using svg.area details
                 .attr("class", "area")
                 .attr("d", contextArea(data[0].values)) // pass first categories data .values to area path generator
                 .attr("fill", "#F1F1F2");

               //append the brush for the selection of subsection
               context.append("g")
                 .attr("class", "x brush")
                 .call(brush)
                 .selectAll("rect")
                 .attr("height", dims.sliderHeight) // Make brush rects same height
                 .attr("fill", "#1f77b4")
                 .attr("rx", "5");


                   //for brusher of the slider bar at the bottom
                  function brushed() {

                    var filteredDomain = brush.empty() ? x.domain() : brush.extent();
                    x.domain(filteredDomain); // If brush is empty then reset the Xscale domain to default, if not then make it the brush extent

                    svg.select(".x.axis") // replot xAxis with transition when brush used
                          .transition()
                          .call(xAxis);

                    var yScaleDef = charting.getYScaleDefForMultiline(data,options,filteredDomain);
                    y.domain([yScaleDef.min,yScaleDef.max]); // Redefine yAxis domain based on highest y value of categories data with "visible"; true

                    svg.select(".y.axis") // Redraw yAxis
                      .transition()
                      .call(yAxis);

                    lines.transition()
                      .attr("d", function(d){
                          return line(d.values);
                      });

                      if(points){
                        points.transition()
                          .attr("cx", getX)
                          .attr("cy", function (d) { return y(d.y); });
                      }
                  }
            }

    };
});
