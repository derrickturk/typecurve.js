;(function (ns, undefined) {
    'use strict';

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
        return this.qi * Math.pow(1.0 + this.b * this.Di * t, -1.0 / this.b)
    }

    ns.Hyperbolic.prototype.cumulative = function(t)
    {
        return this.qi / ((1 - this.b) * this.Di) *
            (1 - Math.pow(1 + this.b * this.Di * t, 1 - (1 / this.b)))
    }
})(window.typecurve = window.typecurve || {})
