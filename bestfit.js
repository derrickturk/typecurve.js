;(function (ns, undefined) {
    'use strict';

    ns.bestHyperbolicFromRate = function (rate, time)
    {
        var best_params = gradient_descent(function (qi, Di, b) {
            return sse(new ns.Hyperbolic(qi, Di, b), rate, time)
        }, [rate[0], (rate[1] - rate[0]) / (time[1] - time[0]), 1.5],
        [0.0, 0.0, 0.0], [1e99, 20.0, 5.0], 0.01, 1e-3, 0.01
        )

        return new ns.Hyperbolic(
            best_params[0], best_params[1], best_params[2])
    }

    ns.bestHyperbolicFromIntervalVolumes = function (vol, time)
    {
        var best_params = gradient_descent(function (qi, Di, b) {
            return sse_interval(new ns.Hyperbolic(qi, Di, b), vol, time)
        }, [vol[0], (vol[1] - vol[0]) / (time[1] - time[0]), 1.5],
        [0.0, 0.0, 0.0], [1e99, 20.0, 5.0], 0.01, 1e-3, 0.01
        )

        return new ns.Hyperbolic(
            best_params[0], best_params[1], best_params[2])
    }

    function gradient_descent(f, guess, lower, upper, step, eps, grad_step)
    {
        var diff = Infinity,
            last = f.apply(guess)

        while (diff > eps) {
            var grad = gradient(f, guess, grad_step)
            guess = guess.map(function (val, i) {
                return val - step * grad[i]
            })
            guess = guess.map(function (val, i) {
                if (val < lower[i])
                    return lower[i]
                if (val > upper[i])
                    return upper[i]
                return val
            })
            var next = f.apply(guess)
            diff = Math.abs(next - last)
            last = next
        }

        return guess
    }

    function gradient(f, x, h)
    {
        var forward = x.map(function (i) { return i + h / 2.0 }),
            backward = x.map(function (i) { return i - h / 2.0 })
            f_forward = f.apply(forward),
            f_backward = f.apply(backward)

        return (f_forward - f_backward) / h
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
        console.log('timestep = ' + timestep)
        var forecast_cum = begin_time.map(model.cumulative, model)
        console.log('forecast_cum = ' + forecast_cum)
        forecast_cum.push(
            model.cumulative(begin_time[begin_time.length - 1.0] + timestep))
        console.log('forecast_cum = ' + forecast_cum)
        return vol.reduce(function (sum, act, i) {
            return sum +
                Math.pow(act - (forecast_cum[i + 1] - forecast_cum[i]), 2.0)
        }, 0.0)
    }

})(window.typecurve = window.typecurve || {})

