"use strict";

var koTools = require('./../kotools');
var charting = require('./../charting');

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
