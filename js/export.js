/* jshint globalstrict: true, eqnull: true */
/* globals $, document, Image, window, unescape, _, d3 */

'use strict';

$(function() {
    window.exportImage = function(data) {
        d3.select('#container').selectAll('svg').remove();
        createViz(data);
        downloadSvgAsPng(d3.select('svg')[0][0], 'svg.css');
    };

    var downloadSvgAsPng = function(svgTag, cssFilename) {
        cssFilename = cssFilename || ['csv.css'];
        if (typeof(cssFilename) !== typeof([])) {
            cssFilename = [cssFilename];
        }

        // we get all the svg markup
        var dom = document.createElement('div').appendChild(svgTag.cloneNode(true)),
            defs = document.createElement('defs'),
            style = document.createElement('style'),
            image = new Image();

        // we get our css
        var rawStyle = '';
        for (var i = 0; i < document.styleSheets.length; ++i) {
            if (document.styleSheets[i].href == null) { continue; }
            if (cssFilename.indexOf(_.last(document.styleSheets[i].href.split('/'))) >= 0) {
                for (var j = 0; j < document.styleSheets[i].cssRules.length; ++j) {
                    rawStyle += document.styleSheets[i].cssRules[j].cssText + '\n';
                }
            }
        }

        // and we insert it in our svg dom
        style.setAttribute('type', 'text/css');
        style.innerHTML = '<![CDATA[\n' + rawStyle + ']]>';
        defs.appendChild(style);
        dom.insertBefore(defs, dom.firstChild);

        // we add some necessary svg bullshit
        dom.innerHTML = '<?xml version="1.0" standalone="no"?>\n' + dom.innerHTML;
        dom.setAttribute('version', '1.1');
        dom.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        dom.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

        // we create the Image object and encode our svg content as a base64 src
        image.src = 'data:image/svg+xml;base64,' +
                    window.btoa(unescape(encodeURIComponent(dom.outerHTML)));

        // load this image in a canvas and save it
        image.onload = function() {
            var canvas = document.createElement('canvas'),
                context = canvas.getContext('2d'),
                a = document.createElement('a');

            canvas.width = image.width;
            canvas.height = image.height;
            context.drawImage(image, 0, 0);
            a.download = 'image.png';
            a.href = canvas.toDataURL('image/png');
            a.setAttribute('class', 'download');
            document.body.appendChild(a);
            a.click();
            a.remove();
        };
    };


    var createViz = function(theData) {
        var size = 800,
            svg = d3.select('#container').append('svg').attr('width', size).attr('height', size),
            width = 50,
            rotations = [
                [-20, 20, 0, 70, 110, 0, 160, 200, 0, 250, 290, 0],
                [0, 90, 0, 180, 270, 0],
                [45, 225]
            ];

        var createLabels = function(data, outerRadius, globalIdx) {
            _.each(data, function(d) {
                d.startAngle -= (Math.PI / 2); // DON'T KNOW, DON'T ASK
                d.endAngle -= (Math.PI / 2);   // DON'T KNOW, DON'T ASK

                d.midAngle = d.startAngle + ((d.endAngle - d.startAngle) / 2);
            });
            var cl = 'text' + String(globalIdx + 1);
            arcs.selectAll('.' + cl).data(data).enter()
                .append('text').attr('class', cl)
                               .attr('x', function(d) {
                                   return Math.cos(d.midAngle) * (outerRadius - width * 0.7);
                               }).attr('y', function(d) {
                                   return Math.sin(d.midAngle) * (outerRadius - width * 0.7);
                               })
                               .attr('text-anchor', 'middle')
                               .attr('fill', function(d) { return d.data.textColor; })
                               .attr('transform', function(d, idx) {
                                   return 'rotate(' +
                                        String(rotations[globalIdx][idx]) + ' ' +
                                        String(d3.select(this).attr('x')) + ' ' +
                                        String(d3.select(this).attr('y')) + ' ' +
                                   ')';
                               }).text(function(d) { return d.data.label; });
        };

        var createArcs = function(globalIdx) {
            outerRadius -= width;
            var cl = 'arc' + String(globalIdx);
            arcs.selectAll('.' + cl).data(pie(data)).enter()
                .append('path').attr('class', cl)
                               .attr('d', d3.svg.arc().innerRadius(outerRadius - width)
                                                      .outerRadius(outerRadius))
                               .attr('fill', function(d) {
                                   return d.data.color;
                               });
        };

        var arcs = svg.append('g')
                      .attr('class', 'arcs')
                      .attr('transform', 'translate(' + String(size / 2) + ', ' +
                                                        String(size / 2) + ')');

        var k = 0, data = [];
        for (var j = 0; j < 11; ++j) {
            if ([2, 5, 8].indexOf(j) >= 0) {
                data.push({ value : 2 , order : j++ , color : 'transparent' });
            }
            data.push({ value : 11 , order : j , textColor : theData[0][k].textColor ,
                        color : theData[0][k].color , label : theData[0][k].country });
            ++k;
        }
        data.push({ value : 2 , order : j , color : 'transparent' });
        var pie = d3.layout.pie();
        pie.value(function(d) { return d.value; });
        pie.sort(function(a, b) { return d3.ascending(a.order, b.order); });

        pie.startAngle(-pie(data)[0].endAngle);
        pie.endAngle(pie.startAngle() + (Math.PI * 2));

        var outerRadius = (size / 2);
        createArcs(1);

        createLabels(pie(data), outerRadius, 0);

        k = 0; data = [];
        for (j = 0; j < 5; ++j) {
            if (j === 2) {
                data.push({ value : 2 , order : j++ , color : 'transparent' });
            }
            data.push({ value : 24 , order : j , textColor : theData[1][k].textColor ,
                        color : theData[1][k].color , label : theData[1][k].country });
            ++k;
        }
        data.push({ value : 2 , order : j , color : 'transparent' });
        createArcs(2);
        createLabels(pie(data), outerRadius, 1);

        var data2 = [{ value : 12.5 , order : 0 } , { value : 87.5 , order : 1 }];
        pie.startAngle(0);
        pie.endAngle(pie.startAngle() + (Math.PI * 2));
        pie.startAngle(pie.startAngle() - pie(data2)[0].endAngle);
        pie.endAngle(pie.startAngle() + (Math.PI * 2));
        data = [];
        for (j = 0; j < theData[2].length; ++j) {
            data.push({ value : 50 , order : j , textColor : theData[2][j].textColor ,
                        color : theData[2][j].color , label : theData[2][j].country });
        }
        createArcs(3);
        createLabels(pie(data), outerRadius, 2);

        outerRadius -= width;
        arcs.selectAll('.arc4')
            .data(pie([{ value : 100 , order : 0 , color : theData[3][0].color }]))
            .enter()
            .append('path').attr('class', 'arc4').attr('d', d3.svg.arc().innerRadius(0)
                                                                        .outerRadius(outerRadius))
                           .attr('fill', function(d) {
                               return d.data.color;
                           });

        // That's some big, big path
        svg.append('path')
           .attr('class', 'trophy')
           .attr('d', 'M159.3,83.2c-2.5-12-13.9-14.3-15.9-14.6c-2-0.4-0.4-2.7-0.4-4.5' +
                      'c0-1.8,1.8-2.5,2.1-4.3 c0.4-1.8-1.1-3.2-1.1-5.4c0-2.1-2-2.5-5.' +
                      '2-2.9s-3.9,3.4-4.3,6.4c-0.4,3,1.8,3.4,1.8,6.6c0,4.5-3.3,7-5.2,' +
                      '9.6 c-1.2,1.7-1.6,5.9-1.6,5.9s-2.1-0.5-4.8-2.1c-2.7-1.6-0.6-2.' +
                      '2-0.1-4.4s-1.6-4.3-3.8-5.1c-2.1-0.8-0.5-2.7,1.6-6.4s-0.8-5.6-2' +
                      '.7-7.2 s-9.6,0-12.9-2.1c-3.2-2.1-1.6-5.6-5.6-12.1c-4-6.4-14.2-' +
                      '6.7-16.3-7.5s-2.4-1.6-1.3-3.8s1.3-5.4,1.3-9.9s-3.7-7.8-3.7-7.8' +
                      ' s0.2-2.7,1-6.2C83.3,2.1,83.3,0,80,0s-3.2,2.1-2.4,5.6c0.8,3.5,' +
                      '1,6.2,1,6.2S75,15,75,19.6s0.3,7.8,1.3,9.9c1.1,2.1,0.8,2.9-1.3,' +
                      '3.8 s-12.3,1.1-16.3,7.5s-2.4,9.9-5.6,12.1c-3.2,2.1-11,0.5-12.9' +
                      ',2.1s-4.8,3.5-2.7,7.2c2.1,3.8,3.8,5.6,1.6,6.4 c-2.1,0.8-4.3,2.' +
                      '9-3.8,5.1c0.5,2.1,2.6,2.8-0.1,4.4c-2.7,1.6-4.8,2.1-4.8,2.1S30,' +
                      '76,28.8,74.3c-1.9-2.7-5.2-5.2-5.2-9.6 c0-3.2,2.1-3.6,1.8-6.6c-' +
                      '0.4-3-1.1-6.8-4.3-6.4s-5.2,0.7-5.2,2.9c0,2.1-1.4,3.6-1.1,5.4c0' +
                      '.4,1.8,2.1,2.5,2.1,4.3 c0,1.8,1.6,4.1-0.4,4.5c-2,0.4-13.4,2.7-' +
                      '15.9,14.6c-2.5,11.8,1.4,19.5,10,26.3s11.4,8.9,11.6,11.1c0.2,2.' +
                      '1,0.7,3.8,3.9,3.4 c3.2-0.4,5.5-1.6,8.6,1.1c3,2.7,3.6,5.5,3.9,7' +
                      '.3c0.4,1.8,2,3.4,3.4,3.2c1.4-0.2,3.6,9.8,9.1,15.5c5.5,5.7,11.1' +
                      ',9.6,13.4,11.3 c2.3,1.6,1.8,4.6,1.8,5.9c0,1.3,0.4,7.1-1.6,8.6c' +
                      '-2,1.4-13.4,3.4-15.7,7.1c-2.3,3.8,1.4,7.5-2.3,11.4c-3.8,3.9-3,' +
                      '14.6-3,23.4 s0.9,14.6-0.4,15.9c-1.3,1.3-4.8,1.8-4.8,2.7c0,4.1,' +
                      '0,7,0,8.7s1.8,8.4,41.4,8.4s41.4-6.6,41.4-8.4s0-4.6,0-8.7 c0-0.' +
                      '9-3.6-1.4-4.8-2.7c-1.3-1.3-0.4-7.1-0.4-15.9s0.7-19.5-3-23.4c-3' +
                      '.8-3.9,0-7.7-2.3-11.4c-2.3-3.8-13.8-5.7-15.7-7.1 c-2-1.4-1.6-7' +
                      '.3-1.6-8.6c0-1.3-0.5-4.3,1.8-5.9c2.3-1.6,7.9-5.5,13.4-11.3c5.5' +
                      '-5.7,7.7-15.7,9.1-15.5c1.4,0.2,3-1.4,3.4-3.2 c0.4-1.8,0.9-4.6,' +
                      '3.9-7.3c3-2.7,5.4-1.4,8.6-1.1c3.2,0.4,3.8-1.3,3.9-3.4c0.2-2.1,' +
                      '3-4.3,11.6-11.1C157.9,102.7,161.8,95,159.3,83.2z  M41.8,119.8c' +
                      '-0.5,2.3-1.1,5.5-1.6,6.1c-0.5,0.5-3-5.9-7.5-7c-4.5-1.1-6.3,0-7' +
                      '.3-0.9c-1.1-0.9-6.3-5.9-10.9-11.6 c-4.6-5.7-12.7-15.2-6.3-23c6' +
                      '.4-7.9,12.7-4.3,13.8-2.5c1.1,1.8-0.5,2.5-1.4,4.6c-0.9,2.1,0.5,' +
                      '4.6,4.5,4.3c3.9-0.4,5.7-3.6,5.9-5.7 c0.2-2.1,1.8-2.7,1.8-2.7c1' +
                      '.8-0.7,2.3-1.1,3.6,1.3c1.3,2.3,2.5,1.8,2.3,5c-0.2,3.2-1.9,7.9,' +
                      '0,16.1C40.6,112,42.4,117.5,41.8,119.8z  M145.6,106.4c-4.6,5.7-' +
                      '9.8,10.7-10.9,11.6c-1.1,0.9-2.9-0.2-7.3,0.9c-4.5,1.1-7,7.5-7.5' +
                      ',7c-0.5-0.5-1.1-3.8-1.6-6.1 c-0.5-2.3,1.3-7.9,3.2-16.1c1.9-8.2' +
                      ',0.2-12.9,0-16.1c-0.2-3.2,1.1-2.7,2.3-5c1.3-2.3,1.8-2,3.6-1.3c' +
                      '0,0,1.6,0.5,1.8,2.7 c0.2,2.1,2,5.4,5.9,5.7c3.9,0.4,5.4-2.1,4.5' +
                      '-4.3c-0.9-2.1-2.5-2.9-1.4-4.6c1.1-1.8,7.3-5.4,13.8,2.5 C158.3,' +
                      '91.3,150.2,100.7,145.6,106.4z')
           .attr('x', 0).attr('y', 0)
           .attr('transform', 'translate(' + String((size / 2) - (163.7 / 2)) +
                                      ', ' + String((size / 2) - (254.7 / 1.5)) +
                              ')');

        svg.append('text').text(theData[3][0].country)
                          .attr('class', 'large')
                          .attr('text-anchor', 'middle')
                          .attr('x', size / 2)
                          .attr('y', (size / 2) + (outerRadius * 0.75))
                          .style('fill', theData[3][0].textColor);
    };
});
