;(function (ns, undefined) {
    'use strict';

    function Machina(globals, events)
    {
        this.state = globals
        this.events = events
    }

    Machina.prototype.dispatch = function(e)
    {
        while (e = events[e](globals))
    }

    ns.Machina = Machina

})(window.machina = window.machina || {})
