
  define("d3",function(){
    return d3;
  })
  var extensions = require('KoExtensions/koextensions');

  //this part is the only one using Knockout and probably shall be left out
	//so that the charting and tools can be used in project without knockout
	extensions.registerExtensions();
	return extensions;
}));
