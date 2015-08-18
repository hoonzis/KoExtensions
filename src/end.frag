   //The modules for your project will be inlined above
    //this snippet. Ask almond to synchronously require the
    //module value for 'main' here and return it as the
    //value to use for the public API for the built file.
    var extensions = require('KoExtensions/koextensions');
	//this part is the only one using Knockout and probably shall be left out
	//so that the charting and tools can be used in project without knockout
	extensions.registerExtensions();
	return extensions;
}));