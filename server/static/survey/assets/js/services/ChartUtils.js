
angular.module('askApp')
  .factory('chartUtils', function ($http, dashData) {


    var buildStackedBarChart = function (surveySlug, questionSlug, filters, options, setChart_callback, onFail_callback) {

        var onDataFail = function (data) { 
            onFail_callback(data);
        };

        var onDataSuccess = function (data) {
            
            var chartConfig = {
                labels: _.pluck(data.answer_domain, "answer"),
                displayTitle: true,
                yLabel: options.yLabel,
                title: options.title,
                categories: [""],
                type: "stacked-column",
                data: _.pluck(data.answer_domain, "surveys"),
                download_url: app && app.user && app.user.is_staff ? data.csvUrl : '',
                unit: options.unit || "projects",
            };
            setChart_callback(chartConfig);
        };

        dashData.getDistribution(surveySlug, questionSlug, filters, onDataSuccess, onDataFail);
    };


    var buildPieChart = function (surveySlug, questionSlug, filters, options, setChart_callback, onFail_callback) {

        var onDataFail = function (data) { 
            debugger; 
            onFail_callback(data);
        };

        var onDataSuccess = function (data) {
            // Format data for highcharts.

            var formattedData = [];
            var N = 0;
            _.each(data.answer_domain, function (item) {
                formattedData.push({name:item.answer, y:item.surveys});
                N += item.surveys;
            });
           
            // Put all [Other] answers into a single group.
            var othersGroup = { name: 'Other', y: 0 };
            _.each(formattedData, function (grouping, i) {
                if (grouping.name.substr(0,7) == '[Other]') {
                    othersGroup.y = othersGroup.y + grouping.y;
                    formattedData = _.reject(formattedData, function(elm) {
                        return elm === grouping;
                    })
                }
            });

            if (othersGroup.y > 0) {
                formattedData.push(othersGroup);
            }

            formattedData = _.reject(formattedData, function (item) {
                return item.y === 0;
            });

            formattedData.push({name:N + ' Total Projects', y:null, color:'transparent'});

            var chartConfig = {
                data: formattedData,
                download_url: app && app.user && app.user.is_staff ? data.csvUrl : '',
                title: options.title,
                displayTitle: true,
                yLabel: options.yLabel,
                unit: options.unit || "projects",
                N : N
            };
            setChart_callback(chartConfig);
        };

        dashData.getDistribution(surveySlug, questionSlug, filters, onDataSuccess, onDataFail);
    };


    return {
        'buildStackedBarChart': buildStackedBarChart,
        'buildPieChart': buildPieChart
    };
});
