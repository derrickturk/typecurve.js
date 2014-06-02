;(function (ns, undefined) {
    'use strict';

    ns.bestHyperbolicFromRate = function (rate, time)
    {
        var best_params = convex.nelderMead(
            convex.makeConstrainedObjective(function (qi, Di, b) {
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
        var best_params = convex.nelderMead(
            convex.makeConstrainedObjective(function (qi, Di, b) {
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
            peak_month = convex.maxIndex(rate),
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

})(window.typecurve = window.typecurve || {})

