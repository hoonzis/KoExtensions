var charting = null;
var koTools;
define(['./charting', './kotools', './EventDrops/eventDrops'],
    function (ch, kotools, eventDrops) {
        if (ko == null)
            throw "Ko extensions depend on globally defined knockout ko variable";
        koTools = kotools;
        charting = ch;
        charting.initializeCharts();
        var markers = [];
        ko.bindingHandlers.map = {
            init: function (element, valueAccessor, allBindingsAccessor, viewModel) {

                try {
                    var position = new google.maps.LatLng(allBindingsAccessor().latitude(), allBindingsAccessor().longitude());

                    var marker = new google.maps.Marker({
                        map: allBindingsAccessor().map,
                        position: position,
                        title: name
                    });

                    google.maps.event.addListener(marker, 'click', function () {
                        allBindingsAccessor().itemSelected();
                    });

                    markers.push(marker);
                    viewModel._mapMarker = marker;

                    allBindingsAccessor().map.setCenter(position);
                }
                catch (err) { }
            },
            update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
                try {
                    var latlng = new google.maps.LatLng(allBindingsAccessor().latitude(), allBindingsAccessor().longitude());
                    viewModel._mapMarker.setPosition(latlng);
                } catch (err) { }
            }
        };

    ko.bindingHandlers.datepicker = {
        init: function (element, valueAccessor, allBindingsAccessor) {
            //initialize datepicker with some optional options
            var options = allBindingsAccessor().datepickerOptions || {};
            $(element).datepicker(options);

            //when a user changes the date, update the view model
            ko.utils.registerEventHandler(element, "changeDate", function (event) {
                var value = valueAccessor();
                if (ko.isObservable(value)) {
                    value(event.date);
                }
            });
        },
        update: function (element, valueAccessor) {
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

    function transformData(chartData) {
        if (chartData.transf != null)
            chartData.data = chartData.data.map(chartData.transf);
        if (chartData.options.normalizeSeries) {
            chartData.data = kotools.normalizeSeries(chartData.data);
        }

        chartData.data = koTools.convertAllSeriesToXYPairs(chartData.data);        
    }

    function getLineDataFromAccessor(accesor) {
        var options = setDefaultOptions(accesor.chartOptions, "line");
        var chartData = {
            transf: accesor.transformation,
            data: accesor.linechart(),
            options: options
        };
        chartData.options.unitTransform = accesor.unitTransform;
        transformData(chartData);
        return chartData;
    }

    ko.bindingHandlers.
        linechart = {
        update: function (element, valueAccessor, allBindingsAccessor) {
            var chartData = getLineDataFromAccessor(allBindingsAccessor());

            if (isValidUpdate(element._chartData,chartData)) {
                element.innerHTML = "";
                drawLineChart(chartData.data, element, chartData.options,charting);
                element._chartData = chartData;
            }
        }
    };

    function getPieDataFromAccessor(accesor) {
        var chartData = {
            transf: accesor.transformation,
            data: accesor.piechart(),
            options: setDefaultOptions(accesor.chartOptions, "pie")
        };
        chartData.options.unitTransform = accesor.unitTransform;
        transformData(chartData);
        return chartData;
    }

    ko.bindingHandlers.piechart = {
        update: function (element, valueAccessor, allBindingsAccessor) {
            var chartData = getPieDataFromAccessor(allBindingsAccessor());

            if (isValidUpdate(element._chartData, chartData)) {
                element.innerHTML = "";
                drawPieChart(chartData.data, element, chartData.options,charting);
                element._chartData = chartData;
            }
        }
    };

    function getBarChartDataFromAccessor(accessor) {
        var chartData = {
            data: accessor.barchart(),
            options: setDefaultOptions(accessor.chartOptions, "bar"),
            xcoord: accessor.xcoord
        };
        if (accessor.line != null)
            chartData.line = accessor.line();
        chartData.options.unitTransform = accessor.unitTransform;
        return chartData;
    };

    ko.bindingHandlers.barchart = {
        update: function (element, valueAccessor, allBindingsAccessor) {
            var chartData = getBarChartDataFromAccessor(allBindingsAccessor());
            
            if (isValidUpdate(element._chartData,chartData)) {
                element.innerHTML = "";
                element._chartData = chartData;
                drawBarChart(chartData.data, element, chartData.options, chartData.xcoord, chartData.line,charting);
            }
        }
    };

    ko.bindingHandlers.eventDrops = {
        update: function(element, valueAccessor, allBindingsAccessor) {

            var chartData = {
                data: ko.unwrap(allBindingsAccessor().eventDrops),
                options: ko.onwrap(allBindingsAccessor().chartOptions)
            };

            //if the eventColor was specified, need to get all possible colors to create a scale
            var allItemsColorValues = chartData.data.map(function(f) {
                return f.dates.map(chartData.options.eventColor);
            });

            //flattening the data since it is grouped in 2 dimensional array
            var flatColorsArray = d3.set([].concat.apply([], allItemsColorValues)).values();

            var color = d3.scale.category20().domain(flatColorsArray);

            if (isValidUpdate(element._chartData,chartData)) {
                element.innerHTML = "";
                element._chartData = chartData;

                var eventDropsChart = eventDrops()
                    .start(chartData.options.start)
                    .end(chartData.options.end)
                    .width(chartData.options.width)
                    .eventColor(function(d) {
                        return color(chartData.options.eventColor(d));
                    })
                    .eventSize(chartData.options.eventSize)
                    .eventDate(chartData.options.eventDate)
                    .eventHover(chartData.options.eventHover)
                    .minPercentile(chartData.options.minPercentile)
                    .maxPercentile(chartData.options.maxPercentile)
                    .scale(chartData.options.scale);

                d3.select(element)
                    .datum(chartData.data)
                    .call(eventDropsChart);
            }
        }
    };

        ko.bindingHandlers.histogram = {
            update: function (element, valueAccessor, allBindingsAccessor) {
                var data = ko.unwrap(valueAccessor());
                var options = ko.unwrap(allBindingsAccessor().chartOptions);
                drawHistogram(data, element, options,charting);
            }
        };

        ko.bindingHandlers.scatterplot = {
            update: function (element, valueAccessor, allBindingsAccessor) {
                var data = ko.unwrap(valueAccessor());
                var options = ko.unwrap(allBindingsAccessor().chartOptions);
                element.innerHTML = "";
                drawScatterPlot(data, element, options, charting);
            }
        };

        ko.bindingHandlers.bubblechart = {
            update: function (element, valueAccessor, allBindingsAccessor) {
                var data = ko.unwrap(valueAccessor());
                var options = ko.unwrap(allBindingsAccessor().chartOptions);
                drawBubbleChart(data, element, options, charting);
            }
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

    function getValue(val) {
        if (val != null && typeof (val) == 'function')
            val = val();
        return val;
    };
});

