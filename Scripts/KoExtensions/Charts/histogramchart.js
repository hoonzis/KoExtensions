function drawHistogram(data, element, options,charting) {
    var el = charting.getElementAndCheckData(element,data);
    if (el == null)
        return;

    var margin = {top: 20, right: 40, bottom: 30, left: 40},
    width = options.width - margin.left - margin.right,
    height = options.height - margin.top - margin.bottom;


    var histogramData = d3.layout.histogram()
        .frequency(false)
        .bins(80)(data);

    var minX = koTools.isValidNumber(options.min) ? options.min : d3.min(histogramData, function (d) { return d.x; });
    
    var x = d3.scale.linear()
        .domain([
            minX,
            d3.max(histogramData, function(d) { return d.x; })
        ])
        .range([0, width]);
    var columnWidth = x(minX + histogramData[0].dx) - 1;

    var y = d3.scale.linear()
        .domain([0, d3.max(histogramData, function(d) { return d.y; })])
        .range([height, 0]);

    var yAxis = d3.svg.axis()
        .scale(y)
        .tickSize(width)
        .orient("right");

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var svg = el.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var bar = svg.selectAll(".bar")
        .data(histogramData)
      .enter().append("g")
        .attr("class", "bar")
        .attr("transform", function (d) {
            return "translate(" + x(d.x) + "," + y(d.y) + ")";
        });

    bar.append("rect")
        .attr("x", 1)
        .attr("width",columnWidth)
        .attr("height", function(d) {
             return height - y(d.y);
    });

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

        var line = d3.svg.line()
      .interpolate("linear")
      .x(function(d) { return x(d.x) + x.rangeBand() / 2; })
      .y(function(d) { return y(d.y); });
  
    if(options.showProbabilityDistribution){

        var min = koTools.isValidNumber(options.min) ? options.min : d3.min(data);
        var max = koTools.isValidNumber(options.max) ? options.max : d3.max(data);
        var total = d3.sum(data);
        
        var step = (max - min)/500;
        var expected = total / data.length;
        if(options.expected == 'median'){
            expected = median(data);
        }

        var variance = 0;
        var distances = [];
        data.forEach(function(val){
            var dist = val - expected;
            distances.push(Math.abs(dist));
            variance+= dist*dist;
        });


        if(options.useMAD){
            variance = median(distances);
        }else{
            variance= variance / data.length-1;
        }
 
        var i = 0;
        var probData = [];
        for (i = min;i<max;i+=step) {
            var powE = -(i-expected)*(i-expected)/(2*variance);
            var prob = (1 / Math.sqrt(2*Math.PI*variance)) * Math.pow(Math.E,powE);
            probData.push({x:i, y:prob});
        }

        var y = d3.scale.linear()
          .range([height, 0]);

        var color = d3.scale.category20();

        y.domain([
            d3.min(probData,function(d){return d.y;}),
            d3.max(probData, function(d) { return d.y; })
        ]);

        var minX =d3.min(probData,function(i){return i.x;});
        var maxX =d3.max(probData, function(i){return i.x});

        x.domain([
            minX,
            maxX 
        ]);

        var line = d3.svg.line()
          .interpolate("linear")
          .x(function(d) { 
            return x(d.x); 
          })
          .y(function(d) { 
            return y(d.y); 
          });

        svg.append("path")
          .attr("class", "line")
          .attr("d", line(probData))
          .style("stroke-width", 2)
          .style("stroke", "red")
          .style("fill", "none");

        if(options.showOutliers){
            data.forEach(function(el){
                var elDist = Math.abs(el - expected);

                if(elDist > variance*options.tolerance){
                    var rectangle = svg.append("circle")
                    .attr("cx", x(el)+2)
                    .attr("cy", height)
                    .attr("r", 4)
                    .attr("fill","green")
                    .attr("opacity",0.8);
                }
            });
        }
    }
}

function median(data){
    data.sort();
    var half = Math.floor(data.length/2);

    if(data.length % 2)
        return data[half];
    else
        return (data[half-1] + data[half]) / 2;
}
