﻿"use strict";
define(['d3','./kotools'],function (d3,koTools) {
    var charting = {};

    charting.getElementAndCheckData = function(element, data) {
        var el = d3.select(element);
        if (data === null || data === undefined || data.length === 0) {
            element.innerHTML = "No data available";
            return null;
        }
        element.innerHTML = "";
        return el;
    };

    charting.getLegendWidth = function (data) {
        //when there is no legend, just return 0 pixels
        if (data === null || data.length === 0)
            return 0;
        var maxWidth = d3.max(data, function (el) {
            return el.length;
        });
        //asuming 7px per character
        return maxWidth*7;
    };

    charting.showStandardLegend = function(parent, data, color, showLegend, height) {
        if (showLegend) {
            var maxWidth = charting.getLegendWidth(data);

            //assuming 25 pixels for the small rectangle and 7 pixels per character, rough estimation which more or less works
            var legendWidth = 25 + maxWidth;

    		var size = legendWidth > 70 ? 15 : 18;
    		var fontSize = legendWidth > 70 ? "13px" : "16px";

            var legend = parent
                .append("svg")
                .attr("width", legendWidth)
                .attr("height", height)
                .selectAll("g")
                .data(data)
                .enter().append("g")
                .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

            legend.append("rect")
                .attr("width", size)
                .attr("height", size)
                .style("fill", function(i) { return color(i); });
            legend.append("text")
                .attr("x", 24)
                .attr("y", 9)
				.attr("font-size",fontSize)
                .attr("dy", ".35em")
                .text(function (t) { return t; });
        }
    };

    charting.showTooltip = function(info) {
        var toolTip = d3.select("#toolTip");
        var i = 1;
        for (var key in info) {
            var value = info[key];
            d3.select("#info" + i + "header").text(key);
            if (value !== null) {
                if (koTools.isDate(value)) {
                    d3.select("#info" + i).text(value.toFormattedString());
                } else {
                    d3.select("#info" + i).text(value);
                }
            }

            //make sure this one is shown
            d3.select("#info" + i + "header").style("display", "block");
            d3.select("#info" + i).style("display", "block");

            i++;
        }

        //hide empty ones
        for (var j = 5; j >= i; j--) {
            d3.select("#info" + j + "header").style("display", "none");
            d3.select("#info" + j).style("display", "none");
        }
        toolTip.transition()
            .duration(200)
            .style("opacity", ".9");

        toolTip.style("left", (d3.event.pageX + 15) + "px")
            .style("top", (d3.event.pageY - 75) + "px");
    };

    charting.hideTooltip = function() {
        var toolTip = d3.select("#toolTip");
        toolTip.transition()
            .duration(300)
            .style("opacity", "0");
    };

    charting.initializeCharts = function() {
        var tooltip = d3.select("body").append("div");

        tooltip
            .attr("id", "toolTip")
            .style("width", "150px")
            .style("position", "absolute")
            .style("opacity", 0)
            .style("background-color", "lightgray")
            .style("border-radius", "5px")
            .style("border", "1px solid black")
            .append("div")
            .style("margin", "5px")
            .style("z-index", 100000);


        tooltip.append("div").attr("id", "info1header")
            .attr("class", "header1");

        tooltip.append("div").attr("id", "info1")
            .attr("class", "header2");

        tooltip.append("div").attr("id", "info2header")
            .attr("class", "header1");

        tooltip.append("div").attr("id", "info2")
            .attr("class", "header2");

        tooltip.append("div").attr("id", "info3header")
            .attr("class", "header1");

        tooltip.append("div").attr("id", "info3")
            .attr("class", "header2");

        tooltip.append("div").attr("id", "info4header")
            .attr("class", "header1");

        tooltip.append("div").attr("id", "info4")
            .attr("class", "header2");

    };

    charting.getDimensions = function (options, el, legenKeys) {
        if (options.fillParentController) {
            options.width = koTools.getWidth(el);
            options.height = el.height;
        }
        var dims = {};
        dims.margin = { top: 5, right: 10, bottom: 20 , left: 10 };
        dims.width = options.width ? options.width : 200;
        dims.height = options.height ? options.height : 100;
        dims.containerHeight = dims.height + dims.margin.top + dims.margin.bottom;
        dims.containerWidth = dims.width + dims.margin.left + dims.margin.right;
        if (options.legend) {
            dims.width = dims.containerWidth - charting.getLegendWidth(legenKeys);
        }

        if(options.horizontalSlider){
           var sliderSpace = 25;
            dims.sliderHeight = 20;
            dims.height = dims.containerHeight - dims.sliderHeight - sliderSpace - 25;
            dims.sliderOffset = dims.height + sliderSpace;
        }
        return dims;
    };

    charting.appendContainer = function(el, dims) {
        var svg = el.append("svg")
        .attr("width", dims.containerWidth)
        .attr("height", dims.containerHeight)
      .append("g")
        .attr("transform", "translate(" + dims.margin.left + "," + dims.margin.top + ")");
        return svg;
    };

    charting.createXAxis = function(svg,options,x,dims) {
        var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

        if (options.xUnitFormat)
            xAxis.tickFormat(options.xUnitFormat);

        if (options.tickValues)
            xAxis.tickValues(options.tickValues);

        var xAxisEl = svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + dims.height + ")")
            .call(xAxis);

        if (options.xAxisTextAngle) {
            xAxisEl.selectAll("text")
                .attr("y", 0)
                .attr("x", 9)
                .attr("dy", ".35em")
                .attr("transform", "rotate(" + options.xAxisTextAngle + ")")
                .style("text-anchor", "start");
        }

        if (options.xAxisLabel) {
            svg.append("text")
                .style("font-size", "15px")
                .attr("class", "x label")
                .attr("text-anchor", "end")
                .attr("x", dims.width)
                .attr("y", dims.height + 40)
                .text(options.xAxisLabel);
        }
        return xAxis;
    };

    charting.createYAxis = function (svg, options, yScale, dims) {
        var yAxis = d3.svg.axis().scale(yScale).tickSize(dims.width).orient("right");
        var gy = svg.append("g")
            .attr("class", "y axis")
            .call(yAxis);

        gy.selectAll("g").
            filter(function (d) { return d; })
            .classed("minor", true);

        gy.selectAll("text")
            .attr("x", 4)
            .attr("dy", -4);

        if (options.yAxisLabel) {
            svg.append("text")
                .attr("class", "y label")
                .attr("text-anchor", "end")
                .attr("y", 6)
                .attr("dy", ".75em")
                .style("font-size", "15px")
                .text(options.yAxisLabel)
                .attr("transform", "translate(" + dims.width + "," + 40 + ")rotate(-90)");
        }
        return yAxis;
    };

    charting.determineXScale = function (data, def,options) {
        if (!def) {
            def = {
                allNumbers: true,
                allDates: true,
                min: Number.MAX_VALUE,
                max: Number.MIN_VALUE,
                xKeys:[]
            };
        }

        var newKeys = data.map(function(v) {
            if (!koTools.isNumber(v))
                def.allNumbers = false;
            if (!koTools.isDate(v))
                def.allDates = false;
            if (v < def.min)
                def.min = v;
            if (v > def.max)
                def.max = v;
            return v;
        });

        def.xKeys = def.xKeys.concat(newKeys);
        def.scaleType = def.allNumbers ? 'linear' : def.allDates ? 'date' : 'ordinal';
        def.xUnitFormat = def.allDates ? koTools.getIdealDateFormat([def.min,def.max]) : null;
        if(!options.xUnitFormat){
            options.xUnitFormat = def.xUnitFormat;
        }

        return def;
    };

    charting.getXScaleForMultiLines = function (data,options) {
        var def = null;
        data.forEach(function(i) {
            def = charting.determineXScale(i.values.map(function(v) {
                return v.x;
            }), def,options);
        });
        return def;
    };

    charting.getYScaleDefForMultiline = function(data,options,filteredDomain){
        var def = null;
        data.forEach(function(i) {
            def = charting.determineYScale(i.values.map(function(v) {
                return v.y;
            }), def,options);
        });
        return def;
    };

    charting.determineYScale = function (data, def,options) {
        if (!def) {
            def = {
                min: Number.MAX_VALUE,
                max: Number.MIN_VALUE
            };
        }

        data.forEach(function(v) {
            if (v < def.min)
                def.min = v;
            if (v > def.max)
                def.max = v;
        });

        //setting up margings. how much more on the bottom and on the top of the chart should be shown
        //bellow or above the max and minimum value - carefull to handle negative max values
        if(options.marginCoef){
            var reversedCoef = - options.marginCoef;
            def.max = def.max > 0 ? def.max * options.marginCoef : def.max * reversedCoef;
            def.min = def.min < 0 ? def.min * options.marginCoef : def.min * reversedCoef;
        }

        //the min and max can also be specified in the options directly
        def.min = options.yMin || def.min;
        def.max = options.yMax || def.max;
        return def;
    };

    //takes the result of determineXScale and creates D3 scale
    charting.getXScaleFromConfig = function(def,dims) {
        var x;

        if (def.scaleType === 'linear') {
            x = d3.scale.linear().range([0, dims.width], 0.1);
            x.domain([def.min, def.max]);
        } else if (def.scaleType === 'ordinal') {
            x = d3.scale.ordinal()
                .rangeRoundBands([0, dims.width], 0.1);
            x.domain(def.xKeys);
        } else if (def.scaleType === 'date') {
            x = d3.time.scale().range([0, dims.width], 0.1);
            x.domain([def.min, def.max]);
            x.ticks(10);
        } else {
            throw "invalid scale type";
        }
        return x;
    };

    charting.xGetter = function (scaleDef, x) {
        return function(d) {
            if (scaleDef.scaleType === 'ordinal')
                return x(d) + x.rangeBand() / 2;
            else if (scaleDef.scaleType === 'date' || scaleDef.scaleType === 'linear')
                return x(d);
            throw "invalid Scale Type";
        };
    };

    charting.createVerticalLine = function(svg,x,y){
      return svg.append("line")
          .attr("x1",x)
          .attr("y1", 0)
          .attr("x2", x)
          .attr("y2", y)
          .attr("stroke-width", 2)
          .attr("stroke", "black");
    };

    charting.mouseCoordinates = function(context,x,y){
      var coordinates = d3.mouse(context);
      return {
          x : coordinates[0],
          y : coordinates[1],
          rY: y.invert(coordinates[1]),
          rX: x.invert(coordinates[0])
      };
    };

    charting.moveLine = function(line, x){
      var current = line.attr("x1");
      var trans = x - current;
      line.attr("transform", "translate(" + trans + ",0)");
    };

    charting.createMouseMoveListener = function(svg,dims,callback){
      svg.append("rect")
        .attr("class", "overlay")
        .attr("width", dims.width)
        .attr("height", dims.height)
        .on("mousemove", callback);
    };

    charting.createOrMoveVerticalLine = function(line,svg,dims,x){
      if (!line) {
          return charting.createVerticalLine(svg,x,dims.height);
      } else {
          charting.moveLine(line,x);
          return line;
      }
    };

    return charting;
});
