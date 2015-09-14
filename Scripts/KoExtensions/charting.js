"use strict";
define(['./kotools'],function (koTools) {
    if (d3 == null) {
        throw "KoExtensions need d3";
    }
    var charting = {};

    charting.getElementAndCheckData = function(element, data) {
        var el = d3.select(element);
        if (data == null || data.length === 0) {
            element.innerHTML = "No data available";
            return null;
        }
        element.innerHTML = "";
        return el;
    };

    charting.getLegendWidth = function (data) {
        //when there is no legend, just return 0 pixels
        if (data == null || data.length === 0)
            return 0;
        var maxWidth = d3.max(data, function (el) {
            return el.length;
        });
        return maxWidth;
    }

    charting.showStandardLegend = function(parent, data, color, showLegend, height) {
        
        var maxWidth = charting.getLegendWidth(data);

        //assuming 25 pixels for the small rectangle and 7 pixels per character, rough estimation which more or less works
        var legendWidth = 25 + maxWidth * 7;

        if (showLegend) {
            var legend = parent
                .append("svg")
                .attr("width", legendWidth)
                .attr("height", height)
                .selectAll("g")
                .data(data)
                .enter().append("g")
                .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

            legend.append("rect")
                .attr("width", 18)
                .attr("height", 18)
                .style("fill", function(i) { return color(i); });
            legend.append("text")
                .attr("x", 24)
                .attr("y", 9)
                .attr("dy", ".35em")
                .text(function (t) { return t; });
        }
    };

    charting.showTooltip = function(info) {
        var toolTip = d3.select("#toolTip");
        var i = 1;
        for (var key in info) {
            d3.select("#info" + i + "header").text(key);
            if (info[key] != null)
                d3.select("#info" + i).text(info[key]);

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

    };

    charting.getDimensions = function (options, el, legenKeys) {

        if (options.fillParentController) {
            options.width = el.width;
            options.height = el.height;
        }
        var margin = { top: 20, right: 80, bottom: 50, left: 50 };
        var width = options.width == null ? (960 - margin.left - margin.right) : options.width;
        if (options.legend) {
            width = width - charting.getLegendWidth(legenKeys);
        }
        var height = options.height == null ? (500 - margin.top - margin.bottom) : options.height;
        return {
            width: width,
            height: height,
            margin: margin
        };
    };
    
    charting.appendContainer = function(el, dims) {
        var svg = el.append("svg")
        .attr("width", dims.width + dims.margin.left + dims.margin.right)
        .attr("height", dims.height + dims.margin.top + dims.margin.bottom)
      .append("g")
        .attr("transform", "translate(" + dims.margin.left + "," + dims.margin.top + ")");

        return svg;
    }

    charting.createXAxis = function(svg,options,x,dims) {
        var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

        if (options.xUnitFormat != null)
            xAxis.tickFormat(options.xUnitFormat);

        if (options.tickValues!=null)
            xAxis.tickValues(options.tickValues);

        var xAxisEl = svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + dims.height + ")")
            .call(xAxis);

        if (options.xAxisTextAngle != null) {
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
    }

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
    }

    charting.determineXScale = function (data, def) {
        if (def == null) {
            def = {
                allNumbers: true,
                allDates: true,
                min: 100000000000000000000,
                max: -1000000000000000000000,
                xKeys:[]
            }    
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
        return def;
    }

    charting.determineXScaleForMultipleLines = function (data) {
        var def = null;
        data.forEach(function(i) {
            def = charting.determineXScale(i.values.map(function(v) {
                return v.x;
            }), def);
        });

        return def;
    }

    //takes the result of determineXScale and creates D3 scale
    charting.getXScaleFromConfig = function(def,dims) {
        var x;

        if (def.scaleType === 'linear') {
            x = d3.scale.linear().range([0, dims.width], .1);
            x.domain([def.min, def.max]);
        } else if (def.scaleType === 'ordinal') {
            x = d3.scale.ordinal()
                .rangeRoundBands([0, dims.width], .1);
            x.domain(def.xKeys);
        } else if (def.scaleType === 'date') {
            x = d3.time.scale().range([0, dims.width], .1);
            x.domain([def.min, def.max]);
            x.ticks(10);
        } else {
            throw "invalid scale type";
        }
        return x;
    }

    charting.xGetter = function (scaleDef, x) {
        return function(d) {
            if (scaleDef.scaleType === 'ordinal')
                return x(d) + x.rangeBand() / 2;
            else if (scaleDef.scaleType === 'date' || scaleDef.scaleType === 'linear')
                return x(d);
            throw "invalid Scale Type";
        }
    }

    return charting;
});