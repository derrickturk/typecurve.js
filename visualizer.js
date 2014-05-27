;(function(undefined) {
    var data = null

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

    function initialize_display(options)
    {
        options = options || {}
        var width = options.width || 1024,
            height = options.height || 768,
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

        function update() {
            scale_x.domain(d3.extent(data.time))
            scale_y.domain(d3.extent(data.aggregate_oil.concat(
                data.aggregate_gas,
                data.predict_oil_rate,
                data.predict_gas_rate
            )))

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

    window.onload = function() {
        data = compute_typecurves(window.ihs)
        var update = initialize_display()
        update()

        /*
        var test = {
            header: window.ihs.header.slice(0, 10),
            oil: window.ihs.oil.slice(0, 10),
            gas: window.ihs.gas.slice(0, 10)
        }

        data = compute_typecurves(test)
        update()
        */
    }
})()
