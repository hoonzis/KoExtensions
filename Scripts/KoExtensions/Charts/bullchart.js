function drawBubbleChart(historyData, elname, xValues, bulls) {
// Chart dimensions.
    var margin = { top: 60, right: 30, bottom: 70, left: 40 },
        width = 960 - margin.right,
        height = 500 - margin.top - margin.bottom;

    var maxY = d3.max(historyData, function (d) { return d.deals; });
    var maxAvgDeal = d3.max(historyData, function (d) { return d.avgDealSize; });
    var maxNotional = d3.max(historyData, function (d) { return d.notional; });

    var avgDeals = historyData.map(function(d) { return d.avgDealSize; });
    avgDeals.sort(d3.ascending);
    maxAvgDeal = d3.quantile(avgDeals, 0.95);

    var xScale = d3.scale.ordinal().domain(xValues).rangeRoundBands([0, width], .1);
    var yScale = d3.scale.sqrt().domain([0, maxY]).range([height, 0]),
        radiusScale = d3.scale.pow().exponent(.4).domain([0, maxNotional]).range([0, 60]).clamp(true),
        colorScale = d3.scale.category20().domain(bulls);

    var xAxis = d3.svg.axis().scale(xScale).orient("bottom"),
        yAxis = d3.svg.axis().scale(yScale).tickSize(width).orient("right");

    //TODO: JF - pass the quarter details as parameter
    xAxis.tickFormat(statsVM.getQuarterLabel);

    var svgElem = d3.select("#" + elname);
    svgElem.innerHTML = "";

    showStandardLegend(svgElem, bulls, function (i) { return i; }, colorScale, true, height);

    var svg = svgElem.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
    .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + (height + 50) + ")")
        .call(xAxis);

    var gy = svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    gy.selectAll("g").
        filter(function (d) { return d; })
        .classed("minor", true);

    gy.selectAll("text")
    .attr("x", 4)
    .attr("dy", -4);

    svg.append("text")
	    .style("font-size","15px")
        .attr("class", "x label")
        .attr("text-anchor", "end")
        .attr("x", width)
        .attr("y", height + 40)
        .text("Quarter");

    svg.append("text")
        .attr("class", "y label")
        .attr("text-anchor", "end")
        .attr("y", 6)
        .attr("dy", ".75em")
        .style("font-size", "15px")
        .text("# of deals")
        .attr("transform", "translate(" + width + "," + 40 + ")rotate(-90)");
	
    svg.append("g")
        .attr("class", "dots")
    .selectAll(".dot")
        .data(historyData)
    .enter().append("circle")
        .attr("class", "dot")
        .style("fill", function(d) { return colorScale(d.strategyType); })
        .style("opacity", 0.8)
        .attr("cx", function (d) { return xScale(d.quarter) + xScale.rangeBand() / 2; })
        .attr("cy", function(d) { return yScale(d.deals); })
        .attr("r", function (d) { return radiusScale(d.notional); })
        .on("mouseover", bubblenode_mouseover)
        .on("click", bubblenode_mouseover)
        .on("mouseout", bubblenode_mouseout);
}

function bubblenode_mouseout(d) {
    hideTooltip();
}

function bubblenode_mouseover(d) {
    var avgDealSize = statsVM.values.formatters["Traded Notional"](d.avgDealSize);
    var totalNotional = statsVM.values.formatters["Traded Notional"](d.notional);
    var info = {
        "Strategy:":d.strategyType,
        "Avg deal size": avgDealSize,
        "# Deals": d.deals,
        "Total Notional:": totalNotional
    };
    showTooltip(info);
}