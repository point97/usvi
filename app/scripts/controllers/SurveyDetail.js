'use strict';

angular.module('askApp')
    .controller('SurveyDetailCtrl', function($scope, $routeParams, $http, $location, offlineSurvey) {

    $http.get('/api/v1/survey/' + $routeParams.surveySlug + '/?format=json').success(function(data) {
        $scope.survey = data;

        $scope.question = _.find($scope.survey.questions, function(question) {
            return question.slug === $routeParams.questionSlug;
        });
    });

    $scope.getNextQuestion = function() {
        // should return the slug of the next question
        var nextQuestion = $scope.survey.questions[_.indexOf($scope.survey.questions, $scope.question) + 1];

        return nextQuestion ? nextQuestion.slug: null;
    };

    $scope.answerQuestion = function() {
        var url = ['/respond/answer',$scope.survey.slug, $routeParams.questionSlug, $routeParams.uuidSlug].join('/'),
            nextQuestion = $scope.getNextQuestion(),
            nextUrl = ['survey', $scope.survey.slug, nextQuestion, $routeParams.uuidSlug].join('/');

        if ($scope.survey.offline) {
            offlineSurvey.answerQuestion($scope.survey, $scope.question, $scope.answer);
        } else {
            $http({
                url: url,
                method: 'POST',
                headers: {'X-CSRFToken' : token },
                data: {
                    'answer': $scope.answer
                }
            }).success(function(data) {

            });
        }
        $location.path(nextUrl);

    };

});