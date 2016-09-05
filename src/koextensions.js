"use strict";

var kotools = require ('./kotools');
var charting = require('./charting');
require('./charts/piechart');
require('./charts/barchart');
require('./charts/linechart');
require('./charts/chordchart');
require('./charts/bubblechart');
require('./charts/histogramchart');

function koextensions() {
  var self = this;

  //let tools and charting be accesible globaly
  self.tools = kotools;
  self.charting = charting;

  self.registerExtensions = function () {
      if (typeof(ko) === 'undefined') {
          console.log("Knockout was not found, using standalon KoExtensions for charting");
          return;
      }

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
              var line = ko.unwrap(allBindingsAccessor().line);
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

var koext = new koextensions();
koext.registerExtensions();

module.exports = koext;
