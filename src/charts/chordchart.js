"use strict";

var koTools = require ('./../kotools');
var charting = require('./../charting');

charting.chordChart = function(data, element, options) {

  var el = charting.getElementAndCheckData(element, data);
  if (!el){
      return;
  }

  var defaultOptions = {
      width: 800,
      height: 800,
      fillParentController:false,
      chordMouseOver: null
  };

  options = koTools.setDefaultOptions(defaultOptions, options);
  var dims = charting.getDimensions(options, el);
  var outerRadius = Math.min(dims.width, dims.height) / 2 - 100;
  var innerRadius = outerRadius - 24;

  //get the name of the item by id
  var descGetter = function (item) {
      if(options.hideNames){
          return item.index + 1;
      }
      return data.names[item.index];
  };

  var color = charting.colors;

  var arc = d3.svg.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);

  var layout = d3.layout.chord()
      .padding(0.04);

  var path = d3.svg.chord()
      .radius(innerRadius);

  var svg = el.append("svg")
      .attr("width", dims.width)
      .attr("height", dims.height)
      .append("g")
      .attr("id", "circle")
      .attr("transform", "translate(" + dims.width / 2 + "," + dims.height / 2 + ")");

  var formatValue = function(value){
      if(options.chordFormat){
          value = options.chordFormat(value);
      }
      return value;
  };

  var chordMouseOver = function (g, i) {
      var a1 = data.names[g.source.index];
      var a2 = data.names[g.source.subindex];
      var title = a1 + " - " + a2;
      var info = {};
      var value = formatValue(g.source.value);
      info[title] = value;

      //get all except this chord and put it in background
      svg.selectAll(".chord")
          .filter(function (d, index) {
              return i !== index;
          })
          .transition()
          .style("opacity", 0.1);

      charting.showTooltip(info);
  };

  var chordMouseOut = function (g, i) {
      svg.selectAll(".chord")
          .transition()
          .style("opacity", 1);

      charting.hideTooltip();
  };

  var mouseOverArc = function(opacity) {
      return function (g, i) {
          svg.selectAll(".chord")
              .filter(function (d) {
                  return d.target.index !== i && d.source.index !== i;
              })
              .transition()
              .style("opacity", opacity);

          var info = {};
          var value = formatValue(g.value);
          info[descGetter(g)] = value;
          charting.showTooltip(info);
      };
  };

  layout.matrix(data.matrix);
  var group = svg.selectAll(".group")
      .data(layout.groups)
      .enter().append("g")
      .attr("class", "group");


  group.append("path")
      .attr("id", function(d, i) { return "group" + i; })
      .attr("d", arc)
      .style("fill", function(d, i) { return color(i); })
      .on("mouseover", mouseOverArc(0.1))
      .on("mouseout", mouseOverArc(1));

  group.append("text")
      .each(function(d) { d.angle = (d.startAngle + d.endAngle) / 2; })
      .attr("dy", ".35em")
      .attr("transform", function(d) {
          return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")" +
          "translate(" + (innerRadius + 26) + ")" +
          (d.angle > Math.PI ? "rotate(180)" : "");
      })
      .style("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
      .attr("font-family", "Open Sans, sans-serif")
      .style("font-size", "13px")
      .text(descGetter);

  // Add the chords.
  svg.selectAll(".chord")
      .data(layout.chords)
      .enter().append("path")
      .attr("class", "chord")
      .style("fill", function(d) { return color(d.source.index); })
      .style("cursor","pointer")
      .attr("d", path)
      .on("mouseover", chordMouseOver)
      .on("mouseout", chordMouseOut)
      .on("click", chordMouseOver);
};
