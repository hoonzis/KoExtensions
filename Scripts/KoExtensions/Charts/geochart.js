//expects an array of ['FRA',10000]
//where the countryByID array has to contain the match between the country and it's topology ID
function drawGeoChart(notionalData, dealsData,valueMapper, elname){
	var el = document.getElementById(elname);
	el.innerHTML = '';
	
	var width = 960,
		height = 500;

	var keys = d3.keys(notionalData);
    var min = null;
    var max = null;
    for (key in keys) {
        var value = notionalData[keys[key]];
        if (min == null || min > value)
            min = value;
        if (max == null || max < value)
            max = value;
    }

	var gradient = d3.scale.linear()
		.domain([min, max])
		.range(["blue", "red"]);
		
	var projection = d3.geo.mercator()
		.center([0, 0 ])
		.scale(120)
		.rotate([0,0]);

	var svg = d3.select("#" +elname).append("svg")
		.attr("width", width)
		.attr("height", height);

	var path = d3.geo.path()
		.projection(projection);

	var g = svg.append("g");
	// load and display the World
	d3.json("json/world-110m2.txt", function(error, topology) {			
		g.selectAll("path")
		  .data(topojson.object(topology, topology.objects.countries).geometries)
		.enter()
		  .append("path")
		  .attr("d", path)
		  .style("fill", function(c) {
		      if (valueMapper.countryByID[c.id] == null)
				console.log(c.id);
			else
				if(notionalData[valueMapper.countryByID[c.id].a3] > 0)
				    return gradient(notionalData[valueMapper.countryByID[c.id].a3]);
		  })
		  .on("mouseover", function(c) {
		      if (notionalData[valueMapper.countryByID[c.id].a3] == 0 || notionalData[valueMapper.countryByID[c.id].a3] == null)
				return;
			  var item = {
			      tradedRfqs: dealsData[valueMapper.countryByID[c.id].a3],
			      tradedNotional: notionalData[valueMapper.countryByID[c.id].a3]
			  };
			  //TODO: calling the function currently defined in the sizenodechart. this functions should go to the UI (index.html)
		      node_onMouseOver(item);
		  })
		  .on("mouseout", node_onMouseOut);
	});
}



