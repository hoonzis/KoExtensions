define(function() {
    var defaultConfig = {
        xScale: null,
        dateFormat: null
    };

    return function (config) {
        config = config || {};
        for (var key in defaultConfig) {
            config[key] = config[key] || defaultConfig[key];
        }
        function delimiter(selection) {
        

            selection.each(function(data) {
                d3.select(this).selectAll('text').remove();

                var limits = config.xScale.domain();

                d3.select(this).append('text')
                    .text(function() {

                        return config.dateFormat(limits[0]);
                    })
                    .classed('start', true);

                d3.select(this).append('text')
                    .text(function() {

                        return config.dateFormat(limits[1]);
                    })
                    .attr('text-anchor', 'end')
                    .attr('transform', 'translate(' + config.xScale.range()[1] + ')')
                    .classed('end', true);
            });
        }

        return delimiter;
    }
});
