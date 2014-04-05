//Takes as input collection of items [data]. Each item has two values [x] and [y].
function d3pieChart(data, element,options) {
    var el = getElementAndCheckData(element, data);
    if (el == null)
        return;
    
    var width = options.width / 2;
    var height = options.height;
    var outerRadius = Math.min(width, height) / 2 - 3,
    innerRadius = outerRadius * .3,
    color = d3.scale.category20(),
    donut = d3.layout.pie(),
    arc = d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius);
    
    donut.value(function (d) { return d.y; });
    
    var keys = data.map(function (item) { return item.x; });
    var max = d3.sum(data, function (item) { return item.y; });
    color.domain(keys);
    showStandardLegend(el, data, function (i) { return i.x; }, color, options.legend, height, function (i) {
        if (options.unitTransform != null)
            return options.unitTransform(i.y);
        return i.y;
    });
    var vis = el.append("svg")
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
        .style("fill", function(d) { return color(d.data.x); })
        .style("stroke-width", 2)
        .style("stroke", "none")
        .on("mouseover", arcMouseOver)
        .on("mouseout", arcMouseOut)
        .each(function(d) { 
            d.percentage = d.data.y / max;
            if (options.unitTransform != null) {
                d.formatted = options.unitTransform(d.data.y);
            }
        });

    /*
    arcs.append("text")
        .attr("transform", function (d) { return "translate(" + arc.centroid(d) + ")"; })
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .attr("display", function (d) { return d.data.y > .15 ? null : "none"; })
        .text(function (d, i) {
            if (isString(d.data.y))
                return d.data.y;
            return d.data.y.toFixed(2);
        });*/
}

function arcMouseOver(d) {
    d3.select(this).style("stroke", 'black');
    var info = {};
    var value = d.formatted + " (" + (d.percentage * 100).toFixed(1) + "%)";
    info[d.data.x] = value;
    showTooltip(info);
}

function arcMouseOut() {
    d3.select(this).style("stroke", 'none');
    hideTooltip();
}

