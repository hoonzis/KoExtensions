"use strict";
define(['d3','./../charting','./../kotools'], function (d3,charting,koTools) {
    charting.treeChart = function (data, element, options) {
        var el = charting.getElementAndCheckData(element, data);
        if (!el) {
            return;
        }

        var defaultOptions = {
            legend: true,
            width: 500,
            height: 200,
            maxBubbleSize: 50,
            bubbleHorizontal: function(d) { return d.x; },
            bubbleVertical: function(d) { return d.y; },
            bubbleSize: function(d) { return d.size; },
            bubbleColor: function(d) { return d.color; },
            horizontalLabel: 'x',
            verticalLabel: 'y',
            sizeLabel: 'size',
            typeLabel: 'type',
            xAxisLabel: false,
            yAxisLabel: false,
            xAxisTextAngle: null
        };

        options = koTools.setDefaultOptions(defaultOptions, options);

        // get all the names for the legend (that will be represented by the color of each bull)
        var keys = data.map(options.bubbleColor);

        var dims = charting.getDimensions(options, el, keys);


		var diagonal = d3.svg.diagonal()
			.projection(function(d) { return [d.y, d.x]; });



		root=data;
		root.x0 = h / 2;
		root.y0 = 0;
		tree.children(function (d){ return d.children;});

		setup();
	    if (!root.children)
	        return;

		root.children.forEach(toggleAll);
		update(root);

		var levelRadius = d3.scale.sqrt()
				.domain([0, maxLevels[3]])
				.range([3,50]);

		var getRadius = function(d) {
			return levelRadius(options.bullSize(d));
		};

		var toggleAll = function(d) {
			if (d.children) {
			  d.children.forEach(toggleAll);
			  toggle(d);
			}
		};

		var toggle = function(d) {
		    if (d.children) {
			    d._children = d.children;
			    d.children = null;
		    } else {
			    d.children = d._children;
			    d._children = null;
		    }
		};


		var update = function(source) {
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

	            if (d.numChildren === 0 && d._children){
					d.numChildren = d._children.length;
				}
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

	        // Transition nodes to their new position.
	        var nodeUpdate = node.transition()
	                .duration(duration)
	                .attr("transform", function(d) {
	                    return "translate(" + d.y + "," + d.x + ")";
	                });

	        nodeUpdate.select("circle")
	                .attr("r", getRadius)
	                .style("fill", function(d) { return d.source ? d.source.linkColor: d.linkColor;})
	                .style("fill-opacity",  function(d) {
	                    var ret = ((d.depth+1)/5);
	                    returern ret; });

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
	                    if (Number(d.target.tradedNotional) > 0) {
	                        var o = {x: source.x0, y: source.y0};
	                        return diagonal({source: o, target: o});
	                    }
	                    else {
	                        return null;
	                    }
	                })
	                .style("stroke",function (d,i) {
	                    if (d.source.depth===0) {
	                        rootCounter++;
	                        return (d.source.children[rootCounter-1].linkColor);
	                    }
	                    else {
	                        return (d.source) ? d.source.linkColor : d.linkColor;
	                    }
	                })
	                .style("stroke-width", getRadius)
	                .style("stroke-opacity", function(d) {
	                    var ret = ((d.source.depth + 1) / 4.5);
	                    if (d.target.tradedNotional <= 0)
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
		        .style("stroke-width", getRadius)
		        .style("stroke-opacity", function(d) {
		            var ret = ((d.source.depth + 1) / 4.5);
		            if (d.target.tradedNotional <= 0)
						ret = 0;
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
	    };
	};
});
