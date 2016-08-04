define(['./charting', './kotools', './Charts/barchart', './Charts/piechart', './Charts/linechart', './Charts/histogramchart', './Charts/scatterplot', './Charts/chordchart', './Charts/bubblechart'],
    function (charting, kotools) {
        function koextensions() {
            var self = this;

            //let tools and charting be accesible globaly
            self.tools = kotools;
            self.charting = charting;

            self.registerExtensions = function () {
                if (typeof(ko) === 'undefined') {
                    throw "If you want to use KoExtensions with Knockout, please reference Knockout before calling registerExtensions";
                }

                ko.bindingHandlers.mapbox = {
                    init: function (element,valueAccessor, allBindings) {
                        if (typeof(L) !== 'undefined') {
                            var options = allBindings().mapOptions;
                            var mapBox = L.mapbox.map(element, 'mapbox.streets',options);
                            element._mapBox = mapBox;
                        }
                    },
                    update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
                        if (element._mapBoxLayer) {
                            element._mapBox.removeLayer(element._mapBoxLayer);
                        }

                        var bindings = allBindingsAccessor();
                        var points = bindings.mapbox();

                        if (points && points.length > 0) {
                            var geojson = {
                                type: 'FeatureCollection',
                                features: points.map(function(point) {
                                    var lat = point.lat();
                                    var lng = point.lng();

                                    return {
                                        type: 'Feature',
                                        properties: {
                                            'marker-color': '#f86767',
                                            'marker-size': 'large',
                                            'marker-symbol': 'star'
                                        },
                                        geometry: {
                                            type: 'Point',
                                            coordinates: [lng, lat]
                                        }
                                    };
                                })
                            };

                            element._mapBoxLayer = L.mapbox.featureLayer(geojson);
                            element._mapBoxLayer.addTo(element._mapBox);
                            element._mapBox.fitBounds(element._mapBoxLayer.getBounds());
                        }
                    }
                };

                ko.bindingHandlers.gmap = {
                    init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
                         var gmap = new google.maps.Map(element, {
                            center: {lat: -34.397, lng: 150.644},
                            zoom: 8
                          });

                        element._gmap = gmap;
                    },
                    update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
                        var bindings = allBindingsAccessor();
                        var points = bindings.gmap();
                        var latlngbounds = new google.maps.LatLngBounds(),i = 0;
                        var point;
                        for(i = 0;i<points.length;i++) {
                            point = points[i];
                            var position = new google.maps.LatLng(point.lat(),point.lng());
                            latlngbounds.extend(position);
                            var marker = point._gmarker;
                            if(!marker){
                                marker = new google.maps.Marker({
                                    map:element._gmap,
                                    position: position,
                                    title: name
                                });


                                var listenerFactory = function(point){
                                    return function(){
                                        bindings.markerSelected(point);
                                    };
                                };

                                google.maps.event.addListener(marker, 'click', listenerFactory(point));
                                point._mapMarker = marker;
                            }
                            marker.setPosition(position);
                        }
                        element._gmap.fitBounds(latlngbounds);
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
                            if (!kotools.isValidDate(vmValue)) {
                                return;
                            }

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
                        if (allBindingsAccessor().line != null) {
                            line = allBindingsAccessor().line();
                        }
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
                    } else if (kotools.isDate(fValue.val)) {
                        element.innerHTML = fValue.val.toFormattedString();
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
