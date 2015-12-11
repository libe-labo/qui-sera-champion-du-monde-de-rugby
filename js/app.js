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

    $scope.groups = { 'A' : [] , 'B' : [] , 'C' : [] , 'D' : [] , 'E' : [] , 'F' : [] };
    $scope.thirds = [];
    $scope.palmares = [
        [
            [{ group : 'A' , order : 2 } , { group : 'C' , order : 2}],
            [{ group : 'D' , order : 1 } , { group : '?' , order : 3}],
            [{ group : 'B' , order : 1 } , { group : '?' , order : 3}],
            [{ group : 'F' , order : 1 } , { group : 'E' , order : 2}],
            [{ group : 'C' , order : 1 } , { group : '?' , order : 3}],
            [{ group : 'E' , order : 1 } , { group : 'D' , order : 2}],
            [{ group : 'A' , order : 1 } , { group : '?' , order : 3}],
            [{ group : 'B' , order : 2 } , { group : 'F' , order : 2}]
        ],
        [
            [{} , {}],
            [{} , {}],
            [{} , {}],
            [{} , {}]
        ],
        [
            [{}, {}],
            [{}, {}]
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
            [[0, 0], [0, 0]], [[0, 1], [0, 1]], [[1, 0], [1, 0]], [[1, 1], [1, 1]],
            [[2, 0], [2, 0]], [[2, 1], [2, 1]], [[3, 0], [3, 0]], [[3, 1], [3, 1]]
        ],
        [
            [[0, 0], [0, 0]], [[0, 1], [0, 1]],
            [[1, 0], [1, 0]], [[1, 1], [1, 1]]
        ],
        [
            [[0, 0], [0, 0]],
            [[0, 1], [0, 1]]
        ],
        [
            [[0, 0], [0, 0]]
        ]
    ];

    $http.get('assets/groups.tsv').then(function(response) {
        $scope.allTeams = d3.tsv.parse(response.data, function(d) {
            return {
                id : +d.Id,

                country : d.Pays,
                group : d.Groupe,
                initials : d.Initiales,
                fullcountry : d['Pays complet'],

                color : d.Couleur,
                textColor : d['Couleur texte'],
                slug : S(d.Pays).slugify().s,

                order : -1
            };
        });
        $scope.groups = _.groupBy($scope.allTeams, 'group');

        $scope.locked = false;

        /*
        ** Init from URL
        */
        window.setTimeout(function() {
            $scope.$apply(function() {
                var before8 = function(id, idx) {
                    var map = [2, 2, 1, 3, 1, 3, 1, 2, 1, 3, 1, 2, 1, 3, 2, 2];
                    var team = _.find($scope.allTeams, { id : id });
                    team.order = map[idx];

                    var clone = $('.group__flag[x-team="' + team.id +'"]').clone();

                    if (team.order === 3) {
                        clone.appendTo(
                            $('.drop2').find('.group__pronostic').get($scope.thirds.length)
                        );
                        $scope.thirds.push(team.group);
                        if ($scope.thirds.join('').length === 4) {
                            if (!$scope.updateWithThirds()) {
                                window.location.search = '';
                            }
                        }
                        $scope.selectModels[$scope.thirds.length - 1] = team.slug;

                    } else {
                        clone.appendTo(
                            $('.group__pronostics>' + 'li[x-group="' + team.group + '"]')
                                .get(team.order - 1)
                        );

                        $scope.selectModels[team.group][team.order - 1] = team.slug;
                    }

                };

                _.each(window.location.search.replace(/^\?/, '').split('&'), function(search) {
                    search = search.split('=');
                    if (search[0] === 'p') {
                        var ids = search[1].split(';');
                        if (ids.length === 31) {
                            _.each(ids, function(id, idx) {
                                var team = _.find($scope.allTeams, { id : parseInt(id) });
                                if (idx < 16) {
                                    before8(parseInt(id), idx);
                                } else if (idx < 24) {
                                    var map = [0, 0, 1, 1, 2, 2, 3, 3];
                                    $scope.palmares[1][map[idx - 16]][idx % 2].group = team.group;
                                    $scope.palmares[1][map[idx - 16]][idx % 2].order = team.order;
                                } else if (idx < 28) {
                                    $scope.palmares[2][idx < 26 ? 0 : 1][idx %2].group = team.group;
                                    $scope.palmares[2][idx < 26 ? 0 : 1][idx %2].order = team.order;
                                } else if (idx < 30) {
                                    $scope.palmares[3][0][idx % 2].group = team.group;
                                    $scope.palmares[3][0][idx % 2].order = team.order;
                                } else {
                                    $scope.palmares[4][0][0].group = team.group;
                                    $scope.palmares[4][0][0].order = team.order;
                                }
                            });
                        }
                    }
                });
            });
        }, 500);
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

    var getPalmaresString = function() {
        var palmaresString = [];
        _.each($scope.palmares, function(round, roundIdx) {
            _.each(round, function(match, matchIdx) {
                _.each(match, function(team, teamIdx) {
                    var _team = getTeamFor(roundIdx, matchIdx, teamIdx);
                    if (_team != null) {
                        palmaresString.push(_team.id);
                    } else {
                        return '';
                    }
                });
            });
        });
        return palmaresString.join(';');
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

    $scope.getCountryName = function(roundIdx, matchIdx, teamIdx, small) {
        var team = getTeamFor(roundIdx, matchIdx, teamIdx);
        return team == null
            ? ''
            : (small && roundIdx < 2 ? team.initials
                                     : roundIdx < 2 ? team.initials
                                                    : roundIdx < 3 ? team.country
                                                                   : team.fullcountry);
    };

    $scope.export = function() {
        var data = [];
        _.each($scope.palmares, function(round, roundIdx) {
            data[roundIdx] = [];
            _.each(round, function(match, matchIdx) {
                _.each(match, function(team, teamIdx) {
                    data[roundIdx].push(getTeamFor(roundIdx, matchIdx, teamIdx));
                });
            });
        });
        window.exportImage(data);
    };

    $scope.tweet = function() {
        var url = encodeURIComponent(window.location.origin + window.location.pathname +
                                     '?p=' + getPalmaresString());
        var text = encodeURIComponent('Qui va remporter l’Euro 2016 ?' +
                                      'Faites vos pronostics avec l’application Libé !');

        if (getTeamFor(3, 0, 0) != null) {
            text = encodeURIComponent('Mon pronostic pour l\'Euro 2016 : ' +
                                      getTeamFor(3, 0, 0).country + ' vainqueur ! Et vous ?');
        }

        window.open('https://twitter.com/intent/tweet?original_referer=' + '' +
                    '&text=' + text + ' ' + url + ' via @libe',
                    '', 'width=575,height=400,menubar=no,toolbar=no');
    };

    $scope.shareOnFacebook = function() {
        var url = encodeURIComponent(window.location.origin + window.location.pathname +
                                     '?p=' + getPalmaresString());

        window.open('http://www.facebook.com/sharer/sharer.php?u=' + url, '',
                    'width=575,height=400,menubar=no,toolbar=no');
    };

    $scope.refresh = function() {
        window.location.search = '';
        window.setTimeout(function() {
            window.location.reload();
        }, 100);
    };

    /*
    ** Scope class functions
    */
    $scope.getRoundClass = (function() {
        var rounds = ['eighthfinals', 'quarterfinals', 'semifinals', 'final', 'winner'];
        return function(idx) {
            return rounds[idx];
        };
    })();

    $scope.getMatchClass = (function() {
        var classes = ['col-xs-3', 'col-xs-6', 'col-xs-12', 'col-xs-24',
                       'col-xs-24 col-xs-offset-6'];
        return function(idx) {
            return classes[idx];
        };
    })();

    /*
    ** Scope style function
    */
    $scope.getOpacityFor = function(team) {
        return {
            opacity: team.order === -1 ? 1 : 0.3
        };
    };

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
            'color' : team == null ? '' : team.textColor,
            'border-right' : teamIdx > 0 ? 'none' : '1px solid #fff',
            'border-left' : teamIdx > 0 ? '1px solid #fff' : 'none'
        };
    };

    $scope.getArrowStyle = function(roundIdx, matchIdx, teamIdx) {
        if (roundIdx > 3) { return { display : 'none' }; }
        if ($scope.palmares[roundIdx + 1] == null) { return { color : '#c6c6c6' }; }

        var team = getTeamFor(roundIdx, matchIdx, teamIdx),
            mapping = $scope.mapping[roundIdx][matchIdx][teamIdx],
            nextTeam = getTeamFor(roundIdx + 1, mapping[0], mapping[1]);

        if (team != null && nextTeam != null && team.slug === nextTeam.slug) {
            return { color : team.color };
        }
        return { color : '#c6c6c6' };
    };

    $scope.getDrop2Style = function(idx) {
        return {
            'col-md-offset-2': idx === 0
        };
    };

    $scope.getPronostic2Style = function(idx) {
        var team = null;
        if ($scope.thirds[idx] != null) {
            _.each($scope.groups[$scope.thirds[idx]], function(t) {
                if (t.order === 3) {
                    team = t;
                }
            });
        }

        return {
            'background-color' : team == null ? '#c6c6c6' : team.color,
            'color' : team == null ? '' : team.textColor
        };
    };

    /*
    ** Dragular
    */
    $scope.dragularOptions = {
        copy : true,
        canBeAccepted : function(el, target, source) {
            if (!$scope.locked) {
                if ($(target).hasClass('group__pronostic')) {
                    if (['0', '1', '2', '3'].indexOf($(target).attr('x-position')) >= 0) {
                        return true;
                    }
                    if ($(source).attr('x-group') === $(target).attr('x-group')) {
                        return true;
                    }
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
        var group = $(container).attr('x-group'),
            isThird = group == null;

        // Make sure we didn't use the same country twice
        var noDups = function(all) {
            if (this == container) { return; }
            $(this).children().each(function() {
                if ($(this).find('span').text() === $(el).find('span').text()) {
                    $(this).remove();
                }
                if ($(this).parent('*[x-position]').length > 0) {
                    if (isThird && $(this).attr('x-group') === $(el).attr('x-group')) {
                        $(this).remove();
                    }
                }
            });
        };

        $('.drop2').children().find('li').each(noDups);
        $('.group__pronostics').children().each(noDups);
        if (isThird) {
            group = $(el).attr('x-group');
            $('.group__pronostics').each(function() {
                if ($(this).children().first().attr('x-group') === group) {
                    container = $(this).children().first();
                }
            });
        } else {
            $(container).siblings().each(noDups);
        }

        // Make sure we only have one item in this container
        $(container).children().each(function(idx) {
            if (idx < $(container).children().length - 1) {
                $(this).remove();
            }
        });

        // Update our data
        $scope.$apply(function() {
            if (!isThird) {
                _.each($scope.groups[group], function(d) { d.order = -1; });
            }
            $(container).parent().children().each(function(idx) {
                var country = $(this).find('span').text(),
                    team = _.find($scope.groups[group], { initials : country });
                if (team != null) {
                    if (team.order !== idx + 1) {
                        team.order = idx + 1;
                    }
                }
            });
            for (var i = 0; i < $scope.palmares[0].length; ++i) {
                for (var j = 0; j < $scope.palmares[0][i].length; ++j) {
                    emptyPalmaresFrom(0, i, j);
                }
            }

            $scope.thirds = [undefined, undefined, undefined, undefined];
            _.each($scope.groups, function(teams) {
                _.each(teams, function(team) {
                    if (team.order === 3) {
                        team.order = -1;
                    }
                });
            });
            $('.drop2').find('li[x-team]').each(function() {
                var $this = $(this);
                _.each($scope.groups[$this.attr('x-group')], function(team) {
                    if (team.initials === $this.find('span').text()) {
                        team.order = 3;
                        $scope.thirds[parseInt($this.parent().attr('x-position'))] = team.group;
                    }
                });
            });

            $scope.updateWithThirds();
        });
    });

    /*
    ** Update
    */
    $scope.updateWithThirds = (function() {
        var mapThirds = {
            ABCD : ['C', 'D', 'A', 'B'],
            ABCE : ['C', 'A', 'B', 'E'],
            ABCF : ['C', 'A', 'B', 'F'],
            ABDE : ['D', 'A', 'B', 'E'],
            ABDF : ['D', 'A', 'B', 'F'],
            ABEF : ['E', 'A', 'B', 'F'],
            ACDE : ['C', 'D', 'A', 'E'],
            ACDF : ['C', 'D', 'A', 'F'],
            ACEF : ['C', 'A', 'F', 'E'],
            ADEF : ['D', 'A', 'F', 'E'],
            BCDE : ['C', 'D', 'B', 'E'],
            BCDF : ['C', 'D', 'B', 'F'],
            BCEF : ['E', 'C', 'B', 'F'],
            CDEF : ['C', 'D', 'F', 'E'],
            _    : ['?', '?', '?', '?']
        };
        return function() {
            var mapped = mapThirds._,
                all = _.clone($scope.thirds).sort().join('');

            if (all.length === 4) {
                mapped = mapThirds[all];
                if (mapped == null) {
                    return false;
                }
            }

            $scope.palmares[0][1][1].group = mapped[0];
            $scope.palmares[0][2][1].group = mapped[1];
            $scope.palmares[0][4][1].group = mapped[2];
            $scope.palmares[0][6][1].group = mapped[3];

            return true;
        };
    })();

    /*
    ** Select
    */
    $scope.selectModels = { 0: '', 1: '', 2: '', 3: '' };
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

        _.each(_.range(4), function(x) {
            if ($scope.selectModels[x] === $scope.selectModels[group][order]) {
                $scope.thirds[x] = undefined;
                $scope.selectModels[x] = '';
            }
        });

        $scope.updateWithThirds();
    };

    var getTeam = function(a, b) {
        if (b != null) {
            for (var i = 0; i < $scope.groups[a].length; ++i) {
                if ($scope.groups[a][i].order === b) {
                    return $scope.groups[a][i];
                }
            }
        } else {
            for (var i = 0; i < $scope.allTeams.length; ++i) {
                if ($scope.allTeams[i].slug === a) {
                    return $scope.allTeams[i];
                }
            }
        }
    };
    $scope.onSelect2Change = function(pos) {
        if ($scope.thirds[pos] != null) {
            getTeam($scope.thirds[pos], 3).order = -1;
        }

        var team = getTeam($scope.selectModels[pos]);
        team.order = 3;
        $scope.thirds[pos] = team.group;

        _.each(_.range(2), function(x) {
            if ($scope.selectModels[team.group][x] !== ''
             && $scope.selectModels[team.group][x] === $scope.selectModels[pos]) {
                $scope.selectModels[team.group][x] = '';
            }
        });

        _.each(_.range(4), function(x) {
            if (x !== pos && $scope.selectModels[x] !== '') {
                var otherTeam = getTeam($scope.thirds[x], 3);
                if ($scope.selectModels[x] === $scope.selectModels[pos]
                 || otherTeam.group === team.group) {
                    $scope.thirds[x] = undefined;
                    $scope.selectModels[x] = '';
                }
            }
        });

        $scope.updateWithThirds();
    };
}]);
