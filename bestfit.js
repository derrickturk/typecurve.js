;(function (ns, undefined) {
    'use strict';

    ns.bestHyperbolicFromRate = function (rate, time)
    {
        var best_params = nelder_mead(
            make_constrained_objective(function (qi, Di, b) {
                return sse(new ns.Hyperbolic(qi, Di, b), rate, time)
            }, [1, 0.01, 0], [1e99, 20, 5]),
            initial_simplex(rate, time),
            1.0, 2.0, 0.5,
            300
        )

        return new ns.Hyperbolic(
            best_params[0], best_params[1], best_params[2])
    }

    ns.bestHyperbolicFromIntervalVolumes = function (vol, time)
    {
        var best_params = nelder_mead(
            make_constrained_objective(function (qi, Di, b) {
                return sse_interval(new ns.Hyperbolic(qi, Di, b), vol, time)
            }, [1, 0.01, 0], [1e99, 20, 5]),
            initial_simplex(vol, time),
            1.0, 2.0, 0.5,
            300
        )

        return new ns.Hyperbolic(
            best_params[0], best_params[1], best_params[2])
    }

    function initial_simplex(rate, time)
    {
        var qi_guess = rate[0],
            peak_month = maxdex(rate),
            Di_guess = (peak_month != rate.length - 1) ?
                (rate[peak_month] - rate[peak_month + 1]) /
                (time[peak_month + 1] - time[peak_month]) /
                rate[peak_month]
                : 2.0

        return [
            [qi_guess * 0.25, Di_guess * 0.5, 1.3],
            [qi_guess * 1.5, Di_guess * 5, 0.8],
            [qi_guess, Di_guess, 2.0],
            [qi_guess * 5, Di_guess, 0.5]
        ]
    }

    function make_constrained_objective(f, lower, upper)
    {
        return function() {
            var args = arguments
            if (lower.some(function (v, i) {
                return args[i] < v
            }))
                return Infinity
            if (upper.some(function (v, i) {
                return args[i] > v
            }))
                return Infinity
            return f.apply(null, args)
        }
    }

    function nelder_mead(f, start, ref_factor, exp_factor, con_factor, max_iter)
    {
        if (start.some(function (vec) {
            return vec.length != start.length - 1
        })) throw new Error('Invalid starting simplex!')

        var result = start.map(function (vec) { return f.apply(null, vec) }),
            best = mindex(result),
            worst = maxdex(result),
            center = centroid(start, worst),
            iter = 0

        while (iter++ < max_iter) {
            var reflect = center.map(function (v, i) {
                return (1.0 + ref_factor) * v - ref_factor * start[worst][i]
            }), reflect_res = f.apply(null, reflect)

            if (reflect_res < result[best]) {
                // reflection was better than the best, try expanding
                var expand = reflect.map(function (v, i) {
                    return (1.0 + exp_factor) * v - exp_factor * center[i]
                }), expand_res = f.apply(null, expand)

                if (expand_res < result[best]) { // expansion worked
                    start[worst] = expand
                    result[worst] = expand_res
                } else { // keep first reflected point
                    start[worst] = reflect
                    result[worst] = reflect_res
                }

                best = worst
                worst = maxdex(result)
                center = centroid(start, worst)
            } else if (result.some(function (v, i) {
                  return (v > reflect_res && i != worst)
              })) {
                // there's someone worse than the reflected point who is not
                // the worst, so keep the reflected point
                start[worst] = reflect
                result[worst] = reflect_res
                worst = maxdex(result)
                center = centroid(start, worst)
            } else {
                // the reflected point is worse than everyone
                // (except maybe for the worst), so contract

                if (reflect_res < result[worst]) { // better than the worst!
                    start[worst] = reflect
                    result[worst] = reflect_res
                    worst = maxdex(result)
                    center = centroid(start, worst)
                }

                var contract = start[worst].map(function (v, i) {
                    return con_factor * v + (1.0 - con_factor) * center[i]
                }), contract_res = f.apply(null, contract)

                if (contract_res >= result[worst]) {
                    // it got worse! (or worse, no better!)
                    // contract all the things!
                    for (var i = 0; i < start.length; ++i) {
                        if (i != best) {
                            start[i] = start[i].map(function (v, i) {
                                return (v + start[best][i]) / 2.0
                            })
                        }
                    }
                    result = start.map(function (vec) { return f.apply(null, vec) })
                    best = mindex(result)
                    worst = maxdex(result)
                    center = centroid(start, worst)
                } else {
                    start[worst] = contract
                    result[worst] = contract_res
                    worst = maxdex(result)
                    center = centroid(start, worst)
                }
            }
        }

        return start[best]
    }

    function mindex(vec)
    {
        return vec.reduce(function (prev, val, i, arr) {
            if (val < arr[prev])
                return i
            return prev
        }, 0)
    }

    function maxdex(vec)
    {
        return vec.reduce(function (prev, val, i, arr) {
            if (val > arr[prev])
                return i
            return prev
        }, 0)
    }

    function centroid(simplex, worst)
    {
        var zero = new Array(simplex[0].length)
        for (var i = 0; i < simplex[0].length; ++i)
            zero[i] = 0.0
        return simplex.reduce(function (prev, vec, which) {
            for (i = 0; i < vec.length; ++i)
                if (which != worst)
                    prev[i] += vec[i]
            return prev
        }, zero).map(function (val) { return val / (simplex.length - 1) })
    }

    function sse(model, rate, time)
    {
        var forecast = time.map(model.rate, model)
        return forecast.reduce(function (sum, pred, i) {
            return sum + Math.pow(pred - rate[i], 2.0)
        }, 0.0)
    }

    function sse_interval(model, vol, begin_time)
    {
        var timestep = begin_time[1] - begin_time[0]
        var forecast_cum = begin_time.map(model.cumulative, model)
        forecast_cum.push(
            model.cumulative(begin_time[begin_time.length - 1.0] + timestep))
        return vol.reduce(function (sum, act, i) {
            return sum +
                Math.pow(act - (forecast_cum[i + 1] - forecast_cum[i]), 2.0)
        }, 0.0)
    }

    ns.minIndex = mindex
    ns.maxIndex = maxdex
})(window.typecurve = window.typecurve || {})

