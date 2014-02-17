function getElementAndCheckData(element, data){
    var el = d3.select(element);
    if (data == null) {
        el.innerHTML = "No data available";
        return null;
    }
    return el;
}

function showStandardLegend(parent, data, descGetter,color, showLegend, height,valueGetter)
{
    

    var getItemAndValue = function(item){
        if(valueGetter!=null){
            return descGetter(item) + ": " + toFixed(valueGetter(item),2);
        }else{
            return descGetter(item);
        }
    }

    var maxLegendLength = max(data, function (el) { 
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
            .style("fill", function (i) { return color(descGetter(i)); })

        legend.append("text")
        .attr("x", 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .text(getItemAndValue);
    }
}