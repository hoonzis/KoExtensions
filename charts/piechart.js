//Takes as input collection of items [data]. Each item has two values [x] and [y].
function d3pieChart(width, height, data, element, showLegend) {
    var el = getElementAndCheckData(element, data);
    if (el == null)
        return;
    
    width = width / 2;
    var outerRadius = Math.min(width, height) / 2,
    innerRadius = outerRadius * .3,
    color = d3.scale.category20(),
    donut = d3.layout.pie(),
    arc = d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius),
    parent = el;

    donut.value(function (d) { return d.y; });
    
    var keys = data.map(function(item) { return item.x});
    color.domain(keys);
    showStandardLegend(parent,data,function(i) { return i.x},color,showLegend,height, function(i) { return i.y});
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
        .attr("d", arc)
        .style("fill", function (d) { 
            return color(d.data.x);
        });

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
