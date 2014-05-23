;(function (ns, undefined) {
    'use strict';

    ns.bestHyperbolicFromRate = function (rate, time)
    {
        var best_params = gradient_descent(function (qi, Di, b) {
            return sse(new ns.Hyperbolic(qi, Di, b), rate, time)
        }, [rate[0], (rate[0] - rate[1]) / (time[1] - time[0]) / rate[0], 1.5],
        [0.0, 0.0, 0.0], [1e99, 20.0, 5.0], 0.001, 1e-3, [1, 0.0001, 0.001]
        )

        return new ns.Hyperbolic(
            best_params[0], best_params[1], best_params[2])
    }

    ns.bestHyperbolicFromIntervalVolumes = function (vol, time)
    {
        var best_params = gradient_descent(function (qi, Di, b) {
            return sse_interval(new ns.Hyperbolic(qi, Di, b), vol, time)
        }, [vol[0], (vol[0] - vol[1]) / (time[1] - time[0]) / vol[0], 1.5],
        [0.0, 0.0, 0.0], [1e99, 20.0, 5.0], 0.01, 1e-3, [1, 0.0001, 0.001]
        )

        return new ns.Hyperbolic(
            best_params[0], best_params[1], best_params[2])
    }

    function gradient_descent(f, guess, lower, upper, step, eps, grad_step)
    {
        var diff = Infinity,
            last = f.apply(null, guess)

        var i = 0

        while (diff > eps) {
            var grad = gradient(f, guess, grad_step)
            console.log('grad = ' + grad)
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
            var next = f.apply(null, guess)
            diff = Math.abs(next - last)
            last = next

            if (i++ > 1000)
                break
        }

        return guess
    }

    function gradient(f, x, h)
    {
        return x.map(function (val, i) {
            var forward = x.slice(0),
                backward = x.slice(0)
            forward[i] = val + h[i] / 2.0
            backward[i] = val - h[i] / 2.0

            return (f.apply(null, forward) - f.apply(null, backward)) / h[i]
        })
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

