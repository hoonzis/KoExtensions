define(function (){
    return function(targetFunction, config, listeners) {
        listeners = listeners || {};
        for (var item in config) {
            (function(item) {
                targetFunction[item] = function (value) {
                    if (value != null) {
                        if (!arguments.length) return config[item];
                        config[item] = value;
                        if (listeners.hasOwnProperty(item)) {
                            listeners[item](value);
                        }
                    }
                    return targetFunction;
                    
                };
            })(item); // for doesn't create a closure, forcing it
        }
    }
});
