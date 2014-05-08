function histogram(data, element, options) {
    var el = getElementAndCheckData(element,data);
    if (el == null)
        return;

    var margin = {top: 20, right: 40, bottom: 30, left: 40},
    width = options.width - margin.left - margin.right,
    height = options.height - margin.top - margin.bottom;

    var x = d3.scale.linear()
        .domain([d3.min(data),d3.max(data)])
        .range([0, width]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var histogramData = d3.layout.histogram()
        .bins(10)(data);

    var y = d3.scale.linear()
        .domain([0, d3.max(histogramData, function(d) { return d.y; })])
        .range([height, 0]);

    var yAxis = d3.svg.axis()
        .scale(y)
        .tickSize(width)
        .orient("right");

    var svg = el.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var bar = svg.selectAll(".bar")
        .data(histogramData)
      .enter().append("g")
        .attr("class", "bar")
        .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });

    bar.append("rect")
        .attr("x", 1)
        .attr("width", x(data[0].dx) - 1)
        .attr("height", function(d) { return height - y(d.y); });

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);
}