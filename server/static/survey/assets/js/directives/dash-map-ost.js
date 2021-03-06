angular.module('askApp').directive('dashMapOst', function($http, $compile, $timeout, $routeParams, survey) {

    var directive = {
        templateUrl: app.viewPath + 'views/ost/dashMapOst.html',
        restrict: 'EA',
        replace: true,
        transclude: true,
        scope: {
            lat: "=",
            lng: "=",
            zoom: "=",
            points: '=',
            units: '=',
            boundaryPath: '=',
            gridPath: '=',
            activeProject: '=',
            activeEcosystemFeatures: '=',
            showPopups: '=',
            slugToColor: '&',
            slugToLabel: '&'
        }
    };

    directive.link = function (scope, element) {
        var map,
            markers = [],
            controls,
            puPromise;

        function init () {
            map = MapUtils.initMap(element[0].children[0].children[0],
                    scope.lat, scope.lng, scope.zoom);

            map.scrollWheelZoom.disable();
            map.on('focus', function(e) {
                map.scrollWheelZoom.enable();
            });
            map.on('blur', function(e) {
                map.scrollWheelZoom.disable();
            });

            MapUtils.addBoundary(scope.boundaryPath, function (layer) {
                scope.boundaryLayer.addLayer(layer)
                scope.boundaryLayer.bringToBack()
            });

            puPromise = $http.get(scope.gridPath);

            scope.$watch('units', function(newVal, oldVal) {
                if (newVal === oldVal) return;

                if (newVal !== undefined) {
                    updatePuLayer(newVal);
                }
            });

            scope.boundaryLayer = L.featureGroup();
            map.addLayer(scope.boundaryLayer);
            map.controls.addOverlay(scope.boundaryLayer, 'Boundary');

            scope.puLayer = L.featureGroup();
            map.addLayer(scope.puLayer);
            map.controls.addOverlay(scope.puLayer, 'Planning Units');

            scope.markersLayer = L.featureGroup();
            map.addLayer(scope.markersLayer);
            map.controls.addOverlay(scope.markersLayer, 'Points');

            scope.planningUnit = {
                data: {
                    projects: [],
                    id: null
                }
            };


            scope.ecosystemLabelToSlug =function(label) {
                return survey.ecosystemLabelToSlug(label);
            };

            scope.ecosystemSlugToLabel = function(slug) {
                return survey.ecosystemSlugToLabel(slug);
            };

            scope.ecosystemSlugToColor = function (slug) {
                return survey.ecosystemSlugToColor(slug);
            };

            scope.$watch('points', setMarkers);

            updateMapSize();

            $(window).resize(function(event) {
                scope.$apply(function () {
                    updateMapSize();
                });
            });

        }

        function updateMapSize () {
            /**
             * Quickfix for now: for an unknown reason this directive's map was only
             * showing one tile without manually forcing the map to resize or
             * calling invalidateSize as we do here. Must be called after the
             * map has fully loaded. Three full seconds seems to be necessary
             * on my laptop.
             */
            scope.windowHeight = window.innerHeight - 300 + 'px';
            $timeout(function () {
                map.invalidateSize(false);
            }, 3000);
        }

        function markerSurveySlug(markerData) {
            if (markerData.qSlug.indexOf("ncc") > -1) {
                markerData['path'] = "ncc-monitoring";
            } else {
                markerData['path'] = "monitoring-project";
            }
        }


        function setMarkers(data){
            // Updates a LayerGroup with markers for each data item.
            scope.markersLayer.clearLayers();
            _.each(data, function(markerData){
                markerData['draggable'] = false;
                markerData['color'] = scope.slugToColor({slug: markerData.qSlug});
                markerSurveySlug(markerData);
                var marker = MapUtils.createMarker(markerData);
                setPopup(marker, markerData);
                scope.markersLayer.addLayer(marker);
            });
        };

        function setSurveyPath(layer) {
            //swtiches previously hardcoded popup url path based on NAME propery
            if (layer.feature.properties.NAME) {
                scope.surveyPath = 'ncc-monitoring';
            } else {
                scope.surveyPath = 'monitoring-project';
            };
            return scope.surveyPath;
        };


        function updatePuLayer(units){
            if (units) {
                puPromise.success(function(data) {
                    // clone data and filter features
                    var filtered = _.extend({}, data, {
                        "features": _.filter(data.features, function(f){
                            return parseInt(f.properties.ID, 10) in units
                        })
                    })
                    var maxCount = _.max(units);

                    _.each(filtered.features, function(f) {
                        f.properties.count = units[parseInt(f.properties.ID, 10)];
                    });

                    scope.puLayer.clearLayers();

                    scope.puLayer.addLayer(L.geoJson(filtered, {
                        style: function(f) {
                            return {
                                "color": "#E6D845",
                                "fillColor": "#E6D845",
                                "weight": 1,
                                "clickable": true,
                                "fillOpacity": 0.6 * f.properties.count/maxCount,
                                "opacity": 1 * f.properties.count/maxCount,

                            }
                        },
                        onEachFeature: function(feature, layer) {
                            setPuPopup(layer);
                        }
                    }));

                    scope.puLayer.bringToBack();
                });
            }
        };

        function setPuPopup (layer){
            // Sets a pop for this planning unit.

            // planningUnit is an object returned from the planning-unit API resource

            // Build popup based on the ajax data
            var loading = '<p ng-show="!planningUnit.data.id" class="load-indicator">Loading...</p>';
            var popup = '';
            var list = '';

            if (scope.activeProject) {
                list += '<h4>Ecosystem Features</h4>';
                list += '<div ng-repeat="project in planningUnit.data.projects" ng-if="activeProject == project.project_uuid">';
                list += '<ul class="list-unstyled" id="map-legend">';
                list += '<li ng-repeat="slug in project.ecosystem_features">';
                list += '<span class="point" ng-style="{\'color\': ecosystemSlugToColor(slug)};">●</span> {{ecosystemSlugToLabel(slug)}}';
                list += '</li>';
                list += '</ul>';
                list += '</div>'; // End ng-repeat: planningUnit.data.projects
                list += '</dl>';
            } else {
                list += '<h4>Projects</h4>';
                list += '<dl>';
                list += '<div ng-repeat="project in filterProjects()"';
                list += '<h5 ng-hide="activeProject"><a href="#/RespondentDetail/{{surveyPath}}/{{project.project_uuid}}">{{project.project_name}}</a></h5>';
                list += '<div id="map-legend">';
                list += '<span tooltip="{{ecosystemSlugToLabel(slug)}}" ng-repeat="slug in project.ecosystem_features" class="point" ng-style="{\'color\': ecosystemSlugToColor(slug)};">●</span>';
                list += '</div>';

                list += '</div>'; // End ng-repeat: planningUnit.data.projects
                list += '</dl>';
            }

            var html = '<div class="popup-content planning-unit">' + loading + '<div ng-cloak>' + list + '</div></div>';


            layer.bindPopup(html, { closeButton: true });
            scope.filterProjects = function() {
                if (scope.activeEcosystemFeatures && scope.activeEcosystemFeatures.length!==0) {
                    var startsWith = function(a,b){return a.lastIndexOf(b,0) === 0}
                    return _.filter(scope.planningUnit.data.projects, function(p){return (_.some(p.ecosystem_features, function(ef){return _.some(scope.activeEcosystemFeatures, function(af){return startsWith(ef,af)})}))})
                } else {
                    return scope.planningUnit.data.projects
                }
            }

            // Define the on click callback.
            layer.on('click', function(e) {
                scope.$apply(function () {
                    setSurveyPath(e.target);
                    var unit_id = e.target.feature.properties.ID;
                    scope.count = e.target.feature.properties.count;
                    getPlanningUnit(unit_id, function(res){
                        scope.planningUnit.data = res;
                    });

                    if (map._popup) {
                        $compile(angular.element(map._popup._contentNode))(scope);
                    }
                });
            });
        }


        function setPopup(marker, markerData) {
            /*
            This is the popup for a marker.
            */
            var loading = '<p ng-show="responses == false" class="load-indicator">Loading...</p>',
                popup = '',
                list = '';

            if (!scope.activeProject) {
                list += '<h5><a href="#/RespondentDetail/{{markerSurveySlug}}/{{uuid}}">{{responses["proj-title"]}}</a></h5>';
            }
            list += '<dt>Ecosystem Feature:</dt>';
            list += '<dd><span class="point" ng-style="{\'color\': ecosystemColor}">●</span> {{ ecosystemLabel }}</dd>';
            list += '<dt>Duration:</dt>';
            list += '<dd>{{ responses["proj-data-years"].text }}</dd>';
            list += '<dt>Frequency:</dt>';
            list += '<dd>{{ responses["proj-data-frequency"].text }}</dd>';
            list += '<dt>Data Availability:</dt>';
            list += '<dd>{{ responses["proj-data-availability"].text }}</dd>';

            popup = '<div class="marker-popup-content" ng-cloak>' + loading + list + '</div>';

            marker.bindPopup(popup, { closeButton: true });

            marker.on('click', function(e) {
                scope.responses = false;
                getRespondent(markerData.uuid, function (responses) {
                    scope.responses = responses;
                    scope.uuid = markerData.uuid;
                    scope.markerSurveySlug = markerData.path;
                    scope.ecosystemLabel =  scope.slugToLabel({slug: markerData.qSlug});
                    scope.ecosystemColor = scope.ecosystemSlugToColor(scope.ecosystemLabelToSlug(scope.ecosystemLabel)+'point');
                    // The popup is added to the DOM outside of the angular framework so
                    // its content must be compiled for any interaction with this scope.
                    if (map._popup) {
                        $compile(angular.element(map._popup._contentNode))(scope);
                    }
                });
            });
        }

        function getRespondent (uuid, success_callback) {
            var url = app.server
                  + '/api/v1/reportrespondantdetails/'
                  + uuid
                  + '/?format=json';

            $http.get(url).success(function (data) {
                var respondent = data,
                    responses = {};
                if (typeof(respondent.responses.question) !== 'string') {
                    _.each(respondent.responses, function(response, index) {
                        try {
                            answer_raw = JSON.parse(response.answer_raw);
                        } catch(e) {
                            console.log('failed to parse answer_raw');
                            answer_raw = response.answer;
                        }
                        responses[response.question.slug] = answer_raw;
                    });
                }
                success_callback(responses);
            }).error(function (err) {
                debugger
            });
        }


        function getPlanningUnit (unit_id, success_callback) {
            var url = app.server
                  + '/api/v1/planning-unit/'
                  + unit_id
                  + '/?format=json';

            $http.get(url).success(function (data) {
                success_callback(data);
            }).error(function (err) {
                debugger
            });
        }



        init();
    };


    var MapUtils = {

        initMap: function (mapElement, lat, lng, zoom) {
            var nauticalLayer, bingLayer, map, baseMaps, options;

            nauticalLayer = L.esri.imageMapLayer({
                url: "http://seamlessrnc.nauticalcharts.noaa.gov/arcgis/rest/services/RNC/NOAA_RNC/ImageServer",
                format: 'img/png',
                transparent: true,
                layers: null,
                attribution: "Tiles Courtesy of <a href=\"http://www.nauticalcharts.noaa.gov/csdl/seamlessraster.html\">NOAA &reg;</a> &mdash; <a href=\"http://www.nauticalcharts.noaa.gov/mcd/Raster/download_agreement.htm\">User Agreement</a>"
            }).bringToBack();

            bingLayer = new L.BingLayer("Av8HukehDaAvlflJLwOefJIyuZsNEtjCOnUB_NtSTCwKYfxzEMrxlKfL1IN7kAJF", {
                type: "AerialWithLabels"
            });

            map = new L.Map(mapElement, { inertia: false })
                .addLayer(bingLayer)
                .setView(
                    new L.LatLng(lat || 18.35, lng || -64.85),
                    zoom || 11);

            map.attributionControl.setPrefix('');
            map.zoomControl.setPosition('bottomright');

            // Setup layer picker
            baseMaps = { "Satellite": bingLayer, "Nautical Charts": nauticalLayer };
            options = { position: 'topright' };
            var controls = L.control.layers(baseMaps, null, options).addTo(map);
            map.controls = controls;

            return map;
        },

        addBoundary: function (geojsonPath, success_callback) {
            if (geojsonPath) {
                // Add study area boundary
                $http.get(geojsonPath).success(function(data) {
                    var boundaryStyle = {
                        "color": '#FF8C00',
                        "weight": 2,
                        "opacity": 0.6,
                        "fillOpacity": 0.0,
                        "clickable": false
                    },
                    layer = L.geoJson(data, { style: boundaryStyle });
                    success_callback(layer);
                });
            }
        },

        createMarker: function (config) {
            var marker = null;
            if (config.lat && config.lat) {

                marker = new L.circleMarker([config.lat, config.lng], {
                    radius: 6,
                    /* border */
                    color: "#FFFFFF",
                    opacity: 1,
                    weight: 1,
                    /* fill */
                    fillColor: config.color,
                    fillOpacity: 1.0,
                    qSlug: config.qSlug
                });

                marker.on('mouseover', function (e) {
                    marker.setStyle({
                        weight: 3
                    });
                });

                marker.on('mouseout', function (e) {
                    marker.setStyle({
                        weight: 1
                    });
                });
            }
            return marker;
        }
    };



    return directive;
});
