
angular.module('askApp').controller('DashExploreCtrl', function($scope, $http, $routeParams, $location, surveyFactory, dashData, chartUtils) {
    
    $scope.activePage = 'explore';
    $scope.charts = {};
    $scope.filtersJson = '';

    function buildChart(questionSlug, options) {
        var options, onFail, onSuccess;
        
        onFail = function (data) {
            if (data.message && data.message.length > 0) {
                $scope.charts[questionSlug] = { message: data.message };
            } else {
                $scope.charts[questionSlug] = { message: "Failed to retrieve data." };
            }
        };
        
        onSuccess = function (chartConfig) {
            $scope.charts[questionSlug] = chartConfig;
        };

        
        if (options.type === 'pie') {
            chartUtils.buildPieChart($routeParams.surveySlug, questionSlug,
                $scope.filtersJson, options, onSuccess, onFail);
        } else if (options.type === 'bar') {
            chartUtils.buildStackedBarChart($routeParams.surveySlug, questionSlug,
                $scope.filtersJson, options, onSuccess, onFail);
        }
    }

    buildChart('org-type', {type: 'pie', title: "Organizations", yLabel: "Org Type"});
    buildChart('proj-num-people', {type: 'pie', title: "How many people are collecting the data?", yLabel: "Number of Projects"});
    buildChart('proj-data-years', {type: 'bar', title: "Project Duration", yLabel: "Number of Projects"});
    buildChart('proj-data-frequency', {type: 'bar', title: "Project Frequency", yLabel: "Number of Projects"});

    // To fill survey stats blocks.
    surveyFactory.getSurvey(function (data) {
        data.questions.reverse();
        $scope.survey = data;
    });
});