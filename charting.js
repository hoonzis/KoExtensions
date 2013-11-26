//Takes as input collection of items [data]. Each item has two values [x] and [y].
function d3pieChart(width, height, data, elname, showLegend) {
    var el = d3.select("#" + elname);
    if (el == null) {
        return;
    }
    if (data == null || data.length == 0) {
        el.innerHTML = "No data available";
        return;
    }

    try{
        width = width / 2;
        var outerRadius = Math.min(width, height) / 2,
        innerRadius = outerRadius * .6,
        color = d3.scale.category20(),
        donut = d3.layout.pie(),
        arc = d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius),
        parent = el;

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
    } catch (error) {
        el.innerHTML = "Corrupted data";
    }
}

function d3barChart(width, height, data, elname, showLegend) {
    var el = d3.select("#" + elname);
    if (el == null) {
        return;
    }
    if (data == null || data.length == 0) {
        el.innerHTML = "No data available";
        return;
    }

    var margin = {top: 20, right: 20, bottom: 30, left: 40},
    width = width - margin.left - margin.right,
    height = height - margin.top - margin.bottom;

    var x = d3.scale.ordinal()
        .rangeRoundBands([1, width], .1);

    var y = d3.scale.linear()
        .rangeRound([height, 0]);

    var color = d3.scale.category20();

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .tickFormat(d3.format(".2s"));

    var svg = el.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    color.domain(d3.keys(data[0]).filter(function (key) { return key != "x"; }));
    data.forEach(function (d) {
        var y0neg = 0;
        var y0pos = 0;
        d.values = color.domain().map(function (m) {
            if (d[m] > 0)
                return { name: m, y0: y0pos, y1: y0pos += +d[m] };
            else {
                var y1 = y0neg;
                return { name: m, y0: y0neg += d[m], y1: y1 };
            } 
        });
        d.totalPositive = d3.max(d.values, function (v) { return v.y1});
        d.totalNegative = d3.min(d.values, function (v) { return v.y0 });
    });

    //data.sort(function (a, b) { return b.total - a.total; });

    x.domain(data.map(function (d) { return d.x; }));
    y.domain([d3.min(data, function (d) {return d.totalNegative;}), d3.max(data, function (d) {
        if (d == null)
            return 0;
        return d.totalPositive;
    })]);

    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .call(yAxis)
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Amount");

    var state = svg.selectAll(".xVal")
        .data(data)
      .enter().append("g")
        .attr("class", "g")
        .attr("transform", function (d) { return "translate(" + x(d.x) + ",0)"; });

    state.selectAll("rect")
        .data(function (d) { return d.values; })
      .enter().append("rect")
        .attr("width", x.rangeBand())
        .attr("y", function (d) { return y(d.y1); })
        .attr("height", function (d) { return y(d.y0) - y(d.y1); })
        .style("fill", function (d) { return color(d.name); });

    var legend = svg.selectAll(".legend")
        .data(color.domain().slice().reverse())
      .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function (d, i) { return "translate(0," + i * 20 + ")"; });

    legend.append("rect")
        .attr("x", width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color);

    legend.append("text")
        .attr("x", width - 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function (d) { return d; });
}