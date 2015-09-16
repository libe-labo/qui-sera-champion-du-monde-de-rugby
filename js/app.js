/* jshint globalstrict: true, eqnull: true */
/* globals angular, _, d3, S, $, window */

'use strict';

angular.module('app', ['dragularModule']).config(['$locationProvider', function($locationProvider) {
    $locationProvider.html5Mode({
        enable : true,
        requireBase : false
    });
}]);

angular.module('app').controller('RugbyController', ['$scope', '$http', function($scope, $http) {
    $scope.groups = { 'A' : [] , 'B' : [] , 'C' : [] , 'D' : [] };
    $scope.palmares = [
        [
            [{ group : 'B' , order : 1 } , { group : 'A' , order : 2}],
            [{ group : 'C' , order : 1 } , { group : 'D' , order : 2}],
            [{ group : 'D' , order : 1 } , { group : 'C' , order : 2}],
            [{ group : 'A' , order : 1 } , { group : 'B' , order : 2}]
        ],
        [
            [{} , {}],
            [{} , {}]
        ],
        [
            [{}, {}]
        ],
        [
            [{}]
        ]
    ];

    // Mapping one round to the next one
    $scope.mapping = [
        [
            [[0, 0], [0, 0]], [[0, 1], [0, 1]], [[1, 0], [1, 0]], [[1, 1], [1, 1]]
        ],
        [
            [[0, 0], [0, 0]], [[0, 1], [0, 1]]
        ],
        [
            [[0, 0], [0, 0]]
        ]
    ];

    $http.get('assets/groups.tsv').then(function(response) {
        $scope.groups = _.groupBy(d3.tsv.parse(response.data, function(d) {
            return {
                id : d.Id,

                country : d.Pays,
                group : d.Groupe,

                color : d.Couleur,
                textColor : d['Couleur texte'] === 'blanc' ? '#f4f4f4' : '#000',
                slug : S(d.Pays).slugify().s,
                nb : 'nb/',

                order : -1
            };
        }), 'group');
    });

    var getTeamFor = function(roundIdx, matchIdx, teamIdx) {
        var group = $scope.palmares[roundIdx][matchIdx][teamIdx].group,
            order = $scope.palmares[roundIdx][matchIdx][teamIdx].order;
        return _.find($scope.groups[group], { order : order });
    };

    var emptyPalmaresFrom = function(roundIdx, matchIdx, teamIdx) {
        var mapping = [matchIdx, teamIdx];
        for (var i = 1; $scope.palmares[roundIdx + i]; ++i) {
            mapping = $scope.mapping[roundIdx + (i - 1)][mapping[0]][mapping[1]];
            $scope.palmares[roundIdx + i][mapping[0]][mapping[1]].group = '';
            $scope.palmares[roundIdx + i][mapping[0]][mapping[1]].order = -1;
        }
    };

    /*
    ** Scope functions
    */
    $scope.selectWinner = function(roundIdx, matchIdx, teamIdx) {
        var team = getTeamFor(roundIdx, matchIdx, teamIdx);

        if (team != null && $scope.palmares[roundIdx + 1] != null) {
            emptyPalmaresFrom(roundIdx, matchIdx, teamIdx);
            var mapping = $scope.mapping[roundIdx][matchIdx][teamIdx];
            $scope.palmares[roundIdx + 1][mapping[0]][mapping[1]].group = team.group;
            $scope.palmares[roundIdx + 1][mapping[0]][mapping[1]].order = team.order;
        }
    };

    $scope.getCountryName = function(roundIdx, matchIdx, teamIdx) {
        var team = getTeamFor(roundIdx, matchIdx, teamIdx);
        return team == null ? '' : team.country;
    };

    $scope.refresh = function() {
        window.location.reload();
    };

    /*
    ** Scope class functions
    */
    $scope.getRoundClass = (function() {
        var rounds = ['quarterfinals', 'semifinals', 'final', 'winner'];
        return function(idx) {
            return rounds[idx];
        };
    })();

    $scope.getMatchClass = (function() {
        var classes = ['col-xs-3', 'col-xs-6', 'col-xs-12', 'col-xs-12 col-xs-offset-3'];
        return function(idx) {
            return classes[idx];
        };
    })();

    /*
    ** Scope style function
    */
    $scope.getPronosticStyle = function(group, order) {
        var team = _.find($scope.groups[group], { order : order });

        return {
            'background-color' : team == null ? '#c6c6c6' : team.color,
            'color' : team == null ? '' : team.textColor
        };
    };

    $scope.getTeamStyle = function(roundIdx, matchIdx, teamIdx) {
        var team = getTeamFor(roundIdx, matchIdx, teamIdx);

        return {
            'background-color' : team == null ? '#c6c6c6' : team.color,
            'color' : team == null ? '' : team.textColor
        };
    };

    $scope.getArrowStyle = function(roundIdx, matchIdx, teamIdx) {
        if (roundIdx > 2) { return { display : 'none' }; }
        if ($scope.palmares[roundIdx + 1] == null) { return { color : '#c6c6c6' }; }

        var team = getTeamFor(roundIdx, matchIdx, teamIdx),
            mapping = $scope.mapping[roundIdx][matchIdx][teamIdx],
            nextTeam = getTeamFor(roundIdx + 1, mapping[0], mapping[1]);

        if (team != null && nextTeam != null && team.slug === nextTeam.slug) {
            return { color : team.color };
        }
        return { color : '#c6c6c6' };
    };

    /*
    ** Dragular
    */
    $scope.dragularOptions = {
        copy : true,
        canBeAccepted : function(el, target, source) {
            if ($(target).hasClass('group__pronostic')) {
                if ($(source).attr('x-group') === $(target).attr('x-group')) {
                    return true;
                }
            }
            return false;
        },
        scope : $scope
    };

    $scope.dragularDropOptions = {
        canBeAccepted : function() { return false; }
    };

    $scope.$on('dragulardrop', function(event, el, container, source) {
        var group = $(container).attr('x-group');
        // Make sure we didn't use the same country twice
        $(container).siblings().each(function() {
            $(this).children().each(function() {
                if ($(this).find('span').text() === $(el).find('span').text()) {
                    $(this).remove();
                }
            });
        });

        // Make sure we only have one item in this container
        $(container).children().each(function(idx) {
            if (idx < $(container).children().length - 1) {
                $(this).remove();
            }
        });

        // Update our data
        $scope.$apply(function() {
            _.each($scope.groups[group], function(d) { d.order = -1; });
            $(container).parent().children().each(function(idx) {
                var country = $(this).find('span').text(),
                    team = _.find($scope.groups[group], { country : country });
                if (team != null) {
                    if (team.order !== idx + 1) {
                        for (var i = 0; i < $scope.palmares[0].length; ++i) {
                            for (var j = 0; j < $scope.palmares[0][i].length; ++j) {
                                if ($scope.palmares[0][i][j].group === group &&
                                    $scope.palmares[0][i][j].order === idx + 1) {
                                    emptyPalmaresFrom(0, i, j);
                                }
                            }
                        }
                        team.order = idx + 1;
                    }
                }
            });
        });
    });

    /*
    ** Select
    */
    $scope.selectModels = {};
    _.each($scope.groups, function(group, groupname) {
        $scope.selectModels[groupname] = ['', ''];
    });

    $scope.onSelectChange = function(group, order) {
        var other = order > 0 ? 0 : 1;
        var team = _.find($scope.groups[group], { slug : $scope.selectModels[group][order] }),
            oldTeam = _.find($scope.groups[group], { order : order + 1 });

        if (oldTeam != null) {
            oldTeam.order = -1;
        }

        for (var i = 0; i < $scope.palmares[0].length; ++i) {
            for (var j = 0; j < $scope.palmares[0][i].length; ++j) {
                if ($scope.palmares[0][i][j].group === group &&
                    $scope.palmares[0][i][j].order === order + 1) {
                    emptyPalmaresFrom(0, i, j);
                }
            }
        }

        team.order = order + 1;
        if ($scope.selectModels[group][other] == $scope.selectModels[group][order]) {
            $scope.selectModels[group][other] = '';
        }
    };
}]);
