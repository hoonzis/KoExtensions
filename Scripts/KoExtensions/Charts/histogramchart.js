"use strict";
define(['./../charting'], function (charting) {
    charting.histogram = function(data, element, options) {
        var defaultOptions = {
            bins: 80,
            width: 500
        };

        var el = charting.getElementAndCheckData(element,data);
        if (el == null)
            return;

        options = koTools.setDefaultOptions(defaultOptions, options);
        var dims = charting.getDimensions(options,el);
    
        var histogramData = d3.layout.histogram()
            .frequency(false)
            .bins(options.bins)(data);

        var minX = koTools.isValidNumber(options.min) ? options.min : d3.min(histogramData, function (d) { return d.x; });
    
        var x = d3.scale.linear()
            .domain([
                minX,
                d3.max(histogramData, function(d) { return d.x; })
            ])
            .range([0, dims.width]);
        var columnWidth = x(minX + histogramData[0].dx) - 1;

        var y = d3.scale.linear()
            .domain([0, d3.max(histogramData, function(d) { return d.y; })])
            .range([dims.height, 0]);

        var yAxis = d3.svg.axis()
            .scale(y)
            .tickSize(dims.width)
            .orient("right");

        var svg = charting.appendContainer(el, dims);

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
                return dims.height - y(d.y);
            });

        charting.createXAxis(svg,options,x,dims);
    
        var gy = svg.append("g")
            .attr("class", "y axis")
            .call(yAxis);

        gy.selectAll("g").
           filter(function (d) { return d; })
           .classed("minor", true);

        var line = d3.svg.line()
            .interpolate("linear")
            .x(function (d) { return x(d.x) + x.rangeBand() / 2; })
            .y(function (d) { return y(d.y); });
  
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
              .range([dims.height, 0]);

            y.domain([
                d3.min(probData,function(d){return d.y;}),
                d3.max(probData, function(d) { return d.y; })
            ]);

            var minX =d3.min(probData,function(i){return i.x;});
            var maxX =d3.max(probData, function(i) { return i.x; });

            x.domain([
                minX,
                maxX 
            ]);

            var lineFunction = d3.svg.line()
              .interpolate("linear")
              .x(function(d) { 
                  return x(d.x); 
              })
              .y(function(d) { 
                  return y(d.y); 
              });

            svg.append("path")
              .attr("class", "line")
              .attr("d", lineFunction(probData))
              .style("stroke-width", 2)
              .style("stroke", "red")
              .style("fill", "none");

            if(options.showOutliers){
                data.forEach(function(el){
                    var elDist = Math.abs(el - expected);

                    if (elDist > variance * options.tolerance) {
                        svg.append("circle")
                            .attr("cx", x(el) + 2)
                            .attr("cy", dims.height)
                            .attr("r", 4)
                            .attr("fill", "green")
                            .attr("opacity", 0.8);
                    }
                });
            }
        }
    }
});
