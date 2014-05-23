;(function (ns, undefined) {
    'use strict';

    var eps = 1e-3

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

})(window.typecurve = window.typecurve || {})
