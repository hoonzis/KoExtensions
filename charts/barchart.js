function d3barChart(width, height, data, element, showLegend,xcoord) {
    var el = getElementAndCheckData(element,data);
    if (el == null)
        return;

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

	//todo: we assume that all elements have the same properties, should scan them all
    var keys = d3.keys(data[0]).filter(function (key) { return key != xcoord; });
    color.domain(keys);
	var arranged = [];
	
	//runs overs all the data. copies the result to a new array
    data.forEach(function (d) {
		var newD = {x: d[xcoord]};
        var y0neg = 0;
        var y0pos = 0;
        newD.values = color.domain().map(function (m) {
            if (d[m] > 0)
                return { name: m, y0: y0pos, y1: y0pos += +d[m] };
            else {
                var y1 = y0neg;
                return { name: m, y0: y0neg += d[m], y1: y1 };
            } 
        });
        newD.totalPositive = d3.max(newD.values, function (v) { return v.y1});
        newD.totalNegative = d3.min(newD.values, function (v) { return v.y0 });
		arranged.push(newD);
    });
	
    showStandardLegend(el,keys, function(item) { return item},color,showLegend,height);

    var svg = el.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    x.domain(arranged.map(function (d) { return d.x; }));
    y.domain([d3.min(arranged, function (d) {return d.totalNegative;}), d3.max(arranged, function (d) {
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
        .data(arranged)
      .enter().append("g")
        .attr("class", "g")
        .attr("transform", function (d) { return "translate(" + x(d.x) + ",0)"; });

    state.selectAll("rect")
        .data(function (d) { return d.values; })
      .enter().append("rect")
        .attr("width", x.rangeBand())
        .attr("y", function (d) { return y(d.y1); })
        .attr("height", function (d) { return y(d.y0) - y(d.y1); })
        .style("fill", function (d) { 
            return color(d.name); 
        }); 
}