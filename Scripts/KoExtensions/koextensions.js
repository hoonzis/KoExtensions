define(['./charting', './kotools', './Charts/barchart', './Charts/piechart', './Charts/linechart', './Charts/histogramchart', './Charts/scatterplot', './Charts/chordchart', './Charts/bubblechart'],
    function (charting, kotools) {
        function koextensions() {
            var self = this;

            //let tools and charting be accesible globaly
            self.tools = kotools;
            self.charting = charting;

            charting.initializeCharts();
            var markers = [];

            self.registerExtensions = function () {
              if(ko === null){
                  throw "If you want to use KoExtensions with Knockout, please reference Knockout before calling registerExtensions";
              }
                ko.bindingHandlers.map = {
                    init: function(element, valueAccessor, allBindingsAccessor, viewModel) {

                        try {
                            var position = new google.maps.LatLng(allBindingsAccessor().latitude(), allBindingsAccessor().longitude());

                            var marker = new google.maps.Marker({
                                map: allBindingsAccessor().map,
                                position: position,
                                title: name
                            });

                            google.maps.event.addListener(marker, 'click', function() {
                                allBindingsAccessor().itemSelected();
                            });

                            markers.push(marker);
                            viewModel._mapMarker = marker;

                            allBindingsAccessor().map.setCenter(position);
                        } catch (err) {
                        }
                    },
                    update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
                        try {
                            var latlng = new google.maps.LatLng(allBindingsAccessor().latitude(), allBindingsAccessor().longitude());
                            viewModel._mapMarker.setPosition(latlng);
                        } catch (err) {
                        }
                    }
                };

                ko.bindingHandlers.datepicker = {
                    init: function(element, valueAccessor, allBindingsAccessor) {
                        //initialize datepicker with some optional options
                        var options = allBindingsAccessor().datepickerOptions || {};
                        $(element).datepicker(options);

                        //when a user changes the date, update the view model
                        ko.utils.registerEventHandler(element, "changeDate", function(event) {
                            var value = valueAccessor();
                            if (ko.isObservable(value)) {
                                value(event.date);
                            }
                        });
                    },
                    update: function(element, valueAccessor) {
                        var widget = $(element).data("datepicker");

                        if (widget != null) {
                            var vmValue = ko.utils.unwrapObservable(valueAccessor());

                            //if we have a string value - convert it first
                            if (kotools.isString(vmValue)) {
                                vmValue = new Date(vmValue);
                            }

                            //if the date is not valid - don't visualize it, or we would have a "NaN/NaN/NaN"
                            if (!kotools.isValidDate(vmValue))
                                return;

                            widget.setDates(vmValue);
                        }
                    }
                };

                ko.bindingHandlers.linechart = {
                    update: function(element, valueAccessor, allBindingsAccessor) {
                        var options = allBindingsAccessor().chartOptions;
                        var data = allBindingsAccessor().linechart();
                        charting.lineChart(data, element, options);
                    }
                };

                ko.bindingHandlers.piechart = {
                    update: function(element, valueAccessor, allBindingsAccessor) {
                        var data = allBindingsAccessor().piechart();
                        var options = allBindingsAccessor().chartOptions;
                        charting.pieChart(data, element, options);
                    }
                };

                ko.bindingHandlers.barchart = {
                    update: function(element, valueAccessor, allBindingsAccessor) {
                        var data = ko.unwrap(valueAccessor());
                        var options = ko.unwrap(allBindingsAccessor().chartOptions);

                        var line = null;
                        if (allBindingsAccessor().line != null)
                            line = allBindingsAccessor().line();
                        charting.barChart(data, element, options, line);
                    }
                };

                ko.bindingHandlers.chordChart = {
                    update: function (element, valueAccessor, allBindingsAccessor) {
                        var data = allBindingsAccessor().chordChart();
                        var options = allBindingsAccessor().chartOptions;
                        charting.chordChart(data, element, options);
                    }
                };

                ko.bindingHandlers.eventDrops = {
                    update: function(element, valueAccessor, allBindingsAccessor) {

                        var chartData = {
                            data: ko.unwrap(allBindingsAccessor().eventDrops),
                            options: ko.unwrap(allBindingsAccessor().chartOptions)
                        };

                        //if the eventColor was specified, need to get all possible colors to create a scale
                        var allItemsColorValues = chartData.data.map(function(f) {
                            return f.dates.map(chartData.options.eventColor);
                        });

                        //flattening the data since it is grouped in 2 dimensional array
                        var flatColorsArray = d3.set([].concat.apply([], allItemsColorValues)).values();

                        var color = d3.scale.category20().domain(flatColorsArray);

                        element._chartData = chartData;

                        var eventDropsChart = d3.chart.eventDrops()
                            .start(chartData.options.start)
                            .end(chartData.options.end)
                            .width(chartData.options.width)
                            .eventColor(function(d) {
                                return color(chartData.options.eventColor(d));
                            })
                            //.eventSize(chartData.options.eventSize)
                            .eventDate(chartData.options.eventDate)
                            .eventHover(chartData.options.eventHover)
                            .minPercentile(chartData.options.minPercentile)
                            .maxPercentile(chartData.options.maxPercentile)
                            .scale(chartData.options.scale);

                        d3.select(element)
                            .datum(chartData.data)
                            .call(eventDropsChart);

                    }
                };

                ko.bindingHandlers.histogram = {
                    update: function(element, valueAccessor, allBindingsAccessor) {
                        var data = ko.unwrap(valueAccessor());
                        var options = ko.unwrap(allBindingsAccessor().chartOptions);
                        charting.histogram(data, element, options);
                    }
                };

                ko.bindingHandlers.scatterplot = {
                    update: function(element, valueAccessor, allBindingsAccessor) {
                        var data = ko.unwrap(valueAccessor());
                        var options = ko.unwrap(allBindingsAccessor().chartOptions);
                        charting.scatterPlot(data, element, options);
                    }
                };

                ko.bindingHandlers.bubblechart = {
                    update: function(element, valueAccessor, allBindingsAccessor) {
                        var data = ko.unwrap(valueAccessor());
                        var options = ko.unwrap(allBindingsAccessor().chartOptions);
                        charting.bubbleChart(data, element, options);
                    }
                };

                ko.bindingHandlers.formattedValue = {
                    update: function (element, valueAccessor, allBindingsAccessor) {
                        var fValue = getFormattedValueFromAccessor(allBindingsAccessor());
                        applyFormattedValue(fValue, element);
                    }
                }

                ko.bindingHandlers.progress = {
                    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
                        var value = valueAccessor()();
                        if (value == null)
                            value = 0;
                        element.style.width = value + "%";
                        element.style.display = 'none';
                        element.style.display = 'block';
                    },
                    update: function (element, valueAccessor, allBindingsAccessor) {
                        var value = valueAccessor()();
                        if (value == null)
                            value = 0;
                        element.style.width = value + "%";
                    }
                };
            };

            function applyFormattedValue(fValue, element) {
                //TODO: test if val is function  => observable then evaluate, test if it is a number before calling toCurrencyString
                if (fValue.val != null) {
                    if (fValue.transf != null)
                        fValue.val = fValue.transf(fValue.val);
                    if (kotools.isNumber(fValue.val)) {
                        element.innerHTML = fValue.val.toCurrencyString(fValue.currency, fValue.rounding);
                    } else {
                        element.innerHTML = fValue.val;
                    }
                }
            };

            function getFormattedValueFromAccessor(accessor) {
                var fValue = {
                    currency: getValue(accessor.currency),
                    val: getValue(accessor.formattedValue),
                    transf: accessor.transformation,
                    rounding: getValue(accessor.rounding)
                };
                return fValue;
            }



            function getValue(val) {
                if (val != null && typeof (val) == 'function')
                    val = val();
                return val;
            };
        };

        return new koextensions();
    });
