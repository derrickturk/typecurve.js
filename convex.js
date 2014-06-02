;(function (ns, undefined) {
    'use strict';

    ns.makeConstrainedObjective = function(f, lower, upper)
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

    ns.nelderMead =
    function(f, start, ref_factor, exp_factor, con_factor, max_iter)
    {
        if (start.some(function (vec) {
            return vec.length != start.length - 1
        })) throw new Error('Invalid starting simplex!')

        var result = start.map(function (vec) { return f.apply(null, vec) }),
            best = ns.minIndex(result),
            worst = ns.maxIndex(result),
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
                worst = ns.maxIndex(result)
                center = centroid(start, worst)
            } else if (result.some(function (v, i) {
                  return (v > reflect_res && i != worst)
              })) {
                // there's someone worse than the reflected point who is not
                // the worst, so keep the reflected point
                start[worst] = reflect
                result[worst] = reflect_res
                worst = ns.maxIndex(result)
                center = centroid(start, worst)
            } else {
                // the reflected point is worse than everyone
                // (except maybe for the worst), so contract

                if (reflect_res < result[worst]) { // better than the worst!
                    start[worst] = reflect
                    result[worst] = reflect_res
                    worst = ns.maxIndex(result)
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
                    best = ns.minIndex(result)
                    worst = ns.maxIndex(result)
                    center = centroid(start, worst)
                } else {
                    start[worst] = contract
                    result[worst] = contract_res
                    worst = ns.maxIndex(result)
                    center = centroid(start, worst)
                }
            }
        }

        return start[best]
    }

    ns.minIndex = function(vec)
    {
        return vec.reduce(function (prev, val, i, arr) {
            if (val < arr[prev])
                return i
            return prev
        }, 0)
    }

    ns.maxIndex = function(vec)
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

})(window.convex = window.convex || {})
