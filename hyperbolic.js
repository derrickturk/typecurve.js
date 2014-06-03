;(function (ns, undefined) {
    'use strict';

    var eps = 1e-3

    /* General functions for Arps declines */
    function Decline() {}

    Decline.prototype.eur = function(econ_limit, t_max)
    {
        t_max = t_max || Infinity

        var t_eur = Math.min(this.timeToRate(econ_limit), t_max)
        return this.cumulative(t_eur)
    }

    /* Time until rate meets or falls below specified value */
    Decline.prototype.timeToRate = function(rate)
    {
        if (rate >= this.qi)
            return 0.0
        if (rate < 0.0)
            return Infinity
        var self = this,
            t = convex.nelderMead(function (time) {
                if (time < 0) return Infinity
                return Math.abs(self.rate(time) - rate)
        }, [[1], [100]], 300)

        if (this.rate(t) - rate > eps)
            return Infinity
        return t[0]
    }

    /* Time until cumulative meets or exceeds specified value */
    Decline.prototype.timeToCumulative = function(cumulative)
    {
        if (cumulative <= 0.0)
            return 0.0
        var self = this,
            t = convex.nelderMead(function (time) {
                if (time < 0) return Infinity
                return Math.abs(self.cumulative(time) - cumulative)
        }, [[1], [100]], 300)

        if (cumulative - this.cumulative(t) > eps)
            return Infinity
        return t[0]
    }

    /* Arps hyperbolic decline with
     *     initial rate qi [vol/time]
     *     initial nominal decline Di [1/time]
     *     hyperbolic exponent b [1]
     */
    ns.Hyperbolic = function(qi, Di, b)
    {
        this.qi = qi
        this.Di = Di
        this.b = b
    }

    ns.Hyperbolic.prototype = new Decline()

    ns.Hyperbolic.prototype.rate = function(t)
    {
        if (t < 0.0)
            return 0.0
        if (this.b < eps)
            return ns.Exponential.prototype.rate.call(this, t)
        if (Math.abs(this.b - 1.0) < eps)
            return ns.Harmonic.prototype.rate.call(this, t)
        return this.qi * Math.pow(1.0 + this.b * this.Di * t, -1.0 / this.b)
    }

    ns.Hyperbolic.prototype.cumulative = function(t)
    {
        if (t <= 0.0)
            return 0.0
        if (this.b < eps)
            return ns.Exponential.prototype.cumulative.call(this, t)
        if (Math.abs(this.b - 1.0) < eps)
            return ns.Harmonic.prototype.cumulative.call(this, t)
        if (this.Di < eps)
            return this.qi * t
        return this.qi / ((1.0 - this.b) * this.Di) *
            (1.0 - Math.pow(1.0 + this.b * this.Di * t, 1.0 - (1.0 / this.b)))
    }

    /* Arps exponential decline with
     *     initial rate qi [vol/time]
     *     nominal decline D [1/time]
     */
    ns.Exponential = function(qi, D)
    {
        this.qi = qi
        this.Di = D
    }

    ns.Exponential.prototype = new Decline()

    ns.Exponential.prototype.rate = function(t)
    {
        if (t < 0.0)
            return 0.0
        return this.qi * Math.exp(-this.Di * t)
    }

    ns.Exponential.prototype.cumulative = function(t)
    {
        if (this.Di < eps)
            return this.qi * t
        return this.qi / this.Di * (1.0 - Math.exp(-this.Di * t))
    }

    /* Arps harmonic decline with
     *     initial rate qi [vol/time]
     *     nominal decline Di [1/time]
     */
    ns.Harmonic = function(qi, Di)
    {
        this.qi = qi
        this.Di = D
    }

    ns.Harmonic.prototype = new Decline()

    ns.Harmonic.prototype.rate = function(t)
    {
        if (t < 0.0)
            return 0.0
        return this.qi / (1.0 + this.Di * t)
    }

    ns.Harmonic.prototype.cumulative = function(t)
    {
        if (this.Di < eps)
            return this.qi * t
        return this.qi / this.Di * Math.log(1.0 + this.Di * t)
    }

    /* Arps "modified hyperbolic" decline with
     *     initial rate qi [vol/time]
     *     initial nominal decline Di [1/time]
     *     hyperbolic exponent b [1]
     *     terminal nominal decline Df [1/time]
     */
    ns.ModHyperbolic = function(qi, Di, b, Df)
    {
        this.qi = qi
        this.Di = Di
        this.b = b
        this.Df = Df
        if (Df <= 0 || Df > Di || Di != Di) {
            this.transition = Infinity
            this.q_transition = 0
            this.terminal = null 
        } else {
            this.transition = (Di / Df - 1.0) / (b * Di)
            this.q_transition = ns.Hyperbolic.prototype.rate.call(this,
                    this.transition)
            this.terminal = new ns.Exponential(this.q_transition, this.Df)
        }
    }

    ns.ModHyperbolic.prototype = new Decline()

    ns.ModHyperbolic.prototype.rate = function(t)
    {
        if (t <= this.transition)
            return ns.Hyperbolic.prototype.rate.call(this, t)
        return this.terminal.rate(t - this.transition)
    }

    ns.ModHyperbolic.prototype.cumulative = function(t)
    {
        if (t <= this.transition)
            return ns.Hyperbolic.prototype.cumulative.call(this, t)
        return this.cumulative(this.transition) +
          this.terminal.cumulative(t - this.transition)
    }

})(window.typecurve = window.typecurve || {})
