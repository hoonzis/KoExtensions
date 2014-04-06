function getElementAndCheckData(element, data){
    var el = d3.select(element);
    if (data == null || data.length == 0) {
        el.innerHTML = "No data available";
        return null;
    }
    return el;
}

function showStandardLegend(parent, data, descGetter,color, showLegend, height,valueGetter) {
    var getItemAndValue = function (item) {
        if (valueGetter != null) {
            return descGetter(item) + ": " + valueGetter(item);
        } else {
            return descGetter(item);
        }
    };

    var maxLegendLength = d3.max(data, function (el) { 
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
         .attr("transform", function (d, i) { return "translate(0," + i * 20 + ")"; });

        legend.append("rect")
            .attr("width", 18)
            .attr("height", 18)
            .style("fill", function (i) { return color(descGetter(i)); });
        legend.append("text")
        .attr("x", 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .text(getItemAndValue);
    }
}

function showTooltip(info) {
    var toolTip = d3.select("#toolTip");
    var i = 1;
    for (key in info) {
        d3.select("#info" + i + "header").text(key);
        if (info[key] != null)
            d3.select("#info" + i).text(info[key]);
        i++;
    }
    for (var j = 5; j >= i; j--) {
        d3.select("#info" + j + "header").style("display","none");
        d3.select("#info" + j).style("display", "none");
    }
    toolTip.transition()
			.duration(200)
			.style("opacity", ".9");

    toolTip.style("left", (d3.event.pageX + 15) + "px")
			.style("top", (d3.event.pageY - 75) + "px");
}

function hideTooltip() {
    var toolTip = d3.select("#toolTip");
    toolTip.transition()
		.duration(300)
		.style("opacity", "0");
}

var bodySelection = d3.select("body");
var tooltip = bodySelection.append("div").attr("id","toolTip");
tooltip.append("div").attr("id","info1header");