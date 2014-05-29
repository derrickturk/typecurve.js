;(function (ns, undefined) {
    'use strict';

    function Machina(globals, events)
    {
        this.state = globals
        this.events = events
    }

    Machina.prototype.dispatch = function(e, args)
    {
        var next = [e, args]
        while (next = this.events[next[0]].call(this, this.state, next[1]));
    }

    ns.Machina = Machina

})(window.machina = window.machina || {})
