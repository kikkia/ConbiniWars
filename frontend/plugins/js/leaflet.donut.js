'use strict';
(function (factory, window) {
    /*globals define, module, require*/

    // define an AMD module that relies on 'leaflet'
    if (typeof define === 'function' && define.amd) {
        define(['leaflet'], factory);


    // define a Common JS module that relies on 'leaflet'
    } else if (typeof exports === 'object') {
        module.exports = factory(require('leaflet'));
    }

    // attach your plugin to the global 'L' variable
    if(typeof window !== 'undefined' && window.L){
        factory(window.L);
    }

}(function (L) {
    function roundToTwo(num) {
        return +(Math.round(num + "e+2") + "e-2");
    }

    function readable(val) {
        if (val >= 1000 && val < 1000000)
            val = roundToTwo(val / 1000) + 'K'
        else if (val >= 1000000 && val < 1000000000)
            val = roundToTwo(val / 1000000) + 'M'
        else if (val >= 1000000000)
            val = roundToTwo(val / 1000000000) + 'B'
        else if (typeof val === 'number') val = val.toFixed(0)
        return val
    }
    var doc = document,
        M = Math,
        donutData = {},
        dataIndex = 0;

    function donut(options) {
        var div = doc.createElement('div'),
            size = options.size || 100,
            size0 = size + 10,
            data = options.data || [{
                name: 'default', value: 1, total: 1
            }],
            templateContext = { data: {} },
            weight = options.weight || 20,
            colors = options.colors,
            fillColor = options.fillColor || '#f1d357',
            opacity = options.opacity || 0.7,
            el = options.el,
            format = options.format || readable,
            r = size / 2,
            PI = M.PI,
            sin = M.sin,
            cos = M.cos,
            sum = 0,
            total = 0,
            i,
            value,
            arc,
            text,
            legend,
            getLegend = options.getLegend || function (title, color, percentage, value) {
                var className = options.legendClassName || 'donut-legend'
                var legend = `${title}:&nbsp;`
                if (options.legendContent === 'percentage') {
                    legend += format(percentage, 'percentage') + '%';
                } else {
                    legend += format(value, 'value');
                }
                return `<span class="${className}" style="border: 2px solid ${color};">${legend}</span>`
            },
            setAttribute = function (el, o) {
                for (var j in o) {
                    el.setAttribute(j, o[j]);
                }
            };
        
        for (i = 0; i < data.length; i++) {
            sum += data[i].value;
            total += data[i].total;
            templateContext.data[data[i].name] = data[i];
        }

        if (sum == 0) {
            for (i = 0; i < data.length; i++) {
                data[i].value = 1;
                sum += data[i].value;
                total += data[i].value;
            }
        }
        templateContext.sum = sum;
        templateContext.total = total;
        div.className = 'donut';
        div.style.width = div.style.height = size0 + 'px';
        div.style.position = 'relative';

        text = div.appendChild(document.createElement('span'));

        text.className = options.textClassName || 'donut-text';

        //if css is included, please comment the next line for performance.
        //text.setAttribute('style', 'color: black;display: block;position: absolute;top: 50%;left: 0;z-index: 2;line-height: 0;width: 100%;text-align: center;')

        if (options.textCompiler) {
            text.innerHTML = options.textCompiler(templateContext);
        } else if (options.textContent === 'count') {
            text.innerHTML = format(data.length, 'count');
        } else if (options.textContent === 'total') {
            text.innerHTML = format(total, 'value');
        } else {
            text.innerHTML = format(sum, 'value');
        }
        legend = document.createElement('div');


        var NS = 'http://www.w3.org/2000/svg',
            svg = doc.createElementNS(NS, 'svg'),
            startAngle = -PI / 2,
            arcRadius = r - weight / 2;

        svg.setAttribute('height', size0 + 'px');
        svg.setAttribute('width', size0 + 'px');

        var circle = doc.createElementNS(NS, 'circle');
        circle.setAttribute('cx', size0 / 2.0);
        circle.setAttribute('cy', size0 / 2.0);
        circle.setAttribute('r', arcRadius - weight / 2);
        circle.setAttribute('fill', fillColor);
        circle.setAttribute('fill-opacity', opacity);
        svg.appendChild(circle);
        // svg.innerHTML = '<circle cx="' + size0 / 2.0 + '" cy="' + size0 / 2.0 + '" r="' + (arcRadius - weight / 2) + '" fill="' + fillColor + '" fill-opacity="0.6"></circle>'
        
        div.appendChild(svg);

        for (i = 0; i < data.length; i++) {
            // Donut section weight is computed relatively to sum or total
            value = data[i].value / (sum !== total ? total : sum);
            value = value === 1 ? .99999 : value;
            arc = doc.createElementNS(NS, 'path');
            var r1 = r + 5;
            var segmentAngle = value * PI * 2,
                endAngle = segmentAngle + startAngle,
                largeArc = ((endAngle - startAngle) % (PI * 2)) > PI ? 1 : 0,
                startX = r1 + cos(startAngle) * arcRadius,
                startY = r1 + sin(startAngle) * arcRadius,
                endX = r1 + cos(endAngle) * arcRadius,
                endY = r1 + sin(endAngle) * arcRadius;

            var name = data[i].name
            var c = '#555'
            if (!colors) {
                // Check if the value contains directly the color if no dict available
                if ((typeof name === 'string') && name.startsWith('#')) c = name
            } else {
                if (Array.isArray(colors)) c = colors[i % colors.length]
                else c = colors[name] || '#fff'
            }
            startAngle = endAngle;

            setAttribute(arc, {
                d: [
                    'M', startX, startY,
                    'A', arcRadius, arcRadius, 0, largeArc, 1, endX, endY
                ].join(' '),
                stroke: c,
                'stroke-opacity': opacity,
                'stroke-width': weight,
                fill: 'none',
                'data-name': name,
                'class': 'donut-arc'
            });
            donut.data(arc, data[i]);

            (function (d, c, percentage) {
                if (options.onclick) {
                    arc.addEventListener('click', function (e) {
                        var t = e.target,
                            val = format(d.value, 'value');
                        if (t.parentNode.stick != t) {
                            t.parentNode.stick = t;
                        } else t.parentNode.stick = false;
                        options.onclick(d.name, !!t.parentNode.stick);
                    })
                }

                arc.addEventListener('mouseenter', function (e) {
                    if (options.hideLegend) return
                    var t = e.target
                    t.setAttribute('stroke-width', weight + 5);
                    legend.setAttribute('class', 'legend');
                    div.zIndex = div.parentNode.style.zIndex;
                    div.parentNode.style.zIndex = 100000;
                    if (!options.legendCompiler && !options.textCompiler) {
                        // If we have the value in the legend it does not make sense to also have it in text,
                        // so that we switch automatically to percentage display in text
                        if (options.legendContent !== 'percentage') {
                            text.innerHTML = format(percentage, 'percentage') + '%';
                        } else {
                            text.innerHTML = format(d.value, 'value');
                        }
                    }
                    t.saved = {
                        val: d.value,
                        legend: options.legendCompiler ?
                            options.legendCompiler(Object.assign(templateContext, { selected: d, percentage, color: c })) :
                            getLegend(d.title || d.name, c, percentage, d.value)
                    }
                    legend.innerHTML = t.saved.legend;
                })
                arc.addEventListener('mouseleave', function (e) {
                    if (options.hideLegend) return
                    var t = e.target,
                        stick = t.parentNode.stick;
                    if (stick == t) {
                        return;
                    }
                    t.setAttribute('stroke-width', weight);
                    var saved = {
                        legend: ''
                    }
                    if (options.textCompiler) {
                        saved.val = options.textCompiler(templateContext);
                    } else if (options.textContent === 'count') {
                        saved.val = data.length;
                    } else if (options.textContent === 'total') {
                        saved.val = total;
                    } else {
                        saved.val = sum;
                    }
                    if (stick) {
                        saved = stick.saved;
                    }
                    div.parentNode.style.zIndex = div.zIndex;
                    text.innerHTML = (options.textCompiler ?
                        saved.val : format(saved.val, (options.textContent === 'count' ? 'count' : 'value')));
                    legend.innerHTML = saved.legend;
                })
            })(data[i], c, value * 100)
            svg.appendChild(arc);
            if (data[i].active) {
                svg.stick = arc;
                var event = new MouseEvent('mouseenter', {
                    view: window,
                    bubbles: false,
                    cancelable: true
                });
                arc.dispatchEvent(event);
                arc.setAttribute('stroke-width', weight);
            }
        }


        div.appendChild(legend);
        if (el) {
            el.appendChild(div)
        }

        return div;
    };


    donut.data = function (arc, data) {
        if (typeof data === 'undefined') {
            return donutData[arc._DONUT];
        } else {
            donutData[arc._DONUT = arc._DONUT || ++dataIndex] = data;
            return arc;
        }
    };

    donut.setColor = function (arc, color) {
        arc.setAttribute('stroke', color);
        return arc;
    };

    function createDonut(points, opt, cfgFn) {
        var blocks = {},
            totalBlocks = {},
            count = points.length,
            key = opt.key,
            sumField = opt.sumField,
            totalField = opt.totalField || opt.sumField,
            fieldList = opt.order || [],
            fieldDict = opt.orderDict || {},
            titleDict = opt.title || {},
            cfg = {};
        if (typeof cfgFn == 'function')
            cfg = cfgFn(points);
        else if (typeof cfgFn == 'object') {
            cfg = cfgFn
        }
        if(Array.isArray(opt.title) && opt.order){
            titleDict =  {};
            for(var i = 0; i < opt.title.length; i++){
                titleDict[opt.order[i]] = opt.title[i]
            }
            opt.title = titleDict;
        }
        for(var i = 0; i < fieldList.length; i++){
            fieldDict[fieldList[i]] = 1;
        }

        for (var i = 0; i < count; i++) {
            var point = points[i]
            // We can get value from marker options or underlying feature
            var feature = point.feature
            var properties = {}
            if (feature && feature.properties) properties = feature.properties
            var s = point.options[key] || properties[key]
            if (!blocks[s]) blocks[s] = 0;
            if (!totalBlocks[s]) totalBlocks[s] = 0;
            if (!fieldDict[s]) {
                fieldDict[s] = 1;
                fieldList.push(s);
            }

            if (!sumField) blocks[s]++;
            else blocks[s] += point.options[sumField] || properties[sumField];
            if (!totalField) totalBlocks[s]++;
            else totalBlocks[s] += point.options[totalField] || properties[totalField];
        }
        var list = [];
        // Ascending by default if not given
        if (!opt.order) fieldList.sort()
        for(var i = 0; i < fieldList.length; i++){
            var s = fieldList[i];
            list.push({
                value: blocks[s] || 0,
                total: totalBlocks[s] || 0,
                name: s,
                title: titleDict[s],
                active: cfg.active && cfg.active == s
            });            
        }

        var myDonut = donut({
            size: cfg.size || 50,
            weight: cfg.weight || 10,
            opacity: cfg.opacity || 0.7,
            textContent: cfg.textContent || 'sum',
            textClassName: cfg.textClassName || 'donut-text',
            textCompiler: cfg.textCompiler,
            hideLegend: cfg.hideLegend,
            legendContent: cfg.legendContent || 'percentage',
            legendClassName: cfg.legendClassName || 'donut-legend',
            legendCompiler: cfg.legendCompiler,
            format: cfg.format || readable,
            getLegend: cfg.getLegend,
            data: list,
            onclick: cfg.onclick,
            colors: cfg.colors,
            fillColor: cfg.fillColor
        });
        myDonut.config = cfg;
        return myDonut;
    }
    // to use donut as icon
    L.DivIcon.prototype.createIcon = function (oldIcon) {
        var div = (oldIcon && oldIcon.tagName === 'DIV') ? oldIcon : document.createElement('div'),
            options = this.options;

        if (options.el) {
            div.appendChild(options.el);
        } else
            div.innerHTML = options.html !== false ? options.html : '';

        if (options.bgPos) {
            var bgPos = L.Point(options.bgPos);
            div.style.backgroundPosition = (-bgPos.x) + 'px ' + (-bgPos.y) + 'px';
        }
        this._setIconStyles(div, 'icon');

        return div;
    }

    function defaultStyle(points) {
        var count = points.length,
            size, weight, fill;
        if (count < 10) {
            size = 40;
            weight = 8;
            // c += 'small';
            fill = '#6ecc39';
        } else if (count < 100) {
            size = 50;
            weight = 10;
            // c += 'medium';
            fill = '#f1d357'
        } else {
            size = 60;
            weight = 12;
            // c += 'large';
            fill = '#fd9c73'
        }
        return {
            size: size,
            weight: weight,
            fill: fill
        }
    }
    /**
     *  
     * @param {object} opt marker cluster's options
     * @param {object} donutOpt donut cluster's options
     * 
     */
    L.DonutCluster = function (opt, donutOpt) {
        // Manage templating
        var textCompiler, legendCompiler;
        if (window._ && (typeof window._.template === 'function')) {
            if (donutOpt.textTemplate) textCompiler = _.template(donutOpt.textTemplate);
            if (donutOpt.legendTemplate) legendCompiler = _.template(donutOpt.legendTemplate);
        }

        var createIcon = function (cluster) {
            var markers = cluster.getAllChildMarkers();
            var myDonut = createDonut(markers, donutOpt, function (points) {
                var style;
                if (!donutOpt.style) {
                    style = defaultStyle(points)
                } else {
                    if (typeof donutOpt.style == 'function') {
                        style = donutOpt.style(points);
                    } else style = donutOpt.style;
                }
                return {
                    size: style.size,
                    weight: style.weight,
                    opacity: style.opacity,
                    hideLegend: donutOpt.hideLegend,
                    legendContent: donutOpt.legendContent,
                    legendClassName: donutOpt.legendClassName,
                    legendCompiler: legendCompiler,
                    format: donutOpt.format,
                    getLegend: donutOpt.getLegend,
                    textContent: donutOpt.textContent,
                    textClassName: donutOpt.textClassName,
                    textCompiler: textCompiler,
                    colors: donutOpt.arcColorDict,
                    fillColor: style.fill
                }
            })

            return new L.DivIcon({
                el: myDonut,
                iconSize: new L.Point(myDonut.config.size + 10, myDonut.config.size + 10),
                className: donutOpt.className || 'donut-cluster'
            });

        }
        opt.iconCreateFunction = createIcon;
        return L.markerClusterGroup(opt, donutOpt);
    }

    // donut.readable = readable;
    // window.donut = donut;
}, window));