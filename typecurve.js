;(function (ns, undefined) {
    'use strict';

    ns.meanProduction = function(majorphase, minorphase, options) 
    {
        return typecurve_production(majorphase, minorphase, mean, options)
    }

    ns.percentileProduction = function(majorphase, minorphase, pct, options)
    {
        return typecurve_production(majorphase, minorphase,
            percentile(pct), options)
    }

    ns.iota = function(initial, length, delta)
    {
        delta = delta || 1
        var result = new Array(length)
        for (var i = 0; i < length; ++i)
            result[i] = initial + i * delta
        return result
    }

    function typecurve_production(majorphase, minorphase, aggregation, options)
    {
        options = options || {}
        var shift_to_peak = options['shift_to_peak'] || false,
            min_wells = options['min_wells'] || majorphase.length / 2,
            drop_zeros = options['drop_zeros'] || false

        if (drop_zeros)
            majorphase = majorphase.map(function(prod) {
                return prod.filter(function (v) { return v > 0 })
            })

        var first_periods
        if (shift_to_peak) {
            first_periods = majorphase.map(ns.maxIndex)
        } else  {
            first_periods = Array(majorphase.length)
            for (var i = 0; i < first_periods.length; ++i)
                first_periods[i] = 0
        }

        if (drop_zeros)
            minorphase = minorphase.map(function (phase) {
                return phase.map(function (prod, i) {
                    return prod.filter(function (v, j) {
                        return j <= first_periods[i] || v > 0
                    })
                })
            })

        var num_periods = majorphase.map(function (prod) { return prod.length }),
            num_periods_minor
        if (drop_zeros)
            num_periods_minor = minorphase.map(function (vec) {
                return vec.map(function (prod) { return prod.length })
            })
        else
            num_periods_minor = minorphase.map(function (vec) {
                return num_periods
            })

        return {
            major: aggregate(majorphase,
                       first_periods, num_periods, min_wells, aggregation),
            minor: minorphase.map(function (minor, i) {
                return aggregate(minor,
                    first_periods, num_periods_minor[i], min_wells, aggregation)
            })
        }
    }

    function aggregate(prod, first_periods, num_periods, min_wells, aggregation)
    {
        var result = [],
            i = 0

        while (true) {
            var current = []
            for (var w = 0; w < prod.length; ++w)
                if (first_periods[w] + i < num_periods[w])
                    current.push(prod[w][first_periods[w] + i])
            if (current.length >= min_wells)
                result.push(aggregation(current))
            else
                return result
            ++i
        }
    }

    function mean(vec)
    {
        return vec.reduce(function (p, v) { return p + v }, 0.0) / vec.length
    }

    function percentile(p)
    {
        return function(vec) {
            vec.sort(function (a, b) { return a - b })
            return vec[Math.floor(p * vec.length)]
        }
    }

})(window.typecurve = window.typecurve || {})
