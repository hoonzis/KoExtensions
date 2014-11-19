function drawChordChart(data,elname,charting){
    var el = d3.select("#" + elname);
    var htmlEL = document.getElementById(elname);
    htmlEL.innerHTML = "";

    var formatter = statsVM.values.formatters["Traded Notional"];

    //get the name of the item by id
    var descGetter = function (item) {

        var obj = data.realNames.filter(function(i) {
            return i.FirmID == data.namesByIndex[item.index];
        })[0];
        if (obj == null) {
            console.log("missing in the firms list: " + data.namesByIndex[item.index]);
            return data.namesByIndex[item.index];
        }
        return obj["FirmName"];
    };
    if(data.hideNames)
        descGetter = function (item) { return item.index + 1; };

    var color = d3.scale.category20();
  
    var width = 1300,
        height = 1000,
        outerRadius = Math.min(width, height) / 2 - 100,
        innerRadius = outerRadius - 24;

    var arc = d3.svg.arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);

    var layout = d3.layout.chord()
        .padding(.04);

    var path = d3.svg.chord()
        .radius(innerRadius);

    var svg = el.append("svg")
        .attr("width", width)
        .attr("height", height)
      .append("g")
        .attr("id", "circle")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    // Compute the chord layout.
    layout.matrix(data.matrix);

    // Add a group per neighborhood.
    var group = svg.selectAll(".group")
        .data(layout.groups)
      .enter().append("g")
        .attr("class", "group");

    // Add the group arc.
    var groupPath = group.append("path")
        .attr("id", function(d, i) { return "group" + i; })
        .attr("d", arc)
        .style("fill", function(d, i) { return color(i); })
		.on("mouseover", fade(.1))
		.on("mouseout", fade(1));
		
    group.append("text")
      .each(function(d) { d.angle = (d.startAngle + d.endAngle) / 2; })
      .attr("dy", ".35em")
      .attr("transform", function(d) {
        return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
            + "translate(" + (innerRadius + 26) + ")"
            + (d.angle > Math.PI ? "rotate(180)" : "");
      })
      .style("text-anchor", function (d) { return d.angle > Math.PI ? "end" : null; })
      .attr("font-family", "Open Sans, sans-serif")
	  .style("font-size","13px")
      .text(descGetter);

    // Add the chords.
    svg.selectAll(".chord")
        .data(layout.chords)
        .enter().append("path")
        .attr("class", "chord")
        .style("fill", function(d) { return color(d.source.index); })
        .attr("d", path)
        .on("mouseover", chord_mouse_over)
        .on("mouseout", chord_mouse_out);

    function fade(opacity) {
        return function (g, i) {
            var notional = formatter(g.value);
			svg.selectAll(".chord")
				.filter(function(d) {
					return d.target.index != i && d.source.index != i;
				})
				.transition()
				.style("opacity", opacity);

            var info = {
                "Traded Notional": notional,
            };
			charting.showTooltip(info);
        };
    }

    function chord_mouse_over(g,i) {
        var notional = formatter(g.source.value);
        var a1 = data.namesByIndex[g.source.index];
        var a2 = data.namesByIndex[g.source.subindex];
        var title = a1 + " - " + a2;
        var info = {};
        info[title] = notional;

        //get all except this chord and put it in background
        svg.selectAll(".chord")
			.filter(function (d,index) {
                return i != index;
			})
			.transition()
			.style("opacity", 0.1);

        charting.showTooltip(info);
    }

    function chord_mouse_out(g, i) {
        //shod all chords
        svg.selectAll(".chord")
            .transition()
			.style("opacity", 1);

        charting.hideTooltip();
    }
}