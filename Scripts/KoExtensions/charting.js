var d3;
define(['./kotools'], function () {

    if (d3 == null)
        throw "KoExtensions charting module depends on globaly defined d3 variable";

    var charting = {};

    charting.getElementAndCheckData = function(element, data) {
        var el = d3.select(element);
        if (data == null || data.length == 0) {
            el.innerHTML = "No data available";
            return null;
        }
        return el;
    };

    charting.showStandardLegend = function(parent, data, descGetter, color, showLegend, height, valueGetter) {
        var getItemAndValue = function(item) {
            if (valueGetter != null) {
                return descGetter(item) + ": " + valueGetter(item);
            } else {
                return descGetter(item);
            }
        };

        var maxLegendLength = d3.max(data, function(el) {
            return getItemAndValue(el).length;
        });

        //assuming 25 pixels for the small rectangle and 7 pixels per character, rough estimation which more or less works
        var legendWidth = 25 + maxLegendLength * 7;

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
                .style("fill", function(i) { return color(descGetter(i)); });
            legend.append("text")
                .attr("x", 24)
                .attr("y", 9)
                .attr("dy", ".35em")
                .text(getItemAndValue);
        }
    };

    charting.showTooltip = function(info) {
        var toolTip = d3.select("#toolTip");
        var i = 1;
        for (key in info) {
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

    charting.getDimensions = function (options, el) {

        if (options.fillParentController) {
            options.width = el.width;
            options.height = el.height;
        }
        var margin = { top: 20, right: 80, bottom: 50, left: 50 };
        var width = options.width == null ? (960 - margin.left - margin.right) : options.width;
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
    }


    return charting;
});