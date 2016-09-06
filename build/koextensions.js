!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var n;"undefined"!=typeof window?n=window:"undefined"!=typeof global?n=global:"undefined"!=typeof self&&(n=self),n.koextensions=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
"use strict";

var koTools = _dereq_('./kotools');

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

charting.legendFont = function(longest){
  if (longest > 20) {
      return 8;
  }
  if(longest > 15) {
    return 10;
  }
  if(longest > 10) {
    return 12;
  }
  return 13;
}

charting.getLegendWidthAndFontSize = function (data) {
    //when there is no legend, just return 0 pixels
    if (!data || data.length === 0) {
        return 0;
    }
    var longest = d3.max(data, function (el) {
        return el.length;
    });
    // we determine the optimal font size and from it calculate the rest (rectangle size and legend width)
    var fontSize = charting.legendFont(longest);
    var rectangleSize = fontSize + 2;
    return {
      fontSize: fontSize + "px",
      width: rectangleSize + (fontSize - 3) * longest,
      rectangle: rectangleSize
    };
};

charting.showStandardLegend = function (parent, data, color, showLegend, height) {
    if (showLegend) {
        var legendDims = charting.getLegendWidthAndFontSize(data);

        var legend = parent
              .append("svg")
              .attr("width", legendDims.width)
              .selectAll("g")
              .data(data)
              .enter().append("g")
              .attr("transform", function (d, i) { return "translate(0," + i * (legendDims.rectangle  + 4) + ")"; });

        legend.append("rect")
              .attr("width", legendDims.rectangle)
              .attr("height", legendDims.rectangle)
              .style("fill", function(i) { return color(i); });


        legend.append("text")
              .attr("x", legendDims.rectangle + 4)
              .attr("y", legendDims.rectangle / 2)
              .attr("font-size", legendDims.fontSize)
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
    var dims = {};
    dims.margin = { top: options.top || 20, right: options.right || 50, bottom: options.bottom || 30 , left: options.left || 50 };
    dims.width = options.width || 200;
    dims.height = options.height || 100;
    dims.yAxisWidth = 40;
    if(options.yAxisLabel) {
        dims.yAxisWidth = 80;
    }
    if (options.xAxisTextAngle) {
        dims.margin.bottom = options.xAxisTextAngle*50/90 + dims.margin.bottom;
    }

    dims.legendWidth = 0;

    // TODO: would be good to have the real width of the leged here
    if(options.legend){
        dims.legendWidth = 150;
    }

    if(options.xAxisLabel) {
        dims.margin.bottom+= 15;
    }
    dims.containerHeight = dims.height + dims.margin.top + dims.margin.bottom;
    dims.containerWidth = dims.width + dims.yAxisWidth + dims.margin.left + dims.margin.right;

    if (options.fillParentController) {
        dims.containerWidth = koTools.getWidth(el) - dims.legendWidth -  20;
        dims.containerHeight = d3.max([koTools.getHeight(el), options.height]) - 30;

        dims.height = dims.containerHeight - (dims.margin.top + dims.margin.bottom);
        dims.width = dims.containerWidth - (dims.yAxisWidth + dims.margin.left + dims.margin.right);
        dims.fillParentController = true;
    }

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

    if (options.yFormat){
        yAxis.tickFormat(options.yFormat);
    }

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


module.exports = charting;

},{"./kotools":10}],2:[function(_dereq_,module,exports){
"use strict";

var koTools = _dereq_('./../kotools');
var charting = _dereq_('./../charting');

//accepts and array of objects. one property of each object is used as the x-coordinate
//(determined by the xcoord option, which by default is set to 'x')
//the rest of the properties is stacked to the chart
charting.barChart = function (data, element, options, lineData) {
    var el = charting.getElementAndCheckData(element, data);
    if (!el){
        return;
    }

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

    // not all the items do have the same set of properties, therefor scan them all and concatenate the result
    var keys = [];
    data.map(function (i) {
        var itemKeys = d3.keys(i).filter(function (key) { return key !== xcoord && keys.indexOf(key) < 0; });
        keys = keys.concat(itemKeys);
    });

    //we need color for each possible variable
    var color = charting.colors.domain(keys);

    var dims = charting.getDimensions(options, el);

    var xKeys = data.map(function(d){return d[xcoord];});

    // for bar chart the x-scale is always ordinary with range bounds
    // but we run the determining X Scale method anyway
    // because it can help determine the xFormat
    charting.determineXScale(xKeys, null, options);

    var x = d3.scale.ordinal()
        .rangeRoundBands([0, dims.width], 0.3);

    var y = d3.scale.linear()
        .rangeRound([dims.height, 0]);

    //runs overs all the data. copies the result to a new array.
    //for each item we need y0 and y1 - are the y coordinates of the rectangle
    //it is bit tricky to have a something that works for stacked and grouped chart
    var arranged = [];
    var arrangedByX = {};
    data.forEach(function (d) {
        var newD = { x: d[xcoord] };
        var y0Neg = 0;
        var y0Pos = 0;


        var values = [];
        color.domain().forEach(function (m) {
            if (!koTools.isNumber(d[m]) || d[m] === 0 || d[m] === null){
                return;
            }
            var xLabel = newD.x;
            if (options.xFormat){
                xLabel = options.xFormat(newD.x);
            }
            var formattedValue = d[m];
            if (options.yFormat){
                formattedValue = options.yFormat(d[m]);
            }

            var value = {
                name:m,
                val: d[m],
                x: newD.x,
                xLabel: xLabel,
                xUnitName: options.xUnitName,
                formattedValue: formattedValue
            };

            if (d[m] > 0 && options.style === "stack") {
                value.y0 = y0Pos;
                y0Pos += d[m];
                value.y1 = y0Pos;
            } else if (d[m] < 0 && options.style === "stack"){
                var y1 = y0Neg;
                y0Neg += d[m];
                value.y0 = y0Neg;
                value.y1 =  y1;
            } else if (d[m] > 0 && options.style !== "stack"){
                value.y0 = 0;
                value.y1 = d[m];
            } else if(d[m] < 0 && options.style !== "stack"){
                value.y0 = d[m];
                value.y1 = 0;
            }
            values.push(value);
        });

        newD.values = values;
        newD.totalPositive = d3.max(newD.values, function (v) { return v.y1; });
        newD.totalNegative = d3.min(newD.values, function (v) { return v.y0; });
        arranged.push(newD);
        arrangedByX[newD.x] = newD;
    });

    charting.showStandardLegend(el, keys,color, options, dims);

    var svg = charting.appendContainer(el, dims);

    x.domain(xKeys);
    if (options.style === "stack") {
        y.domain([
            d3.min(arranged, function (d) {
              return d.totalNegative;
            }), d3.max(arranged, function (d) {
                if (!d){
                    return 0;
                }
                return d.totalPositive;
            })
        ]);
    } else {
        y.domain(
        [
            d3.min(arranged, function (d) {
                return d3.min(d.values,
                    function (i) {
                        if (i.val < 0){
                            return i.val;
                        }
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
    charting.createYAxis(svg, options, y, dims);


    var onBarOver = function (d) {
        var column = arrangedByX[d.x];
        d3.select(this).style("opacity", 1);
        var info = {};
        info[d.xLabel] = "";
        info[d.name] = d.formattedValue;
        if (column.totalNegative === 0 && options.style === "stack"){
            info[d.name] += " (" + koTools.toPercent(d.val / column.totalPositive) + ")";
        }
        charting.showTooltip(info);
    };

    var onBarOut = function () {
        d3.select(this).style("stroke", 'none');
        d3.select(this).style("opacity", 0.9);
        charting.hideTooltip();
    };

    var group = svg.selectAll(".xVal")
        .data(arranged)
        .enter().append("g")
        .attr("class", "g")
        .attr("transform", function (d) { return "translate(" + x(d.x) + ",0)"; });

    var rectangles = group.selectAll("rect")
        .data(function (d) { return d.values; })
        .enter().append("rect");

    if (options.style === "stack") {
        rectangles.attr("width", x.rangeBand());
    } else {
        rectangles.attr("width", x1.rangeBand())
          .attr("x", function (d) {
              return x1(d.name);
          });
    }

    rectangles.attr("y", function (d) {
      return y(d.y1);
    })
    .attr("height", function (d) {
      var height = Math.abs(y(d.y0) - y(d.y1));
      return height;
    })
    .on("mouseover", onBarOver)
    .on("mouseout", onBarOut)
    .style("opacity", 0.9)
    .style("cursor", "pointer")
    .style("fill", function (d) {
        return color(d.name);
    });

    //Add the single line for the cashflow like charts
    if (!lineData || lineData.length === 0){
        return;
    }

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

    var yAxisLeft = d3.svg.axis()
       .scale(lineY)
       .orient("left");

    var leftAxis = svg.append("g")
       .call(yAxisLeft);

    charting.yAxisStyle(leftAxis);

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
        .attr("r", function () { return 3; })
        .style("fill", "white")
        .style("stroke-width", "1")
        .style("stroke", "black")
        .style("cursor", "pointer")
        .on("mouseover", function(d) { charting.singlePointOver(this, options, d);})
        .on("click", function(d) { charting.singlePointOver(this, options, d);})
        .on("mouseout", function(d) { charting.singlePointOut(this);});
};

},{"./../charting":1,"./../kotools":10}],3:[function(_dereq_,module,exports){
"use strict";
var koTools = _dereq_('./../kotools');
var charting = _dereq_('./../charting');

charting.bubbleChart = function (data, element, options) {
    var el = charting.getElementAndCheckData(element, data);
    if (!el) {
        return;
    }

    var defaultOptions = {
        legend: true,
        width: 500,
        height: 200,
        maxBubbleSize: 50,
        bubbleHorizontal: function(d) { return d.x; },
        bubbleVertical: function(d) { return d.y; },
        bubbleSize: function(d) { return d.size; },
        bubbleColor: function(d) { return d.color; },
        horizontalLabel: 'x',
        verticalLabel: 'y',
        sizeLabel: 'size',
        typeLabel: 'type',
        xAxisLabel: false,
        yAxisLabel: false,
        xAxisTextAngle: null
    };

    options = koTools.setDefaultOptions(defaultOptions, options);

    var dims = charting.getDimensions(options, el);
    var horizontalValues = data.map(options.bubbleHorizontal);
    var verticalValues = data.map(options.bubbleVertical);

    var bubbleSizes = data.map(options.bubbleSize);
    bubbleSizes.sort(d3.ascending);

    var maxBubbleSize = d3.max(bubbleSizes);
    var minBubbleSize = d3.min(bubbleSizes);

    var xScaleDef = charting.determineXScale(horizontalValues, null, options);
    var xScale = charting.getXScaleFromConfig(xScaleDef,dims);
    var yScaleDef = charting.determineYScale(verticalValues, null, options);
    var yScale = d3.scale.linear().domain([yScaleDef.min, yScaleDef.max]).range([dims.height, 0]);
    var radiusScale = d3.scale.pow().exponent(0.4).domain([minBubbleSize, maxBubbleSize]).range([1, options.maxBubbleSize]).clamp(true);

    var colors = koTools.distinct(data, options.bubbleColor);
    var colorScale = charting.colors.domain(colors);

    charting.showStandardLegend(el, colors, colorScale, options, dims);
    var svg = charting.appendContainer(el, dims);

    charting.createXAxis(svg, options, xScale, dims);
    charting.createYAxis(svg, options, yScale, dims);

    var bubblenodeMouseout = function () {
        d3.select(this).style("opacity", 0.8);
        charting.hideTooltip();
    };

    var bubblenodeMouseover = function (d) {
        d3.select(this).style("opacity", 1);
        var info = {};
        info[options.typeLabel] = options.bubbleColor(d);
        info[options.sizeLabel] = options.bubbleSize(d);
        info[options.verticalLabel] = options.bubbleVertical(d);
        info[options.horizontalLabel] = options.bubbleHorizontal(d);

        charting.showTooltip(info);
    };

    var xGetter = charting.xGetter(xScaleDef, xScale);

    svg.append("g")
        .attr("class", "dots")
    .selectAll(".dot")
        .data(data)
    .enter().append("circle")
        .attr("class", "dot")
        .style("fill", function (d) { return colorScale(options.bubbleColor(d)); })
        .style("opacity", 0.8)
        .attr("cx", function (d) { return xGetter(options.bubbleHorizontal(d)); })
        .attr("cy", function (d) { return yScale(options.bubbleVertical(d)); })
        .attr("r", function (d) { return radiusScale(options.bubbleSize(d)); })
        .style("cursor", "pointer")
        .on("mouseover", bubblenodeMouseover)
        .on("click", bubblenodeMouseover)
        .on("mouseout", bubblenodeMouseout);
};

},{"./../charting":1,"./../kotools":10}],4:[function(_dereq_,module,exports){
"use strict";

var koTools = _dereq_ ('./../kotools');
var charting = _dereq_('./../charting');

charting.chordChart = function(data, element, options) {

  var el = charting.getElementAndCheckData(element, data);
  if (!el){
      return;
  }

  var defaultOptions = {
      width: 800,
      height: 800,
      fillParentController:false,
      chordMouseOver: null
  };

  options = koTools.setDefaultOptions(defaultOptions, options);
  var dims = charting.getDimensions(options, el);
  var outerRadius = Math.min(dims.width, dims.height) / 2 - 100;
  var innerRadius = outerRadius - 24;

  //get the name of the item by id
  var descGetter = function (item) {
      if(options.hideNames){
          return item.index + 1;
      }
      return data.names[item.index];
  };

  var color = charting.colors;

  var arc = d3.svg.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);

  var layout = d3.layout.chord()
      .padding(0.04);

  var path = d3.svg.chord()
      .radius(innerRadius);

  var svg = el.append("svg")
      .attr("width", dims.width)
      .attr("height", dims.height)
      .append("g")
      .attr("id", "circle")
      .attr("transform", "translate(" + dims.width / 2 + "," + dims.height / 2 + ")");

  var formatValue = function(value){
      if(options.chordFormat){
          value = options.chordFormat(value);
      }
      return value;
  };

  var chordMouseOver = function (g, i) {
      var a1 = data.names[g.source.index];
      var a2 = data.names[g.source.subindex];
      var title = a1 + " - " + a2;
      var info = {};
      var value = formatValue(g.source.value);
      info[title] = value;

      //get all except this chord and put it in background
      svg.selectAll(".chord")
          .filter(function (d, index) {
              return i !== index;
          })
          .transition()
          .style("opacity", 0.1);

      charting.showTooltip(info);
  };

  var chordMouseOut = function (g, i) {
      svg.selectAll(".chord")
          .transition()
          .style("opacity", 1);

      charting.hideTooltip();
  };

  var mouseOverArc = function(opacity) {
      return function (g, i) {
          svg.selectAll(".chord")
              .filter(function (d) {
                  return d.target.index !== i && d.source.index !== i;
              })
              .transition()
              .style("opacity", opacity);

          var info = {};
          var value = formatValue(g.value);
          info[descGetter(g)] = value;
          charting.showTooltip(info);
      };
  };

  layout.matrix(data.matrix);
  var group = svg.selectAll(".group")
      .data(layout.groups)
      .enter().append("g")
      .attr("class", "group");


  group.append("path")
      .attr("id", function(d, i) { return "group" + i; })
      .attr("d", arc)
      .style("fill", function(d, i) { return color(i); })
      .on("mouseover", mouseOverArc(0.1))
      .on("mouseout", mouseOverArc(1));

  group.append("text")
      .each(function(d) { d.angle = (d.startAngle + d.endAngle) / 2; })
      .attr("dy", ".35em")
      .attr("transform", function(d) {
          return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")" +
          "translate(" + (innerRadius + 26) + ")" +
          (d.angle > Math.PI ? "rotate(180)" : "");
      })
      .style("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
      .attr("font-family", "Open Sans, sans-serif")
      .style("font-size", "13px")
      .text(descGetter);

  // Add the chords.
  svg.selectAll(".chord")
      .data(layout.chords)
      .enter().append("path")
      .attr("class", "chord")
      .style("fill", function(d) { return color(d.source.index); })
      .style("cursor","pointer")
      .attr("d", path)
      .on("mouseover", chordMouseOver)
      .on("mouseout", chordMouseOut)
      .on("click", chordMouseOver);
};

},{"./../charting":1,"./../kotools":10}],5:[function(_dereq_,module,exports){
"use strict";

var koTools = _dereq_ ('./../koTools');
var charting = _dereq_('./../charting');

charting.histogram = function(data, element, options) {
    var defaultOptions = {
        bins: 80,
        width: 500,
        fillParentController:false,
        histogramType: 'frequency',
        rangeRounding: 2
    };

    var el = charting.getElementAndCheckData(element,data);
    if (el == null) {
        return;
    }

    options = koTools.setDefaultOptions(defaultOptions, options);
    var dims = charting.getDimensions(options,el);

    var histogramData = d3.layout.histogram()
            .frequency(options.histogramType === 'frequency')
            .bins(options.bins)(data);

    var minX = koTools.isValidNumber(options.min) ? options.min : d3.min(histogramData, function (d) { return d.x; });

    var x = d3.scale.linear()
        .domain([
            minX,
            d3.max(histogramData, function(d) { return d.x; })
        ])
        .range([0, dims.width-10]);
    var columnWidth = x(minX + histogramData[0].dx) - 1;

    var y = d3.scale.linear()
        .domain([0, d3.max(histogramData, function(d) { return d.y; })])
        .range([dims.height, 0]);

    var svg = charting.appendContainer(el, dims);

    var bar = svg.selectAll(".bar")
        .data(histogramData)
      .enter().append("g")
        .attr("class", "bar")
        .attr("transform", function (d) {
            return "translate(" + x(d.x) + "," + y(d.y) + ")";
        });


    var onBarOver = function (d) {
        d3.select(this).style("opacity", 1);
        var header = options.histogramType == "frequency" ? "count": "probability";
        var info = {};
        info[header] = d.y;
        info["range"] = d.x.toFixed(options.rangeRounding) + " - " + (d.x+d.dx).toFixed(options.rangeRounding);
        charting.showTooltip(info);
    };

    var onBarOut = function () {
        charting.hideTooltip();
        d3.select(this).style("opacity", 0.8);
    };

    bar.append("rect")
        .attr("x", 1)
        .attr("width",columnWidth)
        .attr("height", function(d) {
            return dims.height - y(d.y);
        })
        .attr("fill","#1f77b4")
        .attr("opacity",0.8)
        .style("cursor", "pointer")
        .on("mouseover",onBarOver)
        .on("mouseout",onBarOut);

    charting.createXAxis(svg,options,x,dims);
    charting.createYAxis(svg, options, y, dims);

    var line = d3.svg.line()
        .interpolate("linear")
        .x(function (d) { return x(d.x) + x.rangeBand() / 2; })
        .y(function (d) { return y(d.y); });

    if(options.showProbabilityDistribution){

        var min = koTools.isValidNumber(options.min) ? options.min : d3.min(data);
        var max = koTools.isValidNumber(options.max) ? options.max : d3.max(data);
        var total = d3.sum(data);

        var step = (max - min)/500;
        var expected = total / data.length;
        if(options.expected == 'median'){
            expected = d3.median(data);
        }

        var variance = 0;
        var distances = [];
        data.forEach(function(val){
            var dist = val - expected;
            distances.push(Math.abs(dist));
            variance+= dist*dist;
        });


        if(options.useMAD){
            variance = d3.median(distances);
        }else{
            variance= variance / data.length-1;
        }

        var i = 0;
        var probData = [];
        for (i = min;i<max;i+=step) {
            var powE = -(i-expected)*(i-expected)/(2*variance);
            var prob = (1 / Math.sqrt(2*Math.PI*variance)) * Math.pow(Math.E,powE);
            probData.push({x:i, y:prob});
        }

        var y = d3.scale.linear()
          .range([dims.height, 0]);

        y.domain([
            d3.min(probData,function(d){return d.y;}),
            d3.max(probData, function(d) { return d.y; })
        ]);

        var minX =d3.min(probData,function(i){return i.x;});
        var maxX =d3.max(probData, function(i) { return i.x; });

        x.domain([
            minX,
            maxX
        ]);

        var lineFunction = d3.svg.line()
          .interpolate("linear")
          .x(function(d) {
              return x(d.x);
          })
          .y(function(d) {
              return y(d.y);
          });

        svg.append("path")
          .attr("class", "line")
          .attr("d", lineFunction(probData))
          .style("stroke-width", 2)
          .style("stroke", "red")
          .style("fill", "none");

        if(options.showOutliers){
            data.forEach(function(el){
                var elDist = Math.abs(el - expected);

                if (elDist > variance * options.tolerance) {
                    svg.append("circle")
                        .attr("cx", x(el) + 2)
                        .attr("cy", dims.height)
                        .attr("r", 4)
                        .attr("fill", "green")
                        .attr("opacity", 0.8);
                }
            });
        }
    }
}

},{"./../charting":1,"./../koTools":9}],6:[function(_dereq_,module,exports){
"use strict";

var koTools = _dereq_ ('./../koTools');
var charting = _dereq_('./../charting');

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

},{"./../charting":1,"./../koTools":9}],7:[function(_dereq_,module,exports){
"use strict";

var koTools = _dereq_ ('./../koTools');
var charting = _dereq_('./../charting');

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
    charting.showStandardLegend(el, xKeys, color, options, dims);
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

},{"./../charting":1,"./../koTools":9}],8:[function(_dereq_,module,exports){
"use strict";

var kotools = _dereq_ ('./kotools');
var charting = _dereq_('./charting');
_dereq_('./charts/piechart');
_dereq_('./charts/barchart');
_dereq_('./charts/linechart');
_dereq_('./charts/chordchart');
_dereq_('./charts/bubblechart');
_dereq_('./charts/histogramchart');

function koextensions() {
  var self = this;

  //let tools and charting be accesible globaly
  self.tools = kotools;
  self.charting = charting;

  self.registerExtensions = function () {
      if (typeof(ko) === 'undefined') {
          console.log("Knockout was not found, using standalon KoExtensions for charting");
          return;
      }

      ko.bindingHandlers.datepicker = {
          init: function(element, valueAccessor, allBindingsAccessor) {
              //initialize datepicker with some optional options
              var options = allBindingsAccessor().datepickerOptions || {};
              $(element).datepicker(options);

              //when a user changes the date, update the view model
              ko.utils.registerEventHandler(element, "changeDate", function(event) {
                  var value = valueAccessor();
                  if (ko.isObservable(value)) {
                      value(event.date);
                  }
              });
          },
          update: function(element, valueAccessor) {
              var widget = $(element).data("datepicker");

              if (widget != null) {
                  var vmValue = ko.utils.unwrapObservable(valueAccessor());

                  //if we have a string value - convert it first
                  if (kotools.isString(vmValue)) {
                      vmValue = new Date(vmValue);
                  }

                  //if the date is not valid - don't visualize it, or we would have a "NaN/NaN/NaN"
                  if (!kotools.isValidDate(vmValue)) {
                      return;
                  }

                  widget.setDates(vmValue);
              }
          }
      };

      ko.bindingHandlers.linechart = {
          update: function(element, valueAccessor, allBindingsAccessor) {
              var options = allBindingsAccessor().chartOptions;
              var data = allBindingsAccessor().linechart();
              charting.lineChart(data, element, options);
          }
      };

      ko.bindingHandlers.piechart = {
          update: function(element, valueAccessor, allBindingsAccessor) {
              var data = allBindingsAccessor().piechart();
              var options = allBindingsAccessor().chartOptions;
              charting.pieChart(data, element, options);
          }
      };

      ko.bindingHandlers.barchart = {
          update: function(element, valueAccessor, allBindingsAccessor) {
              var data = ko.unwrap(valueAccessor());
              var options = ko.unwrap(allBindingsAccessor().chartOptions);
              var line = ko.unwrap(allBindingsAccessor().line);
              charting.barChart(data, element, options, line);
          }
      };

      ko.bindingHandlers.chordChart = {
          update: function (element, valueAccessor, allBindingsAccessor) {
              var data = allBindingsAccessor().chordChart();
              var options = allBindingsAccessor().chartOptions;
              charting.chordChart(data, element, options);
          }
      };

      ko.bindingHandlers.histogram = {
          update: function(element, valueAccessor, allBindingsAccessor) {
              var data = ko.unwrap(valueAccessor());
              var options = ko.unwrap(allBindingsAccessor().chartOptions);
              charting.histogram(data, element, options);
          }
      };

      ko.bindingHandlers.scatterplot = {
          update: function(element, valueAccessor, allBindingsAccessor) {
              var data = ko.unwrap(valueAccessor());
              var options = ko.unwrap(allBindingsAccessor().chartOptions);
              charting.scatterPlot(data, element, options);
          }
      };

      ko.bindingHandlers.bubblechart = {
          update: function(element, valueAccessor, allBindingsAccessor) {
              var data = ko.unwrap(valueAccessor());
              var options = ko.unwrap(allBindingsAccessor().chartOptions);
              charting.bubbleChart(data, element, options);
          }
      };

      ko.bindingHandlers.formattedValue = {
          update: function (element, valueAccessor, allBindingsAccessor) {
              var fValue = getFormattedValueFromAccessor(allBindingsAccessor());
              applyFormattedValue(fValue, element);
          }
      }

      ko.bindingHandlers.progress = {
          init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
              var value = valueAccessor()();
              if (value == null)
                  value = 0;
              element.style.width = value + "%";
              element.style.display = 'none';
              element.style.display = 'block';
          },
          update: function (element, valueAccessor, allBindingsAccessor) {
              var value = valueAccessor()();
              if (value == null)
                  value = 0;
              element.style.width = value + "%";
          }
      };
  };

  function applyFormattedValue(fValue, element) {
      //TODO: test if val is function  => observable then evaluate, test if it is a number before calling toCurrencyString
      if (fValue.val != null) {
          if (fValue.transf != null)
              fValue.val = fValue.transf(fValue.val);
          if (kotools.isNumber(fValue.val)) {
              element.innerHTML = fValue.val.toCurrencyString(fValue.currency, fValue.rounding);
          } else if (kotools.isDate(fValue.val)) {
              element.innerHTML = fValue.val.toFormattedString();
          } else {
              element.innerHTML = fValue.val;
          }
      }
  };

  function getFormattedValueFromAccessor(accessor) {
      var fValue = {
          currency: getValue(accessor.currency),
          val: getValue(accessor.formattedValue),
          transf: accessor.transformation,
          rounding: getValue(accessor.rounding)
      };
      return fValue;
  }



  function getValue(val) {
      if (val != null && typeof (val) == 'function')
          val = val();
      return val;
  };
};

var koext = new koextensions();
koext.registerExtensions();

module.exports = koext;

},{"./charting":1,"./charts/barchart":2,"./charts/bubblechart":3,"./charts/chordchart":4,"./charts/histogramchart":5,"./charts/linechart":6,"./charts/piechart":7,"./kotools":10}],9:[function(_dereq_,module,exports){
"use strict";

function kotools() {

    var self = this;
    var today = new Date();

    self.currentYear = today.getFullYear();
    self.currentMonth = today.getMonth();
    self.isEmpty = function (str) {
        return (!str || 0 === str.length);
    };

    Date.prototype.toFormattedString = function () {
        var cDate = this.getDate();
        var cMonth = this.getMonth() + 1; //Months are zero based
        var cYear = this.getFullYear();
        return cDate + "/" + cMonth + "/" + cYear;
    };

    Array.prototype.setOrAdd = function (x, y, value) {
        if (this[x] === null || this[x] === undefined) {
            this[x] = [];
        }
        if (this[x][y] === null || isNaN(this[x][y])){
            this[x][y] = value;
        }
        else{
            this[x][y] += value;
        }
    };

    Array.prototype.set = function (x, y, value) {
        if (!this[x]){
            this[x] = [];
        }
        this[x][y] = value;
    };

    Date.prototype.addDays = function (days) {
        var dat = new Date(this.valueOf());
        dat.setDate(dat.getDate() + days);
        return dat;
    };

    self.getQuarter = function(item) {
        if (item.Year !== null && item.Quarter !== null) {
            return "Q" + item.Quarter + item.Year;
        }
        return null;
    };

    self.paddy = function (n, p, c) {
        var pad_char = c !== 'undefined' ? c : '0';
        var pad = [1 + p].join(pad_char);
        return (pad + n).slice(-pad.length);
    };

    self.getMonth = function(item) {
        if (item.Year !== null && item.Month !== null) {
            return String(item.Year) + self.paddy(item.Month, 2).toString();
        }
        return null;
    };

    self.monthsComparer = function(item1, item2) {
        if (self.isString(item1)) {
            var year1 = parseInt(item1.substring(0, 4), 10);
            var month1 = parseInt(item1.substring(4, item1.length), 10);

            var year2 = parseInt(item2.substring(0, 4), 10);
            var month2 = parseInt(item2.substring(4, item2.length), 10);

            if (year1 === year2) {
                return d3.ascending(month1, month2);
            }

            return d3.ascending(year1, year2);
        }
        return d3.ascending(item1, item2);
    };

    self.monthsIncrementer = function(item) {
        var year = parseInt(item.substring(0, 4), 10);
        var month = parseInt(item.substring(4, item.length), 10);

        if (month === 12) {
            month = 1;
            year++;
        } else {
            month++;
        }
        var yyyy = year.toString();
        var mm = month.toString();
        return yyyy + (mm[1] ? mm : "0" + mm[0]);
    };

    self.quartersComparer = function(item1, item2) {
        var q1 = item1.substring(1, 2);
        var year1 = item1.substring(2, 6);

        var q2 = item2.substring(1, 2);
        var year2 = item2.substring(2, 6);

        if (year1 === year2) {
            return d3.ascending(q1, q2);
        }

        return d3.ascending(year1, year2);
    };

    var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    self.getYearAndMonthLabel = function(i) {
        if (!self.isString(i)) {
            return "";
        }
        var month = monthNames[parseInt(i.substring(4, i.length), 10) - 1];
        return month;
    };

    self.getProperty = function(key, d) {
        if (typeof key === "function") {
            return key(d);
        }
        return d[key];
    };

    self.getWidth = function(el)
    {
        if (el.clientWidth){
            return el.clientWidth;
        }

        if (Array.isArray(el) && el.length > 0) {
            return self.getWidth(el[0]);
        }
        return null;
    };


    self.getHeight = function(el)
    {
        if (el.clientHeight && el.clientHeight !== 0){
            return el.clientHeight;
        }

        if (Array.isArray(el) && el.length > 0) {
            return self.getHeight(el[0]);
        }

        if (el.parentElement !== null) {
            return self.getHeight(el.parentElement);
        }

        return null;
    };

    self.find = function(data, predicate) {
        var i = 0;
        for (i = 0; i < data.length; i++) {
            if (predicate(data[i])) {
                return data[i];
            }
        }
        return null;
    };

    self.isString = function(x) {
        return typeof x === 'string';
    };

    self.isNumber = function(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    };

    self.isValidNumber = function(n) {
        return n !== null && !isNaN(n);
    };

    self.isDate = function(d) {
        return Object.prototype.toString.call(d) === "[object Date]";

    };

    Number.prototype.formatMoney = function(c, d, t) {
        var n = this;
        c = isNaN(c = Math.abs(c)) ? 2 : c;
        d = d === undefined ? "." : d;
        t = t === undefined ? "," : t;
        var s = n < 0 ? "-" : "",
            i = parseInt(n = Math.abs(+n || 0).toFixed(c), 10) + "",
            j = (j = i.length) > 3 ? j % 3 : 0;
        return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
    };

    self.parseDate = function(input) {
        if (input instanceof Date) {
            return input;
        }

        //first get rid of the hour & etc...
        var firstSpace = input.indexOf(" ");

        if (firstSpace !== -1) {
            input = input.substring(0, firstSpace);
            var separator = "/";
            var parts = [];
            if (input.indexOf("-") !== -1) {
                separator = "-";
                parts = input.split(separator);
                if (parts.length === 3) {
                    return new Date(parts[0], parts[1] - 1, parts[2]);
                } else if (input.indexOf("/") !== -1) {
                    return new Date(parts[2], parts[0] - 1, parts[1]);
                }
            }
        }
        return new Date(Date.parse(input));
    };

    //verify that the date is valid => object is date-time and there is a meaningful value
    self.isValidDate = function(d) {
        if (!self.isDate(d)) {
            return false;
        }
        return !isNaN(d.getTime());
    };

    self.compare = function(x, y) {
        for (var propertyName in x) {
            if (x[propertyName] !== y[propertyName]) {
                return false;
            }
        }
        return true;
    };

    self.toLength = function(val, length) {
        if (val.length >= length) {
            return val.substring(0, length);
        }

        var returnVal = "";
        for (var i = 0; i < length; i++) {
            returnVal += val[i % val.length];
        }
        return returnVal;
    };

    Number.prototype.toCurrencyString = function(cur, decSpaces) {
        var formatted = this.toFixed(decSpaces).replace(/(\d)(?=(\d{3})+\b)/g, '$1 ');
        if (cur != null)
            formatted += ' ' + cur;
        return formatted;
    };

    self.toPercent = function(val) {
        if (val === null)
            return 0;
        return (val * 100).toFixed(1) + " %";
    };

    //Size of the object - equivalent of array length
    Object.size = function(obj) {
        var size = 0, key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) size++;
        }
        return size;
    };


    var objToString = Object.prototype.toString;

    function isString(obj) {
        return objToString.call(obj) == '[object String]';
    }

    String.prototype.endsWith = function(suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };

    //difference in 2 arrays
    self.diff = function(a1, a2) {
        return a1.filter(function(i) { return a2.indexOf(i) < 0; });
    };

    self.tryConvertToNumber = function(orgValue) {
        var intValue = parseInt(orgValue);
        var decimalValue = parseFloat(orgValue);
        var value = intValue != null ? intValue : (decimalValue != null ? decimalValue : orgValue);
        return value;
    };

    self.toBoolean = function(string) {
        if (string == null)
            return false;
        switch (string.toLowerCase()) {
        case "true":
        case "yes":
        case "1":
            return true;
        case "false":
        case "no":
        case "0":
        case null:
            return false;
        default:
            return Boolean(string);
        }
    };

    self.dateToFrenchString = function(date) {
        var month = date.getMonth() + 1;
        return date.getDate() + "/" + month + "/" + date.getFullYear();
    };

    self.dateToUSString = function(date) {
        var month = date.getMonth() + 1;
        return month + "/" + date.getDate() + "/" + date.getFullYear();
    };

    self.getYearAndMonth = function(date) {
        var yyyy = date.getFullYear().toString();
        var mm = (date.getMonth() + 1).toString();
        return yyyy + (mm[1] ? mm : "0" + mm[0]);
    };

    self.splitMonthAndYear = function(monthAndYear) {
        return {
            year: self.tryConvertToNumber(monthAndYear.substring(0, 4)),
            month: self.tryConvertToNumber(monthAndYear.substring(4, 6))
        };
    };

    self.distinct = function(data, mapper) {
        var mapped = data.map(mapper);
        return mapped.filter(function(v, i) { return mapped.indexOf(v) == i; });
    };

    self.convertSeriesToXYPairs = function(data) {
        var converted = [];
        for (var i = 0; i < data.length; i++) {
            converted.push({ x: i, y: data[i] });
        }
        return converted;
    };

    self.convertAllSeriesToXYPairs = function (data) {
        if (data == null) {
            return null;
        }
        for (var i = 0; i < data.length; i++) {
            if (data[i] != null && data[i].values != null) {
                if (self.isNumber(data[i].values[0])) {
                    data[i].values = self.convertSeriesToXYPairs(data[i].values);
                }
            }
        }
        return data;
    };

    self.setDefaultOptions = function (defaultConfig, config) {
        config = config || {};
        for (var key in defaultConfig) {
            config[key] = config[key] != null ? config[key] : defaultConfig[key];
        }
        return config;
    };

    self.getIdealDateFormat = function(range) {
        var min = range[0];
        var max = range[1];
        var oneDay = 24*60*60*1000;
        var diffDays = Math.round(Math.abs((max.getTime() - min.getTime())/(oneDay)));

        if(diffDays > 5){
            return function(d){
                var val = d.toFormattedString();
                return val;
            };
        }else {
            var diffHours = Math.abs(max - min) / 36e5;
            if(diffHours > 2){
                return function(d){
                    return d.getHours() + ":" + d.getMinutes();
                };
            }else{
                return function(d) { return d.getMinutes() + ":" + d.getSeconds();};
            }
        }
    }
  }

  module.exports = new kotools();

},{}],10:[function(_dereq_,module,exports){
module.exports=_dereq_(9)
},{}]},{},[8])
(8)
});