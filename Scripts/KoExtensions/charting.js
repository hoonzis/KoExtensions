"use strict";
define(['d3','./kotools'], function (d3,koTools) {
    var charting = {};

    charting.colors = d3.scale.ordinal().range(["#1f77b4", "#2ca02c", "#d62728", "#393b79", "#ff7f0e", "#8c564b", "#843c39"]);

    charting.getElementAndCheckData = function (element, data) {
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
        if (!data || data.length === 0) {
            return 0;
        }
        var maxWidth = d3.max(data, function (el) {
            return el.length;
        });
        //asuming 7px per character
        return maxWidth * 10;
    };

    charting.showStandardLegend = function (parent, data, color, showLegend, height) {
        if (showLegend) {
            var maxWidth = charting.getLegendWidth(data);

            //assuming 25 pixels for the small rectangle and 7 pixels per character, rough estimation which more or less works
            var legendWidth = 25 + maxWidth,
                size = legendWidth > 70 ? 15 : 18,
                fontSize = legendWidth > 70 ? "13px" : "16px",
                legend = parent
                    .append("svg")
                    .attr("width", legendWidth)
                    .attr("height", height)
                    .selectAll("g")
                    .data(data)
                    .enter().append("g")
                    .attr("transform", function (d, i) { return "translate(0," + i * 20 + ")"; });

            legend.append("rect")
                  .attr("width", size)
                  .attr("height", size)
                  .style("fill", function(i) { return color(i); });
            legend.append("text")
                  .attr("x", 24)
                  .attr("y", 9)
                  .attr("font-size", fontSize)
                  .attr("dy", ".35em")
                  .text(function (t) { return t; });
        }
    };

    charting.headerStyle = function (el) {
        el
             .style("text-align", "left")
             .style("font-size", "12px")
             .style("font-family", "sans-serif")
             .style("margin-bottom", "4px")
             .style("color", "#FFFFFF")
             .style("font-weight", "bold")
             .style("clear", "both")
             .style("float", "left");
    };

    charting.valueStyle = function (el) {
        el
            .style("text-align", "left")
            .style("font-size", "12px")
            .style("font-family", "sans-serif")
            // botom marging is 4 so that the padding of the tooltip on bottom is 6, gives 10 as the padding
            // on top of the tooltip
            .style("margin-bottom", "4px")
            .style("margin-left", "6px")
            .style("color", "#FFFFFF")
            .style("float", "left");
    };

    charting.showTooltip = function (info) {
        if(d3.select("#toolTipBorder")[0]){
            charting.createTooltip();
        }

        var tooltip = d3.select("#toolTipBorder");
        var tooltipContent = d3.select("#toolTip");
        var key;
        var value;

        tooltipContent.html("");
        for (key in info) {
             if (info.hasOwnProperty(key)) {
                value = info[key];
                charting.headerStyle(tooltipContent.append("div").text(key));

                if (value) {
                    if (koTools.isDate(value)) {
                        charting.valueStyle(tooltipContent.append("div").text(value.toFormattedString()));
                    } else {
                        charting.valueStyle(tooltipContent.append("div").text(value));
                    }
                }
            }
        }

          tooltip.transition()
              .duration(200)
              .style("opacity", ".83");

          tooltip.style("left", (d3.event.pageX + 15) + "px")
              .style("top", (d3.event.pageY - 75) + "px");
    };

    charting.hideTooltip = function () {
        var toolTip = d3.select("#toolTipBorder");
        toolTip.transition()
            .duration(300)
            .style("opacity", "0");
    };

    charting.createTooltip = function () {
        var tooltip = d3.select("body")
            .append("div");

        tooltip
            .attr("id", "toolTipBorder")
            .style("position", "absolute")
            .style("opacity", 0)
            .style("background-color", "#111111")
            .style("border-radius", "6px")
            .style("padding", "10px")
            .style("padding-bottom", "6px")
            .append("div")
            .attr("id", "toolTip")
            .style("z-index", 100000);
    };

    charting.getDimensions = function (options, el) {
        if (options.fillParentController) {
            options.width = koTools.getWidth(el);
            options.height = d3.max([koTools.getHeight(el), options.height]);
        }
        var dims = {};
        dims.margin = { top: 20, right: options.right || 50, bottom: 30 , left: options.left || 50 };
        dims.width = options.width || 200;
        dims.height = options.height || 100;
        dims.yAxisWidth = 40;
        if(options.yAxisLabel){
            dims.yAxisWidth = 50;
        }
        if (options.xAxisTextAngle) {
            dims.margin.bottom = options.xAxisTextAngle*50/90 + dims.margin.bottom;
        }

        if(options.xAxisLabel) {
            dims.margin.bottom+= 15;
        }
        dims.containerHeight = dims.height + dims.margin.top + dims.margin.bottom;
        dims.containerWidth = dims.width + dims.yAxisWidth + dims.margin.left + dims.margin.right;

        if (options.horizontalSlider) {
            var sliderSpace = 30;
            var afterSlider = 60;

            if (options.xAxisTextAngle) {
                sliderSpace = 60;
                afterSlider = 80;
            }

            dims.sliderHeight = 20;
            dims.containerHeight = dims.height + dims.sliderHeight + sliderSpace + afterSlider;
            dims.sliderOffset = dims.height + sliderSpace;
        }
        return dims;
    };

    charting.appendContainer = function (el, dims) {
        var svg = el.append("svg")
        .attr("width", dims.containerWidth)
        .attr("height", dims.containerHeight)
      .append("g")
        .attr("transform", "translate(" + dims.margin.left + "," + dims.margin.top + ")");

        return svg;
    };

    charting.createXAxis = function (svg,options,x,dims) {
        var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

        if (options.xFormat){
            xAxis.tickFormat(options.xFormat);
        }

        if (options.tickValues){
            xAxis.tickValues(options.tickValues);
        }

        var axis = svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + dims.height + ")")
            .call(xAxis);

        charting.xAxisStyle(axis);
        charting.rotateAxisText(axis, options);

        if (options.xAxisLabel){
            svg.append("text")
                .style("font-size", "13")
                .style("font-family", "sans-serif")
                .style("font-weight","bold")
                .attr("class", "x label")
                .attr("text-anchor", "end")
                .attr("x", (dims.width / 2) + 35 )
                .attr("y", dims.height + dims.margin.bottom)
                .text(options.xAxisLabel);
        }
        return xAxis;
    };

    charting.rotateAxisText = function (axis, options) {
        if (options.xAxisTextAngle) {
            axis.selectAll("text")
                .attr("y", 0)
                .attr("x", 9)
                .attr("dy", ".35em")
                .attr("transform", "rotate(" + options.xAxisTextAngle + ")")
                .style("text-anchor", "start");
        }
    };

    charting.yAxisStyle = function(el)
    {
        el.select("path").style("display","none");
        el.selectAll("line").style("shape-rendering","crispEdges").style("stroke","#000");
        el.selectAll("line").style("stroke","#777").style("stroke-dasharray","2.2");
        el.style("font-family", "sans-serif");
        el.style("font-size", "13");
    };

    charting.xAxisStyle = function(el){
        el.select("path").style("display","none");
        el.select("line").style("shape-rendering","crispEdges").style("stroke","#000");
        el.selectAll("line").style("stroke","#000");
        el.style("font-family", "sans-serif");
        el.style("font-size", "13");
        return el;
    };

    charting.createYAxis = function (svg, options, yScale, dims) {
        var yAxis = d3.svg.axis().scale(yScale).tickSize(dims.width).orient("right");

        var axis = svg.append("g")
            .attr("class", "y axis")
            .call(yAxis);

        charting.yAxisStyle(axis);

        if (options.yAxisLabel) {
            svg.append("text")
                .attr("class", "y label")
                .attr("text-anchor", "end")
                .attr("y", 0)
                .attr("dy", ".75em")
                .style("font-size", "13")
                .style("font-family", "sans-serif")
                .style("font-weight","bold")
                .text(options.yAxisLabel)
                .attr("transform", "translate(" + (dims.width+dims.yAxisWidth) + "," + (dims.height/2) + ")rotate(-90)");
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

        var newKeys = data.map(function (v) {
            if (!koTools.isNumber(v)){
                def.allNumbers = false;
            }
            if (!koTools.isDate(v)){
                def.allDates = false;
            }
            if (v < def.min){
                def.min = v;
            }
            if (v > def.max){
                def.max = v;
            }
            return v;
        });

        if(def.xKeys){
            def.xKeys = def.xKeys.concat(newKeys);
        }else{
            def.xKeys = newKeys;
        }
        def.scaleType = def.allNumbers ? 'linear' : def.allDates ? 'date' : 'ordinal';
        def.xFormat = def.allDates ? koTools.getIdealDateFormat([def.min,def.max]) : null;
        if(!options.xFormat){
            options.xFormat = def.xFormat;
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

    charting.getYScaleDefForMultiline = function (data,options,filteredDomain){
        var def = null;
        data.forEach(function(i) {
            var filteredData = i.values;
            if(filteredDomain){
                filteredData = i.values.filter(function(d){
                    return d.x >= filteredDomain[0] && d.x <= filteredDomain[1];
                });
            }
            def = charting.determineYScale(filteredData.map(function(v) {
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
            if (v < def.min){
                def.min = v;
            }
            if (v > def.max){
                def.max = v;
            }
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
    charting.getXScaleFromConfig = function (def,dims) {
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
            if (scaleDef.scaleType === 'ordinal'){
                return x(d) + x.rangeBand() / 2;
            }
            if (scaleDef.scaleType === 'date' || scaleDef.scaleType === 'linear'){
                return x(d);
            }
            throw "invalid Scale Type";
        };
    };

    charting.createVerticalLine = function (svg,x,y){
      return svg.append("line")
          .attr("x1",x)
          .attr("y1", 0)
          .attr("x2", x)
          .attr("y2", y)
          .attr("stroke-width", 2)
          .attr("stroke", "black");
    };

    charting.mouseCoordinates = function (context,x,y){
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
        .style("fill","none")
        .style("pointer-events","all")
        .on("mousemove", callback);
    };

    charting.createOrMoveVerticalLine = function(line,svg,dims,x){
      if (!line) {
          return charting.createVerticalLine(svg,x,dims.height);
      }

      charting.moveLine(line,x);
      return line;
    };

    charting.passOptions = function (func, options){
        return function(d) {
            func(options, d);
        };
    };

    charting.singlePointOver = function (element, options, d) {
        var info = {};
        var xValue = options.xFormat ? options.xFormat(d.x) : d.x;
        info[xValue] = "";
        var valueName = d.linename || "value";
        info[valueName] = d.y;
        charting.showTooltip(info);
        d3.select(element).style("fill", "black");
    };

    charting.singlePointOut = function (element) {
        d3.select(element).style("fill", "white");
        charting.hideTooltip();
    };

    return charting;
});
