var m = [20, 120, 20, 120],
		w = 1280 - m[1] - m[3],
		h = 800 - m[0] - m[2],
		i = 0,
		root;
var colors = ["#D5252F", "#E96B38", "#F47337", "#B02D5D", "#9B2C67", "#982B9A", "#692DA7", "#5725AA", "#4823AF"];
var formatNumber = d3.format(",.3f");

function drawSizeNodeChart(data, elname, maxLevels){
	var el = document.getElementById(elname);
	el.innerHTML = '';
	var tree = d3.layout.tree()
		.size([h, w]);

	var diagonal = d3.svg.diagonal()
		.projection(function(d) { return [d.y, d.x]; });

	var vis = d3.select("#" + elname).append("svg:svg")
		.attr("width", w + m[1] + m[3])
		.attr("height", h + m[0] + m[2])
	  .append("svg:g")
		.attr("transform", "translate(" + m[3] + "," + m[0] + ")");
		
	root=data;
	root.x0 = h / 2;
	root.y0 = 0;

	

	tree.children(function (d){ return d.children;});

	setup();

    if (root.children == null)
        return;

	root.children.forEach(toggleAll);
	update(root);

	function setup() {
		level1Radius=d3.scale.sqrt()
				.domain([0, maxLevels[3]])
				.range([3,50]);

		level2Radius=d3.scale.sqrt()
				.domain([0, maxLevels[2]])
				.range([3,50]);

		level3Radius=d3.scale.sqrt()
				.domain([0, maxLevels[1]])
				.range([3,50]);

		level4Radius=d3.scale.sqrt()
				.domain([0, maxLevels[0]])
				.range([3,50]);
	}

	function update(source) {

        var duration = d3.event && d3.event.altKey ? 5000 : 500;

        var nodes = tree.nodes(root).reverse();

        var depthCounter=0;

        // Normalize for fixed-depth.
        nodes.forEach(function(d) {
            d.y = d.depth * 180;
            d.numChildren=(d.children) ? d.children.length : 0;

            if (d.depth==1) {
                d.linkColor=colors[(depthCounter % (colors.length-1))];
                depthCounter++;
            }

            if (d.numChildren==0 && d._children) d.numChildren= d._children.length;

        });

        //Set link colors
        nodes.forEach(function (d) {
            var obj=d;

            while ((obj.source && obj.source.depth > 1) || obj.depth > 1) {
                obj=(obj.source) ? obj.source.parent : obj.parent;
            }

            d.linkColor=(obj.source) ? obj.source.linkColor : obj.linkColor;

        });

        // Update the nodes…
        var node = vis.selectAll("g.node")
                .data(nodes, function(d) { return d.id || (d.id = ++i); });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("svg:g")
                .attr("class", "node")
                .attr("transform", function(d) {
                    return "translate(" + source.y0 + "," + source.x0 + ")";
                })
                .on("click", function(d) {    
					toggle(d);
					update(d);
				});

        nodeEnter.append("svg:circle")
                .attr("r", 1e-6)
				.on("mouseover", node_onMouseOver)
                .on("mouseout", node_onMouseOut)
                .style("fill", function(d) { return d.source ? d.source.linkColor: d.linkColor;})
                .style("fill-opacity", ".8")
                .style("cursor","pointer")
				.style("stroke", function(d) { return d.source ? d.source.linkColor: d.linkColor;});
				
		nodeEnter.append("svg:text")
		  .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
		  .attr("dy", ".35em")
		  .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
		  .text(function(d) { return d.name; })
		  .style("fill-opacity", 1e-6);

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
                .duration(duration)
                .attr("transform", function(d) {
                    return "translate(" + d.y + "," + d.x + ")";
                });

        nodeUpdate.select("circle")
                .attr("r", getRadius)
                .style("fill", function(d) { return d.source ? d.source.linkColor: d.linkColor})
                .style("fill-opacity",  function(d) {
                    var ret = ((d.depth+1)/5);
                    return ret; });




        nodeUpdate.select("text")
                .style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
                .duration(duration)
                .attr("transform", function(d) {
                    return "translate(" + source.y + "," + source.x + ")";
                })
                .remove();

        nodeExit.select("circle")
                .attr("r", 1e-6);

        nodeExit.select("text")
                .style("fill-opacity", 1e-6);

        // Update the links…
        var link = vis.selectAll("path.link")
                .data(tree.links(nodes), function(d) {
                    return d.target.id;
                });

        var rootCounter=0;

        // Enter any new links at the parent's previous position.
        link.enter().insert("svg:path", "g")
                .attr("class", "link")
                .attr("d", function(d) {
                    if (Number(d.target["tradedNotional"]) > 0) {
                        var o = {x: source.x0, y: source.y0};
                        return diagonal({source: o, target: o});
                    }
                    else {
                        null;
                    }
                })
                .style("stroke",function (d,i) {
                    if (d.source.depth==0) {
                        rootCounter++;
                        return (d.source.children[rootCounter-1].linkColor);
                    }
                    else {
                        return (d.source) ? d.source.linkColor : d.linkColor;
                    }
                })
                .style("stroke-width", getStrokeWidth)
                .style("stroke-opacity", function(d) {
                    var ret = ((d.source.depth + 1) / 4.5);
                    if (d.target["tradedNotional"] <= 0)
                        ret = 0;
                    return ret;
                })
                .style("stroke-linecap","round")
                .transition()
                .duration(duration);

        // Transition links to their new position.
         var linkUpdate = link.transition()
                .duration(duration)
                .attr("d", diagonal);

	    linkUpdate
	        .style("stroke-width", getStrokeWidth)
	        .style("stroke-opacity", function(d) {
	            var ret = ((d.source.depth + 1) / 4.5)
	            if (d.target["tradedNotional"] <= 0) ret = 0;
	            return ret;
	        });


        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
                .duration(duration)
                .attr("d", diagonal)
                .remove();

        // Stash the old positions for transition.
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }	
}

function toggleAll(d) {
	if (d.children) {
	  d.children.forEach(toggleAll);
	  toggle(d);
	}
}

//TODO / radius dependancy on tradedNotional
function getRadius (d) {
    var ret = null;
	if (d.depth==0) {
		return 10;
	}
	else if (d.depth==1) {
		ret = level1Radius(d["tradedNotional"]);
	}
	else if (d.depth==2) {
		ret = level2Radius(d["tradedNotional"]);
	}
	else if (d.depth==3) {
		ret = level3Radius(d["tradedNotional"]);
	}
	else if (d.depth==4) {
		ret = level4Radius(d["tradedNotional"]);
	}
	return (isNaN(ret) ? 2 : ret);
};

function getStrokeWidth (d,i) {
    var ret = null;
	if (d.source.depth==0) {
		ret = level1Radius(d.target["tradedNotional"]) * 2;
	}
	else if (d.source.depth==1) {
		ret = level2Radius(d.target["tradedNotional"]) * 2;
	}
	else if (d.source.depth==2) {
		ret = level3Radius(d.target["tradedNotional"]) * 2;
	}
	else if (d.source.depth==3) {
		ret = level4Radius(d.target["tradedNotional"]) * 2;
	}
	return (isNaN(ret) ? 4 : ret);
}

function node_onMouseOver(d) {
    var info = {
        "Traded RFQs": d["tradedRfqs"],
        "Traded Notional": d["tradedNotional"].toFixed(2) + "mil. €"
    };
    showTooltip(info);
}

function node_onMouseOut(d) {
    hideTooltip();
}

// Toggle children.
function toggle(d) {
    if (d.children) {
	    d._children = d.children;
	    d.children = null;
    } else {
	    d.children = d._children;
	    d._children = null;
    }
}