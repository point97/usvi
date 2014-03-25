
angular.module('askApp')
    .config(['$httpProvider', function($httpProvider) {
        $httpProvider.defaults.headers.patch = {
            'Content-Type': 'application/json;charset=utf-8'
        }
    }])
    .controller('RespondantListCtrl', function($scope, $http, $routeParams, $location, history) {


    $scope.busy = true;
    $scope.viewPath = app.server + '/static/survey/';
    $scope.activePage = 'responses';


    $http.get('/api/v1/dashrespondant/?format=json&survey__slug__exact=' + $routeParams.surveySlug).success(function(data) {
        $scope.respondents = data.objects;
        $scope.meta = data.meta;
        $scope.responsesShown = $scope.respondents.length;
        $scope.busy = false;
    });


    $scope.showRespondent = function (respondent) {
        var path = ['/RespondantDetail', $routeParams.surveySlug, respondent.uuid].join('/');
        $location.path(path);
    };


    $scope.getAnswer = function(questionSlug, respondent) {
        return history.getAnswer(questionSlug, respondent);
    };


    $scope.showNext20 = function(surveyFilter) {
        $scope.gettingNext20 = true;
        $http.get($scope.meta.next)
            .success(function (data, callback) {
                _.each(data.objects, function(respondent, index) {
                    $scope.respondents.push(respondent);
                });
                $scope.gettingNext20 = false;
                $scope.meta = data.meta;
            }).error(function (data) {
                console.log(data);
            }); 
    };

    
    $scope.getTitle = function() {
        return history.getTitle($scope.respondent);
    };


});
