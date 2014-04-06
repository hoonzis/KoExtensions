//accepts and array of objects. one property of each object is used as the x-coordinate (determined by the xcoord parameter)
//the rest of the properties is stacked to the chart
function d3barChart(data, element, options, xcoord, lineData) {
    var el = getElementAndCheckData(element,data);
    if (el == null)
        return;

    var margin = {top: 20, right: 40, bottom: 30, left: 40},
    width = options.width - margin.left - margin.right,
    height = options.height - margin.top - margin.bottom;

    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width], .1);

    var y = d3.scale.linear()
        .rangeRound([height, 0]);

    var color = d3.scale.category20();

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    if (options.xLabel != null)
        xAxis.tickFormat(options.xLabel);

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    // not all the items do have the same set of properties, therefor scan them all and concatenate the result
    var keys = [];
    data.map(function (i) {
        var itemKeys = d3.keys(i).filter(function (key) { return key != xcoord && keys.indexOf(key) < 0; });
        keys = keys.concat(itemKeys);
    });
    color.domain(keys);

	//runs overs all the data. copies the result to a new array
    var arranged = [];
    data.forEach(function (d) {
		var newD = {x: d[xcoord]};
        var y0neg = 0;
        var y0pos = 0;
        
        var values = [];
        color.domain().forEach(function (m) {
            if (d[m] == 0 || d[m] == null)
                return;
            var xLabel = newD.x;
            if (options.xLabel != null)
                xLabel = options.xLabel(newD.x);
            var formattedValue = d[m];
            if (options.unitTransform != null)
                formattedValue = options.unitTransform(d[m]);

            if (d[m] > 0)
                values.push({ name: m, y0: y0pos, y1: y0pos += +d[m], val:d[m], x:newD.x, xLabel:xLabel, xUnitName:options.xUnitName, formattedValue:formattedValue});
            else {
                var y1 = y0neg;
                values.push({ name: m, y0: y0neg += d[m], y1: y1, val: d[m], x: newD.x, xLabel: xLabel, xUnitName: options.xUnitName, formattedValue:formattedValue});
            } 
        });
        newD.values = values;
        newD.totalPositive = d3.max(newD.values, function (v) { return v.y1; });
        newD.totalNegative = d3.min(newD.values, function (v) { return v.y0; });
        arranged.push(newD);
    });
	
    showStandardLegend(el,keys, function(item) { return item; },color,options.legend,height);

    var svg = el.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var xKeys = arranged.map(function(d) { return d.x; });
    x.domain(xKeys);
    if (options.style == "stack") {
        y.domain([d3.min(arranged, function (d) { return d.totalNegative; }), d3.max(arranged, function (d) {
            if (d == null)
                return 0;
            return d.totalPositive;
        })]);
    } else {
        y.domain(
            [d3.min(arranged, function (d) {
                return d3.min(d.values,
                    function (i) {
                        if(i.val < 0) 
                            return i.val;
                        return 0; 
                    });
            }),
            d3.max(arranged, function (d) {
                return d3.max(d.values,
                    function (i) { return i.val; });
            })]);
    }

    //for the groupped chart
    var x1 = d3.scale.ordinal();
    x1.domain(keys).rangeRoundBands([0, x.rangeBand()]);


    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .call(yAxis);

    var group = svg.selectAll(".xVal")
        .data(arranged)
      .enter().append("g")
        .attr("class", "g")
        .attr("transform", function (d) { return "translate(" + x(d.x) + ",0)"; });

    if (options.style == "stack") {
        group.selectAll("rect")
            .data(function (d) { return d.values; })
          .enter().append("rect")
            .attr("width", x.rangeBand())
            .attr("y", function (d) { return y(d.y1); })
            .attr("height", function (d) { return y(d.y0) - y(d.y1); })
            .on("mouseover", bar_onmouseover)
            .on("mouseout", bar_mouseout)
            .style("cursor", "pointer")
            .style("fill", function (d) {
                return color(d.name);
            });

    } else {
        group.selectAll("rect")
         .data(function (d) {
             return d.values;
         })
       .enter().append("rect")
         .attr("width", x1.rangeBand())
         .attr("x", function (d) {
             return x1(d.name);
         })
         .attr("y", function (d) {
             return y(d.val);
         })
         .attr("height", function (d) {
             return height - y(d.val);
         })
        .style("cursor", "pointer")
        .on("mouseover", bar_onmouseover)
        .on("mouseout", bar_mouseout)
         .style("fill", function (d) { return color(d.name); });
    }

    //Add the single line
    if (lineData == null || lineData.length == 0)
        return;
    
    var lineY = d3.scale.linear()
        .range([height, 0]);

    var line = d3.svg.line()
     .interpolate("linear")
     .x(function(d) {
             return x(d.x) + x.rangeBand() / 2;
        })
     .y(function(d) {
         return lineY(d.y);
    });

    lineY.domain([
        0,
        d3.max(lineData, function (v) { return v.y; })
    ]);

    var yAxisRight = d3.svg.axis()
        .scale(lineY)
        .orient("right");

    svg.append("g")
        .call(yAxisRight)
        .attr("transform", "translate(" + width + " ,0)");

    var circles = svg.selectAll("circle")
        .data(lineData)
        .enter()
        .append("circle");

    circles.attr("cx", function(d) { return x(d.x) + x.rangeBand() / 2; })
        .attr("cy", function(d) { return lineY(d.y); })
        .attr("r", function(d) { return 5; })
        .style("fill", "blue")
        .style("stroke-width", 0)
        .style("stroke", "blue")
        .style("cursor", "pointer")
        .on("mouseover", point_mouseOver)
        .on("mouseout", point_mouseOut);

    svg.append("path")
        .attr("d", line(lineData))
        .style("stroke", "blue")
        .style("stroke-width", 2)
        .style("fill", "none");
}

function bar_onmouseover(d) {
    d3.select(this).style("stroke", 'black');
    var info = {};
    info[d.xUnitName] = d.xLabel;
    info[d.name] = d.formattedValue;
    showTooltip(info);
}

function point_mouseOver(d) {
    d3.select(this).style("stroke-width", 6);
    var info = {};
    info[d.xUnitName] = d.xLabel;
    //TODO: remove the reference to the global stats vm
    var formatter = statsVM.values.formatters[statsVM.values.variable()];
    info[d.name] = formatter(d.y);
    showTooltip(info);
}

function point_mouseOut(d) {
    d3.select(this).style("stroke-width", 0);
    hideTooltip();
}

function bar_mouseout(d) {
    d3.select(this).style("stroke", 'none');
    hideTooltip();
}
