define(['./util/configurable', './eventLine', './delimiter'], function (d3l, configurable, eventLine, delimiter) {
    if (d3 == null)
        throw "Event drops expect d3 variable globaly defined";

    var defaultConfig = {
        start: new Date(0),
        end: new Date(),
        width: 1000,
        margin: {
            top: 60,
            left: 200,
            bottom: 40,
            right: 50
        },
        locale: null,
        axisFormat: null,
        tickFormat: [
            [".%L", function(d) { return d.getMilliseconds(); }],
            [":%S", function(d) { return d.getSeconds(); }],
            ["%I:%M", function(d) { return d.getMinutes(); }],
            ["%I %p", function(d) { return d.getHours(); }],
            ["%a %d", function(d) { return d.getDay() && d.getDate() != 1; }],
            ["%b %d", function(d) { return d.getDate() != 1; }],
            ["%B", function(d) { return d.getMonth(); }],
            ["%Y", function() { return true; }]
        ],
        eventHover: null,
        hasDelimiter: true,
        hasTopAxis: true,
        hasBottomAxis: function(data) {
            return data.length >= 10;
        },
        eventColor: 'black',
        eventSize: 5,
        eventDate: function(d) { return d.date; },
        minPercentile: null,
        maxPercentile: null,
        scale: d3.scale.linear
};

    var drops = function eventDrops(config) {
        var xScale = d3.time.scale();
        var yScale = d3.scale.ordinal();
        
        config = config || {};
        for (var key in defaultConfig) {
            config[key] = config[key] || defaultConfig[key];
        }

        function eventDropGraph(selection) {
            
            var min;
            var max;

            var rowHeight = 100;

            selection.each(function(data) {
                var zoom = d3.behavior.zoom().center(null).on("zoom", updateZoom);

                if (config.hasDelimiter) {
                    zoom.on("zoomend", redrawDelimiter);
                }
                var graphWidth = config.width - config.margin.right - config.margin.left;
                var graphHeight = data.length * rowHeight;
                var height = graphHeight + config.margin.top + config.margin.bottom;

                d3.select(this).select('svg').remove();

                var svg = d3.select(this)
                    .append('svg')
                    .attr('width', config.width)
                    .attr('height', height);

                var graph = svg.append('g')
                    .attr('transform', 'translate(0, 60)');

                var yDomain = [];
                var yRange = [];

                

                data.forEach(function (event, index) {

                    var values = event.dates.map(config.eventSize);
                    var dMin, dMax;
                    
                    if (config.minPercentile == null && config.maxPercentile == null) {
                        dMax = d3.max(values);
                        dMin = d3.min(values);
                    } else {
                        dMin = d3.quantile(values, config.minPercentile);
                        dMax = d3.quantile(values,config.maxPercentile);
                    }

                    if (dMin < min || min == null)
                        min = dMin;

                    if (dMax > max || max == null)
                        max = dMax;

                    yDomain.push(event.name);
                    yRange.push(index * rowHeight);
                });

                

                yScale.domain(yDomain).range(yRange);

                var yAxisEl = graph.append('g')
                    .classed('y-axis', true)
                    .attr('transform', 'translate(0, 60)');

                var yTick = yAxisEl.append('g').selectAll('g').data(yDomain);

                yTick.enter()
                    .append('g')
                    .attr('transform', function(d) {
                        return 'translate(0, ' + yScale(d) + ')';
                    })
                    .append('line')
                    .classed('y-tick', true)
                    .attr('x1', config.margin.left)
                    .attr('x2', config.margin.left + graphWidth);

                yTick.exit().remove();

                var curx, cury;
                var zoomRect = svg
                    .append('rect')
                    .call(zoom)
                    .classed('zoom', true)
                    .attr('width', graphWidth)
                    .attr('height', height)
                    .attr('transform', 'translate(' + config.margin.left + ', 35)');

                if (typeof config.eventHover === 'function') {
                    zoomRect.on('mousemove', function(d, e) {
                        var event = d3.event;
                        if (curx == event.clientX && cury == event.clientY) return;
                        curx = event.clientX;
                        cury = event.clientY;
                        zoomRect.attr('display', 'none');
                        var el = document.elementFromPoint(d3.event.clientX, d3.event.clientY);
                        zoomRect.attr('display', 'block');
                        if (el.tagName !== 'circle') return;
                        config.eventHover(el);
                    });
                }
                var bullScale = config.scale();

                //the scale is used to get the perimeter, 4 pixels to leave 2 pixels at each side
                bullScale.domain([min, max]).range([1, rowHeight/2 - 4]);

                xScale.range([0, graphWidth]).domain([config.start, config.end]);

                zoom.x(xScale);

                function updateZoom() {
                    if (d3.event.sourceEvent.toString() === '[object MouseEvent]') {
                        zoom.translate([d3.event.translate[0], 0]);
                    }

                    if (d3.event.sourceEvent.toString() === '[object WheelEvent]') {
                        zoom.scale(d3.event.scale);
                    }

                    redraw();
                }

                function redrawDelimiter() {
                    svg.select('.delimiter').remove();
                    var delimiterEl = svg
                        .append('g')
                        .classed('delimiter', true)
                        .attr('width', graphWidth)
                        .attr('height', 10)
                        .attr('transform', 'translate(' + config.margin.left + ', ' + (config.margin.top - rowHeight) + ')')
                        .call(delimiter({
                            xScale: xScale,
                            dateFormat: config.locale ? config.locale.timeFormat("%d %B %Y") : d3.time.format("%d %B %Y")
                        }));
                }

                function drawXAxis(where) {

                    // copy config.tickFormat because d3 format.multi edit its given tickFormat data
                    var tickFormatData = [];

                    config.tickFormat.forEach(function(item) {
                        var tick = item.slice(0);
                        tickFormatData.push(tick);
                    });

                    var tickFormat = config.locale ? locale.timeFormat.multi(tickFormatData) : d3.time.format.multi(tickFormatData);
                    var xAxis = d3.svg.axis()
                        .scale(xScale)
                        .orient(where)
                        .tickFormat(tickFormat);;

                    if (typeof config.axisFormat === 'function') {
                        config.axisFormat(xAxis);
                    }

                    var y = (where == 'bottom' ? parseInt(graphHeight) : 0) + config.margin.top - rowHeight;

                    graph.select('.x-axis.' + where).remove();
                    var xAxisEl = graph
                        .append('g')
                        .classed('x-axis', true)
                        .classed(where, true)
                        .attr('transform', 'translate(' + config.margin.left + ', ' + y + ')')
                        .call(xAxis);
                }

                function redraw() {

                    var hasTopAxis = typeof config.hasTopAxis === 'function' ? config.hasTopAxis(data) : config.hasTopAxis;
                    if (hasTopAxis) {
                        drawXAxis('top');
                    }

                    var hasBottomAxis = typeof config.hasBottomAxis === 'function' ? config.hasBottomAxis(data) : config.hasBottomAxis;
                    if (hasBottomAxis) {
                        drawXAxis('bottom');
                    }

                    zoom.size([config.width, height]);

                    graph.select('.graph-body').remove();
                    var graphBody = graph
                        .append('g')
                        .classed('graph-body', true)
                        .attr('transform', 'translate(' + config.margin.left + ', ' + (config.margin.top - 40) + ')');

                    var lines = graphBody.selectAll('g').data(data);

                    lines.enter()
                        .append('g')
                        .classed('line', true)
                        .attr('transform', function(d) {
                            return 'translate(0,' + yScale(d.name) + ')';
                        })
                        .call(eventLine({ xScale: xScale,eventDate:config.eventDate, eventSize:config.eventSize,eventColor:config.eventColor,bullScale:bullScale}));

                    lines.exit().remove();
                }

                redraw();
                if (config.hasDelimiter) {
                    redrawDelimiter();
                }
            });
        }

        configurable(eventDropGraph, config);

        return eventDropGraph;
    };
    return drops;
});
