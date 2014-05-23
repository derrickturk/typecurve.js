;(function (ns, undefined) {
    'use strict';

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

