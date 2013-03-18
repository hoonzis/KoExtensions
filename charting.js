//Takes as input collection of items [data]. Each item has two values [x] and [y].
function d3pieChart(width, height, data, elname,showLegend) {
    width = width / 2;
    var outerRadius = Math.min(width, height) / 2,
    innerRadius = outerRadius * .6,
    color = d3.scale.category20(),
    donut = d3.layout.pie(),
    arc = d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius),
    parent = d3.select("#" + elname);

    var maxLegendLength = max(data, function (el) { return el.x.length; });
    
    //assuming 25 pixels for the small rectangle and 7 pixels per character, rough estimation which more or less works
    var legendWidth = 25 + maxLegendLength * 7;

    donut.value(function (d) { return d.y; });
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
           .style("fill", function (d, i) { return color(i); })

       legend.append("text")
       .attr("x", 24)
       .attr("y", 9)
       .attr("dy", ".35em")
       .text(function (d) { return d.x; });

   }

      var vis = parent
      .append("svg")
        .data([data])
        .attr("width", width)
        .attr("height", height);

    var arcs = vis.selectAll("g.arc")
        .data(donut)
      .enter().append("g")
        .attr("class", "arc")
        .attr("transform", "translate(" + outerRadius + "," + outerRadius + ")");

    arcs.append("path")
        .attr("fill", function (d, i) { return color(i); })
        .attr("d", arc);

    arcs.append("text")
        .attr("transform", function (d) { return "translate(" + arc.centroid(d) + ")"; })
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .attr("display", function (d) { return d.data.y > .15 ? null : "none"; })
        .text(function (d, i) {
            if (isString(d.data.y))
                return d.data.y;
            return d.data.y.toFixed(2);
        });
}