;(function(undefined) {
    function month_range(data)
    {
        return minmax(Array.prototype.concat.apply([], data))
    }

    function unique_header(wells, field)
    {
        return wells.map(function (rec) { return rec[field] }).sort()
            .reduce(function (p, v) {
                if (p.length == 0 || v != p[p.length - 1])
                    p.push(v)
                return p
            }, [])
    }

    function datecode(year, month, day)
    {
        day = day || 1
        month = month || 1

        return year.toString() + (month < 10 ? '0' : '') + month.toString() +
            (day < 10 ? '0' : '') + day.toString()
    }

    function min(arr)
    {
        return arr.reduce(function (p, v) {
            if (v < p)
                return v
            return p
        }, arr[0])
    }

    function max(arr)
    {
        return arr.reduce(function (p, v) {
            if (v > p)
                return v
            return p
        }, arr[0])
    }

    function minmax(arr)
    {
        return arr.reduce(function (p, v) {
            if (v < p[0])
                p[0] = v
            if (v > p[1])
                p[1] = v
            return p
        }, [arr[0], arr[0]])
    }

    function secant_effective(Di, b)
    {
        return 1.0 - Math.pow(b * Di + 1.0, -1.0 / b)
    }

    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
    function point_in_poly(lat, lng, vertices)
    {
        var c = false
        for (var i = 0, j = vertices.length - 1; i < vertices.length; j = i++)
            if (((vertices[i].lat > lat) != (vertices[j].lat > lat)) &&
                    (lng < (vertices[j].lng - vertices[i].lng) * (lat - vertices[i].lat) / (vertices[j].lat - vertices[i].lat) + vertices[i].lng))
                c = !c
        return c
    }

    function compute_typecurves(data, percentile)
    {
        function to_daily(monthly) { return monthly / 30.4 }

        var normalized
        if (!percentile)
            normalized = typecurve.meanProduction(data.oil, [ data.gas ],
                { shift_to_peak: true })
        else
            normalized = typecurve.percentileProduction(data.oil, [ data.gas ],
                percentile, { shift_to_peak: true })

        var time = typecurve.iota(0, normalized.major.length),
        oil_tc = typecurve.bestHyperbolicFromIntervalVolumes(
            normalized.major, time),
        gas_tc = typecurve.bestHyperbolicFromIntervalVolumes(
            normalized.minor[0], time)

        var predict_oil = new Array(time.length)
        for (var i = 0; i < time.length; ++i) {
            predict_oil[i] = oil_tc.cumulative(time[i] + 1)
                - oil_tc.cumulative(time[i])
        }

        var predict_gas = new Array(time.length)
        for (var i = 0; i < time.length; ++i) {
            predict_gas[i] = gas_tc.cumulative(time[i] + 1)
                - gas_tc.cumulative(time[i])
        }

        return {
            time: time,
            aggregate_oil: normalized.major.map(to_daily),
            aggregate_gas: normalized.minor[0].map(to_daily),
            predict_oil: predict_oil.map(to_daily),
            predict_gas: predict_gas.map(to_daily),
            predict_oil_rate: time.map(oil_tc.rate, oil_tc).map(to_daily),
            predict_gas_rate: time.map(gas_tc.rate, gas_tc).map(to_daily),
            oil_numwells: data.header.length,
            gas_numwells: data.header.length,
            oil_params: {
                qi: oil_tc.qi / 30.4,
                Di: oil_tc.Di * 12,
                b: oil_tc.b
            },
            gas_params: {
                qi: gas_tc.qi / 30.4,
                Di: gas_tc.Di * 12,
                b: gas_tc.b
            }
        }
    }

    function initialize_graph(options)
    {
        options = options || {}
        var width = options.width || 1024,
            height = options.height || 600,
            padding = options.padding || {},
            pad_left = padding.left || 100,
            pad_right = padding.right || 20,
            pad_bottom = padding.bottom || 50,
            pad_top = padding.top || 0,
            plot_width = width - pad_left - pad_right,
            plot_height = height - pad_bottom - pad_top

        var scale_x = d3.scale.linear().range([0, plot_width]),
            scale_y = d3.scale.log().range([plot_height, 0]),
            axis_x = d3.svg.axis().scale(scale_x).orient('bottom'),
            axis_y = d3.svg.axis().scale(scale_y).orient('left')
                .tickFormat(function (n) { return n.toFixed(0) })

        var scatter = d3.select('#graph').append('svg:svg')
            .attr('width', width)
            .attr('height', height)

        var plot_area = scatter.append('svg:g')
            .attr('transform', 'translate(' + pad_left + ',' + pad_top + ')')

        var axis_x_area = plot_area.append('svg:g').attr('class', 'axis')
              .attr('transform', 'translate(0, ' + plot_height + ')'),
            axis_y_area = plot_area.append('svg:g').attr('class', 'axis')

        scatter.append("text")
            .attr("class", "label")
            .attr("text-anchor", "end")
            .attr("x", width - 15)
            .attr("y", height - 5)
            .text("Month");

        scatter.append("text")
            .attr("class", "label")
            .attr("text-anchor", "end")
            .attr("y", 15)
            .attr("dy", ".75em")
            .attr("transform", "rotate(-90)")
            .text("Avg. daily rate [bbl/d or Mcf/d]");

        var actual_oil = plot_area.append('svg:path')
                .attr('class', 'line oil actual'),
            actual_gas = plot_area.append('svg:path')
                .attr('class', 'line gas actual'),
            predict_oil = plot_area.append('svg:path')
                .attr('class', 'line oil predicted'),
            predict_gas = plot_area.append('svg:path')
                .attr('class', 'line gas predicted')

        function update(data) {
            scale_x.domain(d3.extent(data.time))
            var ydom = d3.extent(data.aggregate_oil.concat(
                data.aggregate_gas,
                data.predict_oil_rate,
                data.predict_gas_rate
            ))
            if (ydom[0] < 1.0)
                ydom[0] = 1
            scale_y.domain(ydom)

            axis_x_area.call(axis_x)
            axis_y_area.call(axis_y)

            actual_oil.datum(data.aggregate_oil)
                .attr('d', d3.svg.line()
                        .x(function (d, i) { return scale_x(data.time[i]) })
                        .y(function (d) { return scale_y(d) }))

            actual_gas.datum(data.aggregate_gas)
                .attr('d', d3.svg.line()
                        .x(function (d, i) { return scale_x(data.time[i]) })
                        .y(function (d) { return scale_y(d) }))

            predict_oil.datum(data.predict_oil)
                .attr('d', d3.svg.line()
                        .x(function (d, i) { return scale_x(data.time[i]) })
                        .y(function (d) { return scale_y(d) }))

            predict_gas.datum(data.predict_gas)
                .attr('d', d3.svg.line()
                        .x(function (d, i) { return scale_x(data.time[i]) })
                        .y(function (d) { return scale_y(d) }))
        }

        return update
    }

    function initialize_map(options)
    {
        options = options || {}
        var select_poly = options.select_poly || function (e) {}

        var map = L.map('map').setView([32.1, -101.7], 9)
        L.tileLayer('http://{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.png', {
            subdomains: ['otile1', 'otile2', 'otile3', 'otile4'],
            attribution: 'Tiles &copy; MapQuest'
        }).addTo(map);

        L.control.scale().addTo(map)

        map.addControl(new L.Control.Draw({
            draw: {
                marker: false,
                polyline: false,
                circle: { shapeOptions: { color: 'blue' } },
                rectangle: { shapeOptions: { color: 'blue' } },
                polygon: {
                    shapeOptions: { color: 'blue' },
                    allowIntersection: false
                }
            },
            position: 'topright'
        }))

        var poly_layer = null
        map.on('draw:created', function (e) {
            if (poly_layer) {
                map.removeLayer(poly_layer)
                select_poly()
            }
            poly_layer = e.layer
            map.addLayer(poly_layer)
            select_poly(e)
        })
        map.on('dblclick', function () {
            if (poly_layer) {
                map.removeLayer(poly_layer)
                select_poly()
            }
        })

        var markers = null

        return {
            update: function(data) {
                if (markers)
                    map.removeLayer(markers)

                markers = new L.MarkerClusterGroup()

                data.header.map(function (h) {
                    if (h.lat && h.lon) {
                        var marker = L.marker([h.lat, h.lon], {
                            icon: L.divIcon({ className: 'well-marker' }),
                            title: h.name + ' (API#: ' + h.api + ')',
                        }).bindPopup('<div class="well-popup"><p>Name: ' +
                            h.name + '<p>API: ' + h.api + '<p>Operator: '
                            + h.operator + '</div>')
                        markers.addLayer(marker)
                    }
                })

                map.addLayer(markers)
            },

            clear_poly: function() {
                if (poly_layer)
                    map.removeLayer(poly_layer)
            }
        }
    }

    function fill_operator_selector(ops)
    {
        var op_sel = document.getElementById('operator')

        for (var i = 0; i < ops.length; ++i) {
            var opt = document.createElement('option')
            opt.text = ops[i]
            op_sel.add(opt)
        }

        op_sel.selectedIndex = 0
    }

    function fill_date_selectors(daterange) {
        var from_year = Number(daterange[0].slice(0, 4)),
            to_year = Number(daterange[1].slice(0, 4)),
            from_month = Number(daterange[0].slice(4, 6)),
            to_month = Number(daterange[1].slice(4, 6))

        var selectors = [
            document.getElementById('from-month'),
            document.getElementById('to-month')
        ]

        while (from_year < to_year || from_month <= to_month) {
            for (var i = 0; i < selectors.length; ++i) {
                var opt = document.createElement('option')
                opt.text = from_month + '/' + from_year
                opt.value = datecode(from_year, from_month)
                selectors[i].add(opt)
            }

            if (++from_month > 12) {
                from_month = 1
                ++from_year
            }
        }

        selectors[0].selectedIndex = 0
        selectors[1].selectedIndex = selectors[1].length - 1
    }

    function update_results(data)
    {
        document.getElementById('oil_wells').innerHTML = data.oil_numwells
        document.getElementById('oil_qi').innerHTML =
            data.oil_params.qi.toFixed(2)
        document.getElementById('oil_Di').innerHTML =
            (secant_effective(data.oil_params.Di, data.oil_params.b) * 100)
            .toFixed(2)
        document.getElementById('oil_b').innerHTML =
            data.oil_params.b.toFixed(2)
        document.getElementById('gas_wells').innerHTML = data.gas_numwells
        document.getElementById('gas_qi').innerHTML =
            data.gas_params.qi.toFixed(2)
        document.getElementById('gas_Di').innerHTML =
            (secant_effective(data.gas_params.Di, data.gas_params.b) * 100)
            .toFixed(2)
        document.getElementById('gas_b').innerHTML =
            data.gas_params.b.toFixed(2)
    }

    function filter_by_array(master, keep)
    {
        var keepfn = function (v, i) { return keep[i] }

        return {
            header: master.header.filter(keepfn),
            month: master.month.filter(keepfn),
            oil: master.oil.filter(keepfn),
            gas: master.gas.filter(keepfn),
            water: master.water.filter(keepfn)
        }
    }

    function select_circle(master, circ)
    {
        var r = circ.getRadius(), center = circ.getLatLng()
        var keep = master.header.map(function (h) {
            if (!(h.lat && h.lon))
                return false
            var latlng = new L.LatLng(h.lat, h.lon)
            return latlng.distanceTo(center) <= r
        })

        return filter_by_array(master, keep)
    }

    function select_rectangle(master, rect)
    {
        var keep = master.header.map(function (h) {
            if (!(h.lat && h.lon))
                return false
            return rect.getBounds().contains(new L.LatLng(h.lat, h.lon))
        })

        return filter_by_array(master, keep)
    }

    function select_polygon(master, poly)
    {
        var keep = master.header.map(function (h) {
            if (!(h.lat && h.lon))
                return false
            return point_in_poly(h.lat, h.lon, poly.getLatLngs())
        })

        return filter_by_array(master, keep)
    }

    function apply_filters(master, operator, daterange, shape)
    {
        var filtered = master,
            keep

        if (operator && operator !== 'All') {
            keep = filtered.header.map(function (w, i) {
                return w.operator == operator
            })
            filtered = filter_by_array(filtered, keep)
        }

        if (daterange) {
            keep = filtered.month.map(function (w) {
                return w[0].slice(0, 6) >= daterange[0].slice(0, 6) &&
                       w[0].slice(0, 6) <= daterange[1].slice(0, 6)
            })
            filtered = filter_by_array(filtered, keep)
        }

        if (shape) {
            if (shape.layerType === 'circle')
                filtered = select_circle(filtered, shape.layer)
            else if (shape.layerType === 'rectangle')
                filtered = select_rectangle(filtered, shape.layer)
            else if (shape.layerType === 'polygon')
                filtered = select_polygon(filtered, shape.layer)
        }

        return filtered
    }

    function compute_percentile(text)
    {
        if (text[0] == 'P')
            return 1.0 - Number(text.slice(1)) / 100

        return undefined
    }

    function set_working()
    {
        document.getElementById('working').style.display = 'inherit'
    }

    function set_not_working()
    {
        document.getElementById('working').style.display = 'none'
    }

    var dispatcher = new machina.Machina(
        {
            master: window.ihs,
            filtered: window.ihs,
            data: null,
            daterange: null,
            operator: null,
            shape: null,
            aggregation: undefined,
            graph_update: null,
            map_update: null,
            map_clear_shape: null,
            results_update: update_results
        },
        {
            initialize: function(state, args) {
                var machina = this

                if (!(args && args.working)) {
                    set_working()
                    window.setTimeout(function () {
                        args = args || {}
                        args.working = true
                        machina.dispatch('initialize', args)
                    }, 4)
                    return null
                }

                state.graph_update = initialize_graph()
                var mapfns = initialize_map({
                    select_poly: function (e) {
                        if (e === undefined) {
                            state.map_clear_shape()
                            machina.dispatch('filterChange', { shape: null })
                        } else {
                            machina.dispatch('filterChange', { shape: e })
                        }
                    }
                })
                state.map_update = mapfns.update
                state.map_clear_shape = mapfns.clear_poly

                return ['calculate', { filter_changed: true }]
            },

            calculate: function(state, args) {
                state.data = compute_typecurves(state.filtered,
                    state.aggregation)
                return ['update', args]
            },

            update: function(state, args) {
                state.graph_update(state.data)
                state.results_update(state.data)

                if (args && args.filter_changed) {
                    state.map_update(state.filtered)
                }

                return ['done', undefined]
            },

            aggregationChange: function(state, args) {
                state.aggregation = args.percentile
                return ['calculate', undefined]
            },

            filterChange: function(state, args) {
                var machina = this
                args = args || {}

                if (!(args && args.working)) {
                    set_working()
                    window.setTimeout(function () {
                        args.working = true
                        machina.dispatch('filterChange', args)
                    }, 25)
                    return null
                }

                var operator = state.operator,
                    daterange = state.daterange,
                    shape = state.shape

                if (args.operator !== undefined) {
                    operator = args.operator
                }

                if (args.daterange !== undefined) {
                    daterange = args.daterange
                }

                if (args.shape !== undefined) {
                    shape = args.shape
                }

                var filtered = apply_filters(state.master, operator, daterange,
                        shape)

                if (filtered.header.length == 0) {
                    alert('No wells meet criteria!')
                    args.fail && args.fail()
                    return ['done', undefined]
                }

                state.filtered = filtered
                state.operator = operator
                state.daterange = daterange
                state.shape = shape

                return ['calculate', { filter_changed: true }]
            },

            done: function() {
                set_not_working()
                return null;
            }
        }
    )

    window.onload = function() {
        var daterange = month_range(window.ihs.month)
        fill_date_selectors(daterange)
        fill_operator_selector(unique_header(window.ihs.header, 'operator'))

        function get_date_range()
        {
            var from = document.getElementById('from-month'),
                to   = document.getElementById('to-month')

            return [from.value, to.value]
        }

        document.getElementById('from-month').addEventListener('change',
                function (e) {
                    dispatcher.dispatch('filterChange', {
                        daterange: get_date_range()
                    })
                })
        document.getElementById('to-month').addEventListener('change',
                function (e) {
                    dispatcher.dispatch('filterChange', {
                        daterange: get_date_range()
                    })
                })
        document.getElementById('operator').addEventListener('change',
                function (e) {
                    dispatcher.dispatch('filterChange', {
                        operator: e.target.value
                    })
                })
        document.getElementById('aggregate').addEventListener('change',
                function (e) {
                    dispatcher.dispatch('aggregationChange', {
                        percentile: compute_percentile(e.target.value)
                    })
                })

        dispatcher.dispatch('initialize')
    }
})()
